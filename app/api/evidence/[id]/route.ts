/**
 * PATCH /api/evidence/[id] - อัปเดตรายการหลักฐาน (indicatorCodes, evidenceType, AI fields, PDPA)
 * PRD 6: PATCH/PUT อัปเดตรายการ
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';

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
    const evidenceId = BigInt(id);

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

    const body = await request.json().catch(() => ({}));

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

    if (Array.isArray(body.indicatorCodes)) updateData.indicatorCodes = body.indicatorCodes;
    if (typeof body.evidenceType === 'string') updateData.evidenceType = body.evidenceType;
    if (typeof body.aiSummary === 'string') updateData.aiSummary = body.aiSummary;
    if (Array.isArray(body.aiKeywords)) updateData.aiKeywords = body.aiKeywords;
    if (body.aiQualityCheck && typeof body.aiQualityCheck === 'object')
      updateData.aiQualityCheck = body.aiQualityCheck;
    if (typeof body.aiSuggestions === 'string') updateData.aiSuggestions = body.aiSuggestions;
    if (typeof body.pdpaChecked === 'boolean') updateData.pdpaChecked = body.pdpaChecked;
    if (typeof body.pdpaRiskLevel === 'string') updateData.pdpaRiskLevel = body.pdpaRiskLevel;

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
