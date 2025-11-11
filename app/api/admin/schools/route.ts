import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import {
  createSchoolSchema,
  updateSchoolSchema,
  deleteEntitySchema,
} from '@/lib/validations/admin';
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

  const schools = await prisma.school.findMany({
    where: { del: false },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    data: schools.map((school) => ({
      id: school.id.toString(),
      scId: school.sc_id.toString(),
      name: school.name,
      areaName: school.area_name,
      province: school.province,
      levelType: school.level_type,
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
    return redirectWithMessage(request, '/admin/schools', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createSchoolSchema.parse({
        scId: formData.get('scId'),
        name: formData.get('name'),
        areaName: formData.get('areaName'),
        province: formData.get('province'),
        levelType: formData.get('levelType'),
      });

      const created = await prisma.school.create({
        data: {
          sc_id: data.scId,
          name: data.name,
          area_name: data.areaName,
          province: data.province,
          level_type: data.levelType,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.CREATE_SCHOOL,
        'School',
        created.id,
        created.sc_id,
        {
          scId: created.sc_id.toString(),
          name: created.name,
        }
      );

      revalidatePath('/admin/schools');
      return redirectWithMessage(request, '/admin/schools', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateSchoolSchema.parse({
        id: formData.get('id'),
        scId: formData.get('scId'),
        name: formData.get('name'),
        areaName: formData.get('areaName'),
        province: formData.get('province'),
        levelType: formData.get('levelType'),
      });

      await prisma.school.update({
        where: { id: data.id },
        data: {
          sc_id: data.scId,
          name: data.name,
          area_name: data.areaName,
          province: data.province,
          level_type: data.levelType,
        },
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.UPDATE_SCHOOL,
        'School',
        data.id,
        data.scId,
        {
          scId: data.scId.toString(),
          name: data.name,
        }
      );

      revalidatePath('/admin/schools');
      return redirectWithMessage(request, '/admin/schools', { success: 'updated' });
    }

    if (intent === 'delete') {
      const data = deleteEntitySchema.parse({
        id: formData.get('id'),
      });

      await prisma.school.update({
        where: { id: data.id },
        data: { del: true },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_SCHOOL, 'School', data.id);

      revalidatePath('/admin/schools');
      return redirectWithMessage(request, '/admin/schools', { success: 'deleted' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/admin/schools', { error: message });
  }
}


