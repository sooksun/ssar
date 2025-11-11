import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import { createSubIndicatorSchema, updateSubIndicatorSchema } from '@/lib/validations/setup';
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

  const subs = await prisma.qASubIndicator.findMany({
    include: {
      indicator: {
        include: {
          standard: {
            include: { level: true },
          },
        },
      },
    },
    orderBy: [{ indicator: { standard: { levelId: 'asc' } } }, { indicator: { code: 'asc' } }, { itemNo: 'asc' }],
  });

  return NextResponse.json({
    data: subs.map((item) => ({
      id: item.id.toString(),
      indicatorId: item.indicatorId.toString(),
      indicatorCode: item.indicator.code,
      indicatorName: item.indicator.nameTh,
      standardCode: item.indicator.standard.code,
      levelCode: item.indicator.standard.level.code,
      itemNo: item.itemNo,
      textTh: item.textTh,
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
    return redirectWithMessage(request, '/setup/subs', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createSubIndicatorSchema.parse({
        indicatorId: formData.get('indicatorId'),
        itemNo: formData.get('itemNo'),
        textTh: formData.get('textTh'),
      });

      const created = await prisma.qASubIndicator.create({
        data: {
          indicatorId: data.indicatorId,
          itemNo: data.itemNo,
          textTh: data.textTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.CREATE_SUB_INDICATOR,
        'QASubIndicator',
        created.id,
        undefined,
        {
          indicatorId: data.indicatorId,
          itemNo: data.itemNo,
          textTh: data.textTh,
        }
      );

      revalidatePath('/setup/subs');
      return redirectWithMessage(request, '/setup/subs', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateSubIndicatorSchema.parse({
        id: formData.get('id'),
        indicatorId: formData.get('indicatorId'),
        itemNo: formData.get('itemNo'),
        textTh: formData.get('textTh'),
      });

      await prisma.qASubIndicator.update({
        where: { id: data.id },
        data: {
          indicatorId: data.indicatorId,
          itemNo: data.itemNo,
          textTh: data.textTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.UPDATE_SUB_INDICATOR,
        'QASubIndicator',
        data.id,
        undefined,
        {
          indicatorId: data.indicatorId,
          itemNo: data.itemNo,
          textTh: data.textTh,
        }
      );

      revalidatePath('/setup/subs');
      return redirectWithMessage(request, '/setup/subs', { success: 'updated' });
    }

    if (intent === 'delete') {
      const rawId = formData.get('id');
      if (typeof rawId !== 'string') {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }
      const id = BigInt(rawId);

      await prisma.qASubIndicator.delete({
        where: { id },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_SUB_INDICATOR, 'QASubIndicator', id);

      revalidatePath('/setup/subs');
      return redirectWithMessage(request, '/setup/subs', { success: 'deleted' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/setup/subs', { error: message });
  }
}


