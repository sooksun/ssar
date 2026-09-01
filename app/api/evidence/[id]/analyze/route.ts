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
import { getUploadBaseDir, resolveWithinUploadDir } from '@/lib/uploads-path';
import { bigIntIdSchema, parseUnknown } from '@/lib/validations/api';
import {
  analyzeEvidenceFile,
  analyzeEvidenceUrl,
  analyzeEvidenceText,
  FileNotAnalyzableError,
  type AnalysisResult,
  type QAIndicatorsByLevel,
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
    const parsedId = parseUnknown(bigIntIdSchema, id);
    if (!parsedId.success) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const evidenceId = parsedId.data;

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
          ? resolveWithinUploadDir(
              firstFile.externalUrl.replace(/^\/+uploads\/+/, '').split('/'),
              getUploadBaseDir(),
            )
          : null);

      if (filePathForAnalysis) {
        try {
          result = await analyzeEvidenceFile({
            filePath: filePathForAnalysis,
            mimeType: firstFile!.mimeType ?? 'application/octet-stream',
            title: evidence.title,
            description: evidence.description ?? undefined,
          });
        } catch (error) {
          if (error instanceof FileNotAnalyzableError) {
            console.error('[api/evidence/analyze] file analysis rejected:', error);
            return NextResponse.json({ error: error.message }, { status: 422 });
          }
          // ไม่ใช่การปฏิเสธจากด่าน guard (เช่น GEMINI_API_KEY ไม่ถูกต้อง, network/quota, parse
          // response ล้มเหลว) — ปล่อยให้ catch บนสุดของ route จัดการเป็น 500 ตามเดิม
          throw error;
        }
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
        qaIndicatorsByLevel: {
          BASIC: [{ code: evidence.indicator.code, reason: 'ตัวชี้วัดหลักที่ผู้ใช้ระบุ' }],
        },
        qaIndicators: [{ code: evidence.indicator.code, reason: 'ตัวชี้วัดหลักที่ผู้ใช้ระบุ' }],
        paTeacherIndicators: [],
        paPrincipalIndicators: [],
        qualityScore: 0,
        suggestions: ['ตั้งค่า GEMINI_API_KEY เพื่อเปิดใช้งาน AI วิเคราะห์อัตโนมัติ'],
      };
    }

    // รวม indicator codes ทั้งหมด (จากทุกมุมมอง: ปฐมวัย / ขั้นพื้นฐาน / ครูผู้ช่วย)
    const qaCodesFromByLevel: string[] = [];
    if (result.qaIndicatorsByLevel) {
      for (const arr of Object.values(result.qaIndicatorsByLevel)) {
        if (Array.isArray(arr)) qaCodesFromByLevel.push(...arr.map((i) => i.code));
      }
    }
    const allIndicatorCodes = [
      evidence.indicator.code,
      ...qaCodesFromByLevel.map((c) => `QA:${c}`),
      ...(result.qaIndicators || []).map((i) => `QA:${i.code}`),
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

    // ตัวชี้วัดหลัก (indicatorId): ใช้จาก BASIC ก่อน ถ้าไม่มีใช้จากมุมมองอื่น
    const basicFirst = result.qaIndicatorsByLevel?.BASIC?.[0] ?? result.qaIndicators?.[0];
    if (basicFirst) {
      const qaIndicator = await prisma.qAIndicator.findFirst({
        where: {
          code: basicFirst.code,
          standard: { level: { code: 'BASIC' } },
        },
        select: { id: true },
      });
      if (qaIndicator) updateData.indicatorId = qaIndicator.id;
    }
    if (!updateData.indicatorId && result.qaIndicatorsByLevel) {
      const firstArr =
        result.qaIndicatorsByLevel.ASSISTANT_TEACHER?.[0] ??
        result.qaIndicatorsByLevel.EARLY_CHILDHOOD?.[0];
      if (firstArr) {
        const qaIndicator = await prisma.qAIndicator.findFirst({
          where: {
            code: firstArr.code,
            standard: {
              level: {
                code: firstArr === result.qaIndicatorsByLevel.ASSISTANT_TEACHER?.[0]
                  ? 'ASSISTANT_TEACHER'
                  : 'EARLY_CHILDHOOD',
              },
            },
          },
          select: { id: true },
        });
        if (qaIndicator) updateData.indicatorId = qaIndicator.id;
      }
    }

    await prisma.evidence.update({
      where: { id: evidenceId },
      data: updateData,
    });

    // บันทึกการเชื่อมโยงหลักฐานกับตัวชี้วัดหลายมุมมอง (ปฐมวัย / ขั้นพื้นฐาน / ครูผู้ช่วย)
    await saveEvidenceIndicatorMappings(
      evidenceId,
      result.qaIndicatorsByLevel ?? (result.qaIndicators?.length ? { BASIC: result.qaIndicators } : {}),
      BigInt(session.user.id),
    );

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
      qaIndicatorsByLevel: result.qaIndicatorsByLevel,
      qaIndicators: result.qaIndicators,
      paTeacherIndicators: result.paTeacherIndicators,
      paPrincipalIndicators: result.paPrincipalIndicators,
      qualityScore: result.qualityScore,
      suggestions: result.suggestions,
      hasGemini,
    });
  } catch (error) {
    // ข้อความจริงลง log ฝั่งเซิร์ฟเวอร์เท่านั้น — error ที่มาถึงตรงนี้เป็นความผิดพลาดภายใน
    // (คีย์ Gemini ผิด, quota, DB ล้ม) ซึ่งเปิดเผยรายละเอียดให้ client ไม่ได้
    // ส่วนกรณีที่บอกผู้ใช้ได้ถูกดักเป็น 422 ไปก่อนหน้านี้แล้ว
    console.error('[api/evidence/analyze]', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการวิเคราะห์หลักฐาน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 },
    );
  }
}

