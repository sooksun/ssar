import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import { createIndicatorSchema, updateIndicatorSchema } from '@/lib/validations/setup';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';

const ALLOWED_ROLES = new Set(['ADMIN', 'QA_LEAD']);

type AuthSession = Session | null;

function ensurePermission(session: AuthSession) {
  if (!session?.user) {
    throw new Error('กรุณาเข้าสู่ระบบ');
  }
  const roles = session.user.roles ?? [];
  const hasRole = roles.some((role) => ALLOWED_ROLES.has(role.role));
  if (!hasRole) {
    throw new Error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
  }
}

function redirectWithMessage(request: Request, pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, request.url);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export async function GET(_request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  ensurePermission(session);

  const indicators = await prisma.qAIndicator.findMany({
    include: { standard: { include: { level: true } } },
    orderBy: [{ standard: { levelId: 'asc' } }, { sortNo: 'asc' }],
  });

  return NextResponse.json({
    data: indicators.map((item) => ({
      id: item.id.toString(),
      standardId: item.standardId.toString(),
      standardCode: item.standard.code,
      standardName: item.standard.nameTh,
      levelCode: item.standard.level.code,
      code: item.code,
      nameTh: item.nameTh,
      descriptionTh: item.descriptionTh,
      sortNo: item.sortNo,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    ensurePermission(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่มีสิทธิ์เข้าถึง';
    return redirectWithMessage(request, '/setup/indicators', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createIndicatorSchema.parse({
        standardId: formData.get('standardId'),
        code: formData.get('code'),
        nameTh: formData.get('nameTh'),
        sortNo: formData.get('sortNo'),
        descriptionTh: formData.get('descriptionTh'),
      });

      const created = await prisma.qAIndicator.create({
        data: {
          standardId: data.standardId,
          code: data.code,
          nameTh: data.nameTh,
          sortNo: data.sortNo ?? 1,
          descriptionTh: data.descriptionTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.CREATE_INDICATOR,
        'QAIndicator',
        created.id,
        undefined,
        {
          standardId: data.standardId,
          code: data.code,
          nameTh: data.nameTh,
          descriptionTh: data.descriptionTh,
          sortNo: data.sortNo ?? 1,
        }
      );

      revalidatePath('/setup/indicators');
      return redirectWithMessage(request, '/setup/indicators', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateIndicatorSchema.parse({
        id: formData.get('id'),
        standardId: formData.get('standardId'),
        code: formData.get('code'),
        nameTh: formData.get('nameTh'),
        sortNo: formData.get('sortNo'),
        descriptionTh: formData.get('descriptionTh'),
      });

      await prisma.qAIndicator.update({
        where: { id: data.id },
        data: {
          standardId: data.standardId,
          code: data.code,
          nameTh: data.nameTh,
          sortNo: data.sortNo ?? 1,
          descriptionTh: data.descriptionTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.UPDATE_INDICATOR,
        'QAIndicator',
        data.id,
        undefined,
        {
          standardId: data.standardId,
          code: data.code,
          nameTh: data.nameTh,
          descriptionTh: data.descriptionTh,
          sortNo: data.sortNo ?? 1,
        }
      );

      revalidatePath('/setup/indicators');
      return redirectWithMessage(request, '/setup/indicators', { success: 'updated' });
    }

    if (intent === 'delete') {
      const rawId = formData.get('id');
      if (typeof rawId !== 'string') {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }
      const id = BigInt(rawId);

      await prisma.qAIndicator.delete({
        where: { id },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_INDICATOR, 'QAIndicator', id);

      revalidatePath('/setup/indicators');
      return redirectWithMessage(request, '/setup/indicators', { success: 'deleted' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/setup/indicators', { error: message });
  }
}


