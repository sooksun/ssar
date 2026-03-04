import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { prisma } from '@/lib/db';
import { assignUserRoleSchema, removeUserRoleSchema } from '@/lib/validations/admin';
import { revalidatePath } from 'next/cache';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';
import type { Session } from 'next-auth';
import { ZodError } from 'zod';

const ADMIN_ONLY = new Set(['ADMIN']);

function ensureAdmin(session: Session | null) {
  if (!session?.user) throw new Error('กรุณาเข้าสู่ระบบ');
  const roles = session.user.roles ?? [];
  if (!roles.some((r) => ADMIN_ONLY.has(r.role))) throw new Error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
}

function redirectToSchoolRoles(request: Request, params: Record<string, string>) {
  const url = new URL('/admin/school-roles', request.url);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const session = await auth();
  try {
    ensureAdmin(session);
  } catch (e) {
    return redirectToSchoolRoles(request, {
      error: e instanceof Error ? e.message : 'ไม่มีสิทธิ์เข้าถึง',
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || '';

  try {
    if (intent === 'assign-role') {
      const data = assignUserRoleSchema.parse({
        userId: formData.get('userId'),
        schoolId: formData.get('schoolId'),
        roleId: formData.get('roleId'),
      });

      const existing = await prisma.userSchoolRole.findFirst({
        where: {
          userId: data.userId,
          schoolId: data.schoolId,
          roleId: data.roleId,
        },
      });

      let recordId: bigint;
      if (existing) {
        recordId = existing.id;
        if (!existing.isActive) {
          await prisma.userSchoolRole.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
      } else {
        const created = await prisma.userSchoolRole.create({
          data: {
            userId: data.userId,
            schoolId: data.schoolId,
            roleId: data.roleId,
            isActive: true,
          },
        });
        recordId = created.id;
      }

      await logAction(
        session!.user!.id,
        AUDIT_ACTIONS.ASSIGN_USER_ROLE,
        'UserSchoolRole',
        recordId,
        data.schoolId,
        {
          userId: data.userId.toString(),
          schoolId: data.schoolId.toString(),
          roleId: data.roleId.toString(),
        }
      );

      revalidatePath('/admin/school-roles');
      revalidatePath('/admin/users');
      return redirectToSchoolRoles(request, { success: 'role-assigned' });
    }

    if (intent === 'remove-role') {
      const data = removeUserRoleSchema.parse({
        userSchoolRoleId: formData.get('userSchoolRoleId'),
      });

      await prisma.userSchoolRole.update({
        where: { id: data.userSchoolRoleId },
        data: { isActive: false },
      });

      await logAction(
        session!.user!.id,
        AUDIT_ACTIONS.REMOVE_USER_ROLE,
        'UserSchoolRole',
        data.userSchoolRoleId
      );

      revalidatePath('/admin/school-roles');
      revalidatePath('/admin/users');
      return redirectToSchoolRoles(request, { success: 'role-removed' });
    }

    return redirectToSchoolRoles(request, { error: 'ไม่รองรับคำสั่งนี้' });
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.errors?.[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'
        : err instanceof Error
          ? err.message
          : 'เกิดข้อผิดพลาด';
    return redirectToSchoolRoles(request, { error: message });
  }
}
