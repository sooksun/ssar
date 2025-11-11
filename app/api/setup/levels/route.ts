import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import { createLevelSchema, updateLevelSchema } from '@/lib/validations/setup';
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

  const levels = await prisma.eduLevel.findMany({
    orderBy: { id: 'asc' },
  });

  return NextResponse.json({
    data: levels.map((level) => ({
      id: level.id,
      code: level.code,
      nameTh: level.nameTh,
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
    return redirectWithMessage(request, '/setup/levels', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createLevelSchema.parse({
        code: formData.get('code'),
        nameTh: formData.get('nameTh'),
      });

      const created = await prisma.eduLevel.create({
        data: {
          code: data.code,
          nameTh: data.nameTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.CREATE_LEVEL,
        'EduLevel',
        BigInt(created.id),
        undefined,
        {
          code: created.code,
          nameTh: created.nameTh,
        }
      );

      revalidatePath('/setup/levels');
      return redirectWithMessage(request, '/setup/levels', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateLevelSchema.parse({
        id: formData.get('id'),
        code: formData.get('code'),
        nameTh: formData.get('nameTh'),
      });

      await prisma.eduLevel.update({
        where: { id: Number(data.id) },
        data: {
          code: data.code,
          nameTh: data.nameTh,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.UPDATE_LEVEL,
        'EduLevel',
        BigInt(data.id),
        undefined,
        {
          code: data.code,
          nameTh: data.nameTh,
        }
      );

      revalidatePath('/setup/levels');
      return redirectWithMessage(request, '/setup/levels', { success: 'updated' });
    }

    if (intent === 'delete') {
      const rawId = formData.get('id');
      if (typeof rawId !== 'string') {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }
      const id = Number(rawId);
      await prisma.eduLevel.delete({
        where: { id },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_LEVEL, 'EduLevel', BigInt(id));

      revalidatePath('/setup/levels');
      return redirectWithMessage(request, '/setup/levels', { success: 'deleted' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/setup/levels', { error: message });
  }
}


