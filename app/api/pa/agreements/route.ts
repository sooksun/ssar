import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool, getUserSchools } from '@/lib/auth/scoping';
import { createPAAgreement } from '@/lib/pa-utils';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  bigIntIdSchema,
  dateStringSchema,
  parseJsonBody,
  parseSearchParams,
  thaiYearSchema,
} from '@/lib/validations/api';

const agreementQuerySchema = z.object({
  schoolId: bigIntIdSchema.optional(),
  fiscalYear: thaiYearSchema.optional(),
});

const createAgreementSchema = z.object({
  schoolId: bigIntIdSchema,
  userId: bigIntIdSchema.optional(),
  fiscalYear: thaiYearSchema,
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  positionType: z.enum(['TEACHER', 'PRINCIPAL']).default('PRINCIPAL'),
});

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

    const query = parseSearchParams(request.url, agreementQuerySchema);
    if (!query.success) {
      return NextResponse.json({ error: query.error }, { status: 400 });
    }

    const schoolIds = await getUserSchools(session.user.id);

    const where: { schoolId: bigint | { in: bigint[] }; fiscalYear?: number } = {
      // ค่าเริ่มต้น: จำกัดเฉพาะโรงเรียนที่ user เข้าถึงได้เสมอ
      schoolId: { in: schoolIds },
    };
    if (query.data.schoolId !== undefined) {
      const hasAccess = await canAccessSchool(BigInt(session.user.id), query.data.schoolId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
      }
      where.schoolId = query.data.schoolId;
    }
    if (query.data.fiscalYear !== undefined) {
      where.fiscalYear = query.data.fiscalYear;
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

    const parsed = await parseJsonBody(request, createAgreementSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { schoolId, fiscalYear, positionType } = parsed.data;
    const userId = parsed.data.userId ?? BigInt(session.user.id);

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างข้อตกลงในโรงเรียนนี้' }, { status: 403 });
    }

    const agreement = await createPAAgreement({
      schoolId,
      userId,
      fiscalYear,
      startDate: parsed.data.startDate ?? new Date(),
      endDate: parsed.data.endDate ?? new Date(),
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
