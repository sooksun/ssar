/**
 * POST /api/evidence/[id]/analyze
 * PQA องค์ประกอบที่ ๒ (ตัวชี้วัดและความเชื่อมโยง): วิเคราะห์หลักฐานด้วย AI
 * — อัปเดตตัวชี้วัด QA (indicatorId / indicatorCodes) และแนะนำตัวชี้วัด PA
 * — ถ้ามีข้อตกลง PA ของผู้ใช้ จะ auto-link หลักฐานกับ PAAgreementItem ที่ตรง (หลักฐานหนึ่งชิ้นรองรับได้ทั้ง QA และ PA)
 * @see docs/PQA_FRAMEWORK.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import path from 'path';
import {
  analyzeEvidenceFile,
  analyzeEvidenceUrl,
  analyzeEvidenceText,
  type AnalysisResult,
} from '@/lib/ai/gemini';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const evidenceId = BigInt(id);

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        indicator: { select: { code: true, nameTh: true } },
        files: { where: { del: false }, take: 5 },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'ไม่พบหลักฐาน' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), evidence.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
    }

    const hasGemini = !!process.env.GEMINI_API_KEY;

    let result: AnalysisResult;

    if (hasGemini) {
      const firstFile = evidence.files[0];

      const filePathForAnalysis =
        firstFile?.storagePath ||
        (firstFile?.externalUrl?.startsWith('/uploads/')
          ? path.join(process.cwd(), 'public', firstFile.externalUrl)
          : null);

      if (filePathForAnalysis) {
        result = await analyzeEvidenceFile({
          filePath: filePathForAnalysis,
          mimeType: firstFile!.mimeType ?? 'application/octet-stream',
          title: evidence.title,
          description: evidence.description ?? undefined,
        });
      } else if (firstFile?.externalUrl) {
        result = await analyzeEvidenceUrl({
          url: firstFile.externalUrl,
          title: evidence.title,
          description: evidence.description ?? undefined,
        });
      } else {
        result = await analyzeEvidenceText({
          title: evidence.title,
          description: evidence.description ?? undefined,
        });
      }
    } else {
      // Fallback: สร้างผลลัพธ์จาก metadata เมื่อไม่มี API key
      const fileName = evidence.files[0]?.fileName ?? evidence.title;
      const fileType = evidence.files[0]?.mimeType ?? '';
      result = {
        summary: `หลักฐาน: ${evidence.title}. ประเภทไฟล์: ${fileType || 'ไม่ระบุ'}. ตัวชี้วัดหลัก: ${evidence.indicator.code} - ${evidence.indicator.nameTh}.`,
        keywords: [evidence.indicator.code, fileName.slice(0, 30)],
        qaIndicators: [{ code: evidence.indicator.code, reason: 'ตัวชี้วัดหลักที่ผู้ใช้ระบุ' }],
        paTeacherIndicators: [],
        paPrincipalIndicators: [],
        qualityScore: 0,
        suggestions: ['ตั้งค่า GEMINI_API_KEY เพื่อเปิดใช้งาน AI วิเคราะห์อัตโนมัติ'],
      };
    }

    // รวม indicator codes ทั้งหมด
    const allIndicatorCodes = [
      evidence.indicator.code,
      ...result.qaIndicators.map((i) => `QA:${i.code}`),
      ...result.paTeacherIndicators.map((i) => i.code),
      ...result.paPrincipalIndicators.map((i) => i.code),
    ];

    // จำกัดความยาวก่อนบันทึก (ป้องกันเกินขนาดคอลัมน์)
    const MAX_SUMMARY_LEN = 60_000;
    const MAX_SUGGESTIONS_LEN = 60_000;
    const truncatedSummary =
      result.summary.length > MAX_SUMMARY_LEN
        ? result.summary.slice(0, MAX_SUMMARY_LEN) + '…'
        : result.summary;
    const suggestionsStr =
      result.suggestions.length > 0 ? result.suggestions.join('\n') : undefined;
    const truncatedSuggestions =
      suggestionsStr && suggestionsStr.length > MAX_SUGGESTIONS_LEN
        ? suggestionsStr.slice(0, MAX_SUGGESTIONS_LEN) + '…'
        : suggestionsStr;

    const updateData: {
      aiSummary: string;
      aiKeywords: string[];
      indicatorCodes: string[];
      aiQualityCheck?: string;
      aiSuggestions?: string;
      indicatorId?: bigint;
      updatedBy: bigint;
    } = {
      aiSummary: truncatedSummary,
      aiKeywords: result.keywords,
      indicatorCodes: [...new Set(allIndicatorCodes)],
      aiQualityCheck: result.qualityScore > 0 ? `${result.qualityScore}/5` : undefined,
      aiSuggestions: truncatedSuggestions,
      updatedBy: BigInt(session.user.id),
    };

    if (result.qaIndicators.length > 0) {
      const firstQACode = result.qaIndicators[0].code;
      const qaIndicator = await prisma.qAIndicator.findFirst({
        where: {
          code: firstQACode,
          standard: { level: { code: 'BASIC' } },
        },
        select: { id: true },
      });
      if (qaIndicator) updateData.indicatorId = qaIndicator.id;
    }

    await prisma.evidence.update({
      where: { id: evidenceId },
      data: updateData,
    });

    // PQA: หลักฐานหนึ่งชิ้นรองรับได้ทั้ง QA และ PA — auto-link กับรายการ PA ที่ AI แนะนำ (ถ้ามีข้อตกลงอยู่แล้ว)
    if (
      hasGemini &&
      evidence.ownerUserId != null &&
      (result.paTeacherIndicators.length > 0 || result.paPrincipalIndicators.length > 0)
    ) {
      await autoLinkPAEvidence(
        {
          id: evidence.id,
          schoolId: evidence.schoolId,
          fiscalYear: evidence.fiscalYear,
          userId: evidence.ownerUserId,
        },
        result,
      );
    }

    return NextResponse.json({
      success: true,
      aiSummary: result.summary,
      aiKeywords: result.keywords,
      qaIndicators: result.qaIndicators,
      paTeacherIndicators: result.paTeacherIndicators,
      paPrincipalIndicators: result.paPrincipalIndicators,
      qualityScore: result.qualityScore,
      suggestions: result.suggestions,
      hasGemini,
    });
  } catch (error) {
    console.error('[api/evidence/analyze]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 },
    );
  }
}

/**
 * PQA: สร้าง PAEvidenceMapping สำหรับตัวชี้วัด PA ที่ AI แนะนำ
 * (ถ้ามีข้อตกลง PA อยู่แล้วของ user ในปีงบประมาณเดียวกัน)
 * ทำให้หลักฐานชิ้นนี้ใช้ประกอบการประเมิน PA ได้โดยไม่ต้องสร้างหลักฐานซ้ำ
 */
