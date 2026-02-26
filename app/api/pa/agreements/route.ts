import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { createPAAgreement } from '@/lib/pa-utils';
import { prisma } from '@/lib/db';

/**
 * GET /api/pa/agreements?schoolId=...&fiscalYear=...
 * ดึงรายการข้อตกลง PA ตามโรงเรียนและปีงบประมาณ
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const fiscalYearParam = searchParams.get('fiscalYear');

    const schoolIds = await import('@/lib/auth/scoping').then((m) =>
      m.getUserSchools(session.user.id)
    );

    const where: { schoolId?: bigint | { in: bigint[] }; fiscalYear?: number } = {};
    if (schoolIdParam) {
      const sid = BigInt(schoolIdParam);
      const hasAccess = await canAccessSchool(BigInt(session.user.id), sid);
      if (!hasAccess) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
      }
      where.schoolId = sid;
    } else if (schoolIds.length > 0) {
      where.schoolId = { in: schoolIds };
    }
    if (fiscalYearParam) {
      where.fiscalYear = parseInt(fiscalYearParam, 10);
    }

    const agreements = await prisma.pAAgreement.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { updatedAt: 'desc' }],
      include: {
        school: { select: { sc_id: true, name: true } },
        items: {
          include: {
            indicator: { select: { id: true, code: true, nameTh: true } },
          },
        },
        challenge: true,
      },
    });

    return NextResponse.json(agreements);
  } catch (error) {
    console.error('[api/pa/agreements GET]', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อตกลง' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pa/agreements
 * Body: { schoolId: string, userId: string, fiscalYear: number, startDate: string, endDate: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const schoolId = BigInt(body.schoolId);
    const userId = BigInt(body.userId ?? session.user.id);
    const fiscalYear = Number(body.fiscalYear);
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : new Date();

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างข้อตกลงในโรงเรียนนี้' }, { status: 403 });
    }

    const positionType = body.positionType === 'TEACHER' ? 'TEACHER' as const : 'PRINCIPAL' as const;

    const agreement = await createPAAgreement({
      schoolId,
      userId,
      fiscalYear,
      startDate,
      endDate,
      positionType,
      createdBy: BigInt(session.user.id),
    });

    return NextResponse.json({
      success: true,
      id: agreement.id.toString(),
      fiscalYear: agreement.fiscalYear,
    });
  } catch (error: unknown) {
    console.error('[api/pa/agreements POST]', error);
    const prismaError = error as { code?: string };
    if (prismaError?.code === 'P2002') {
      return NextResponse.json(
        {
          error:
            'มีข้อตกลง PA สำหรับปีงบประมาณนี้และตำแหน่งนี้อยู่แล้ว (หนึ่งคนต่อปีต่อตำแหน่งได้เพียงหนึ่งข้อตกลง)',
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างข้อตกลง' },
      { status: 500 }
    );
  }
}
