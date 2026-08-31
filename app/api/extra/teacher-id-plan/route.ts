import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool, canManageTeacherPaInSchool, isUserInSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { bigIntIdSchema, parseJsonBody, parseSearchParams, thaiYearSchema } from '@/lib/validations/api';

const idPlanQuerySchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  forUserId: bigIntIdSchema.optional(),
});

const idPlanBodySchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  idPlanCode: z.string().max(200).optional().default(''),
  note: z.string().max(5000).optional(),
  forUserId: bigIntIdSchema.optional(),
});


export const runtime = 'nodejs';

function serializeForJson<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return String(obj) as T;
  if (Array.isArray(obj)) return obj.map(serializeForJson) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeForJson(v);
    }
    return out as T;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const query = parseSearchParams(request.url, idPlanQuerySchema);
    if (!query.success) {
      return NextResponse.json({ success: false, error: query.error }, { status: 400 });
    }
    const schoolIdBigInt = query.data.schoolId;
    const year = query.data.academicYear;

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolIdBigInt);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    const forUserIdParam = query.data.forUserId;
    if (forUserIdParam) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolIdBigInt);
      if (canManage) {
        const targetId = forUserIdParam;
        const inSchool = await isUserInSchool(targetId, schoolIdBigInt);
        if (inSchool) userId = targetId;
      }
    }

    const record = await prisma.teacherIdPlan.findUnique({
      where: {
        schoolId_academicYear_userId: { schoolId: schoolIdBigInt, academicYear: year, userId },
      },
    });

    return NextResponse.json({ success: true, data: serializeForJson(record) });
  } catch (e: unknown) {
    console.error('[api/extra/teacher-id-plan] GET error:', e);
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message ?? 'ไม่สามารถโหลดข้อมูลได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, idPlanBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const schoolId = parsed.data.schoolId;
    const year = parsed.data.academicYear;
    const idPlanCode = parsed.data.idPlanCode.trim();
    const note = parsed.data.note?.trim() || null;
    const forUserIdRaw = parsed.data.forUserId;

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    if (forUserIdRaw) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolId);
      if (canManage) {
        const targetId = forUserIdRaw;
        const inSchool = await isUserInSchool(targetId, schoolId);
        if (inSchool) userId = targetId;
      }
    }

    const record = await prisma.teacherIdPlan.upsert({
      where: {
        schoolId_academicYear_userId: { schoolId, academicYear: year, userId },
      },
      create: {
        schoolId,
        userId,
        academicYear: year,
        idPlanCode: idPlanCode || '-',
        note,
      },
      update: {
        idPlanCode: idPlanCode || '-',
        note,
      },
    });

    revalidatePath('/extra-programs/teacher');
    revalidatePath('/extra-programs');
    return NextResponse.json({ success: true, data: serializeForJson(record) });
  } catch (e: unknown) {
    console.error('[api/extra/teacher-id-plan] POST error:', e);
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message ?? 'ไม่สามารถบันทึกได้' },
      { status: 500 }
    );
  }
}
