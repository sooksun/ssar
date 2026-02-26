import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';

/**
 * GET /api/pa/agreements/[id]
 * ดึงข้อตกลง PA รายการเดียวพร้อมรายการตัวชี้วัดและหลักฐานที่เชื่อม
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const agreementId = BigInt(id);

    const agreement = await prisma.pAAgreement.findUnique({
      where: { id: agreementId },
      include: {
        school: { select: { sc_id: true, name: true } },
        items: {
          orderBy: [{ indicator: { aspectId: 'asc' } }, { indicator: { sortNo: 'asc' } }],
          include: {
            indicator: {
              include: {
                aspect: { select: { code: true, nameTh: true } },
                scales: { orderBy: { score: 'asc' } },
              },
            },
            evidenceLinks: {
              include: {
                evidence: {
                  select: {
                    id: true,
                    title: true,
                    evidenceCode: true,
                    status: true,
                    files: { where: { del: false }, take: 1 },
                  },
                },
              },
            },
          },
        },
        challenge: {
          include: {
            considerations: {
              include: {
                consideration: true,
              },
            },
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'ไม่พบข้อตกลง' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), agreement.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    return NextResponse.json(agreement);
  } catch (error) {
    console.error('[api/pa/agreements/[id]]', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อตกลง' },
      { status: 500 }
    );
  }
}