async function autoLinkPAEvidence(
  evidence: { id: bigint; schoolId: bigint; fiscalYear: number; userId: bigint },
  result: AnalysisResult,
) {
  try {
    const agreements = await prisma.pAAgreement.findMany({
      where: {
        schoolId: evidence.schoolId,
        fiscalYear: evidence.fiscalYear,
        userId: evidence.userId,
      },
      include: {
        items: {
          include: {
            indicator: { include: { aspect: true } },
          },
        },
      },
    });

    for (const agreement of agreements) {
      const indicatorCodes =
        agreement.positionType === 'TEACHER'
          ? result.paTeacherIndicators
          : result.paPrincipalIndicators;

      for (const suggestedInd of indicatorCodes) {
        const matchingItem = agreement.items.find((item) => {
          const fullCode = `${item.indicator.aspect.code}.${item.indicator.code}`;
          return suggestedInd.code === fullCode;
        });

        if (matchingItem) {
          const existing = await prisma.pAEvidenceMapping.findFirst({
            where: {
              evidenceId: evidence.id,
              agreementItemId: matchingItem.id,
            },
          });

          if (!existing) {
            await prisma.pAEvidenceMapping.create({
              data: {
                evidenceId: evidence.id,
                agreementItemId: matchingItem.id,
                indicatorId: matchingItem.indicatorId,
                note: suggestedInd.reason,
                relevanceLevel: 3,
                createdBy: evidence.userId,
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[autoLinkPAEvidence]', err);
  }
}