/**
 * บันทึกการเชื่อมโยงหลักฐานกับตัวชี้วัดหลายมุมมอง (ปฐมวัย / ขั้นพื้นฐาน / ครูผู้ช่วย)
 * หลักฐาน 1 ชิ้นวิเคราะห์แล้วเชื่อมโยงได้กับหลายตัวชี้วัดในแต่ละมุมมอง
 */
async function saveEvidenceIndicatorMappings(
  evidenceId: bigint,
  qaIndicatorsByLevel: QAIndicatorsByLevel,
  _updatedBy: bigint,
) {
  const levelCodes = ['EARLY_CHILDHOOD', 'BASIC', 'ASSISTANT_TEACHER'] as const;

  // รวบรวม code ที่ AI เสนอ แยกตาม level ก่อน แล้วค่อยยิง query เดียวต่อ level
  // (เดิมยิง findFirst + upsert ต่อ code = 2N queries)
  const wanted = levelCodes
    .map((levelCode) => ({
      levelCode,
      items: Array.isArray(qaIndicatorsByLevel[levelCode])
        ? qaIndicatorsByLevel[levelCode]!
        : [],
    }))
    .filter((entry) => entry.items.length > 0);

  const lookups = await Promise.all(
    wanted.map(({ levelCode, items }) =>
      prisma.qAIndicator.findMany({
        where: {
          code: { in: Array.from(new Set(items.map((i) => i.code))) },
          standard: { level: { code: levelCode } },
        },
        select: { id: true, code: true },
      }),
    ),
  );

  // ตัวชี้วัดเดียวกันอาจถูกเสนอซ้ำข้าม level — ยุบให้เหลือรายการเดียวต่อ indicatorId
  const rows = new Map<string, { indicatorId: bigint; reason: string | null }>();
  wanted.forEach(({ items }, index) => {
    const byCode = new Map(lookups[index].map((ind) => [ind.code, ind.id]));
    for (const { code, reason } of items) {
      const indicatorId = byCode.get(code);
      if (!indicatorId) continue;
      rows.set(indicatorId.toString(), {
        indicatorId,
        reason: reason?.slice(0, 500) ?? null,
      });
    }
  });

  // ลบของเดิมแล้วเขียนใหม่ภายใน transaction เดียว — ถ้าพังกลางทางต้อง rollback
  // ไม่ใช่ปล่อยให้ mapping เดิมหายไปเฉย ๆ
  await prisma.$transaction([
    prisma.evidenceIndicatorMapping.deleteMany({ where: { evidenceId, source: 'AI' } }),
    prisma.evidenceIndicatorMapping.createMany({
      data: Array.from(rows.values()).map(({ indicatorId, reason }) => ({
        evidenceId,
        indicatorId,
        reason,
        source: 'AI',
      })),
      skipDuplicates: true,
    }),
  ]);
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
