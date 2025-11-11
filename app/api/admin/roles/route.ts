import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import { createRoleSchema, updateRoleSchema, deleteEntitySchema } from '@/lib/validations/admin';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';

const ADMIN_ONLY = new Set(['ADMIN']);

type AuthSession = Session | null;

function ensureAdmin(session: AuthSession) {
  if (!session?.user) {
    throw new Error('กรุณาเข้าสู่ระบบ');
  }
  const roles = session.user.roles ?? [];
  const hasAdmin = roles.some((role) => ADMIN_ONLY.has(role.role));
  if (!hasAdmin) {
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
  ensureAdmin(session);

  const roles = await prisma.role.findMany({
    orderBy: { code: 'asc' },
  });

  return NextResponse.json({
    data: roles.map((role) => ({
      id: role.id.toString(),
      code: role.code,
      name: role.name,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    ensureAdmin(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่มีสิทธิ์เข้าถึง';
    return redirectWithMessage(request, '/admin/roles', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createRoleSchema.parse({
        code: formData.get('code'),
        name: formData.get('name'),
      });

      const created = await prisma.role.create({
        data: {
          code: data.code.trim(),
          name: data.name.trim(),
        },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.CREATE_ROLE, 'Role', created.id, undefined, {
        code: created.code,
        name: created.name,
      });

      revalidatePath('/admin/roles');
      return redirectWithMessage(request, '/admin/roles', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateRoleSchema.parse({
        id: formData.get('id'),
        code: formData.get('code'),
        name: formData.get('name'),
      });

      await prisma.role.update({
        where: { id: data.id },
        data: {
          code: data.code.trim(),
          name: data.name.trim(),
        },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.UPDATE_ROLE, 'Role', data.id, undefined, {
        code: data.code,
        name: data.name,
      });

      revalidatePath('/admin/roles');
      return redirectWithMessage(request, '/admin/roles', { success: 'updated' });
    }

    if (intent === 'delete') {
      const data = deleteEntitySchema.parse({
        id: formData.get('id'),
      });

      await prisma.role.delete({
        where: { id: data.id },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_ROLE, 'Role', data.id);

      revalidatePath('/admin/roles');
      return redirectWithMessage(request, '/admin/roles', { success: 'deleted' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/admin/roles', { error: message });
  }
}


