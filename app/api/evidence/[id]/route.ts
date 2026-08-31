/**
 * PATCH /api/evidence/[id] - อัปเดตรายการหลักฐาน (indicatorCodes, evidenceType, AI fields, PDPA)
 * PRD 6: PATCH/PUT อัปเดตรายการ
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { bigIntIdSchema, parseJsonBody, parseUnknown } from '@/lib/validations/api';

const updateEvidenceSchema = z.object({
  indicatorCodes: z.array(z.string().max(50)).max(50).optional(),
  evidenceType: z.string().max(100).optional(),
  aiSummary: z.string().max(20000).optional(),
  aiKeywords: z.array(z.string().max(200)).max(100).optional(),
  aiQualityCheck: z.record(z.string(), z.unknown()).optional(),
  aiSuggestions: z.string().max(20000).optional(),
  pdpaChecked: z.boolean().optional(),
  pdpaRiskLevel: z.string().max(50).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      select: { schoolId: true },
    });
    if (!evidence) {
      return NextResponse.json({ error: 'ไม่พบหลักฐาน' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), evidence.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขหลักฐานนี้' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody(request, updateEvidenceSchema);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }
    const body = parsedBody.data;

    const updateData: {
      indicatorCodes?: string[];
      evidenceType?: string;
      aiSummary?: string;
      aiKeywords?: string[];
      aiQualityCheck?: object;
      aiSuggestions?: string;
      pdpaChecked?: boolean;
      pdpaRiskLevel?: string;
      updatedBy?: bigint;
    } = {};

    if (body.indicatorCodes !== undefined) updateData.indicatorCodes = body.indicatorCodes;
    if (body.evidenceType !== undefined) updateData.evidenceType = body.evidenceType;
    if (body.aiSummary !== undefined) updateData.aiSummary = body.aiSummary;
    if (body.aiKeywords !== undefined) updateData.aiKeywords = body.aiKeywords;
    if (body.aiQualityCheck !== undefined) updateData.aiQualityCheck = body.aiQualityCheck;
    if (body.aiSuggestions !== undefined) updateData.aiSuggestions = body.aiSuggestions;
    if (body.pdpaChecked !== undefined) updateData.pdpaChecked = body.pdpaChecked;
    if (body.pdpaRiskLevel !== undefined) updateData.pdpaRiskLevel = body.pdpaRiskLevel;

    updateData.updatedBy = BigInt(session.user.id);

    await prisma.evidence.update({
      where: { id: evidenceId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/evidence PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
