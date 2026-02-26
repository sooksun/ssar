import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { mapEvidenceToPA, unmapEvidenceFromPA } from '@/lib/pa-utils';
import { prisma } from '@/lib/db';

/**
 * POST /api/pa/evidence-mapping
 * PQA: เชื่อมหลักฐาน (Evidence) กับรายการ PA — หลักฐานหนึ่งชิ้นใช้ได้ทั้ง QA และ PA
 * Body: { evidenceId, agreementItemId?, challengeConsiderationId?, note?, relevanceLevel? }
 * @see docs/PQA_FRAMEWORK.md
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const evidenceId = BigInt(body.evidenceId);
    const agreementItemId = body.agreementItemId ? BigInt(body.agreementItemId) : undefined;
    const challengeConsiderationId = body.challengeConsiderationId
      ? BigInt(body.challengeConsiderationId)
      : undefined;
    const note = body.note as string | undefined;
    const relevanceLevel = body.relevanceLevel as 1 | 2 | 3 | 4 | undefined;

    if (!agreementItemId && !challengeConsiderationId) {
      return NextResponse.json(
        { error: 'ต้องระบุ agreementItemId หรือ challengeConsiderationId' },
        { status: 400 }
      );
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { schoolId: true },
    });
    if (!evidence) {
      return NextResponse.json({ error: 'ไม่พบหลักฐาน' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), evidence.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เชื่อมหลักฐานนี้' }, { status: 403 });
    }

    const mapping = await mapEvidenceToPA({
      evidenceId,
      agreementItemId,
      challengeConsiderationId,
      note,
      relevanceLevel,
      createdBy: BigInt(session.user.id),
    });

    return NextResponse.json({
      success: true,
      id: mapping.id.toString(),
    });
  } catch (error) {
    console.error('[api/pa/evidence-mapping POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pa/evidence-mapping
 * ยกเลิกการเชื่อมหลักฐานกับรายการ PA (หลักฐานยังใช้กับ QA ได้ตาม indicatorId/indicatorCodes)
 * Body: { mappingId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const mappingId = body.mappingId ? BigInt(body.mappingId) : null;
    if (!mappingId) {
      return NextResponse.json({ error: 'ต้องระบุ mappingId' }, { status: 400 });
    }

    const mapping = await prisma.pAEvidenceMapping.findUnique({
      where: { id: mappingId },
      include: { evidence: { select: { schoolId: true } } },
    });
    if (!mapping) {
      return NextResponse.json({ error: 'ไม่พบการเชื่อมโยง' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), mapping.evidence.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ยกเลิกการเชื่อมนี้' }, { status: 403 });
    }

    await unmapEvidenceFromPA(mappingId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/pa/evidence-mapping DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
