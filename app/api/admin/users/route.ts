import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth/nextauth';
import {
  createUserSchema,
  updateUserSchema,
  deleteEntitySchema,
  assignUserRoleSchema,
  removeUserRoleSchema,
} from '@/lib/validations/admin';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
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

  const users = await prisma.user.findMany({
    where: { del: false },
    orderBy: { fullName: 'asc' },
    include: {
      primarySchool: true,
      schoolRoles: {
        where: { isActive: true },
        include: {
          school: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: users.map((user) => ({
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      primarySchool: user.primarySchool
        ? {
            scId: user.primarySchool.sc_id.toString(),
            name: user.primarySchool.name,
          }
        : null,
      roles: user.schoolRoles.map((sr) => ({
        id: sr.id.toString(),
        schoolId: sr.schoolId.toString(),
        schoolName: sr.school.name,
        roleCode: sr.role.code,
        roleName: sr.role.name,
      })),
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
    return redirectWithMessage(request, '/admin/users', {
      error: message,
    });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'create';

  try {
    if (intent === 'create') {
      const data = createUserSchema.parse({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        primarySchoolId: formData.get('primarySchoolId'),
        assignedSchoolId: formData.get('assignedSchoolId'),
        roleId: formData.get('roleId'),
      });

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const created = await prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          password: hashedPassword,
          phone: data.phone,
          schoolId: data.primarySchoolId,
        },
      });

      if (data.assignedSchoolId && data.roleId) {
        const existing = await prisma.userSchoolRole.findFirst({
          where: {
            userId: created.id,
            schoolId: data.assignedSchoolId,
            roleId: data.roleId,
          },
        });
        if (existing) {
          if (!existing.isActive) {
            await prisma.userSchoolRole.update({
              where: { id: existing.id },
              data: { isActive: true },
            });
          }
        } else {
          await prisma.userSchoolRole.create({
            data: {
              userId: created.id,
              schoolId: data.assignedSchoolId,
              roleId: data.roleId,
              isActive: true,
            },
          });
        }
      }

      await logAction(session.user.id, AUDIT_ACTIONS.CREATE_USER, 'User', created.id, data.primarySchoolId, {
        email: created.email,
        fullName: created.fullName,
      });

      revalidatePath('/admin/users');
      return redirectWithMessage(request, '/admin/users', { success: 'created' });
    }

    if (intent === 'update') {
      const data = updateUserSchema.parse({
        id: formData.get('id'),
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        primarySchoolId: formData.get('primarySchoolId'),
        newPassword: formData.get('newPassword'),
      });

      const updatePayload: {
        fullName: string;
        phone?: string | null;
        schoolId?: bigint | null;
        password?: string;
      } = {
        fullName: data.fullName,
      };

      updatePayload.phone = data.phone ? data.phone : null;
      updatePayload.schoolId = data.primarySchoolId ? data.primarySchoolId : null;

      if (data.newPassword) {
        updatePayload.password = await bcrypt.hash(data.newPassword, 10);
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updatePayload,
      });

      await logAction(
        session.user.id,
        AUDIT_ACTIONS.UPDATE_USER,
        'User',
        data.id,
        data.primarySchoolId,
        {
          fullName: data.fullName,
          hasPasswordUpdate: Boolean(data.newPassword),
        }
      );

      revalidatePath('/admin/users');
      return redirectWithMessage(request, '/admin/users', { success: 'updated' });
    }

    if (intent === 'delete') {
      const data = deleteEntitySchema.parse({
        id: formData.get('id'),
      });

      await prisma.user.update({
        where: { id: data.id },
        data: { del: true },
      });

      await logAction(session.user.id, AUDIT_ACTIONS.DELETE_USER, 'User', data.id);

      revalidatePath('/admin/users');
      return redirectWithMessage(request, '/admin/users', { success: 'deleted' });
    }

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

      let recordId: bigint | undefined;
      if (existing) {
        if (!existing.isActive) {
          await prisma.userSchoolRole.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
        recordId = existing.id;
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
        session.user.id,
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

      revalidatePath('/admin/users');
      return redirectWithMessage(request, '/admin/users', { success: 'role-assigned' });
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
        session.user.id,
        AUDIT_ACTIONS.REMOVE_USER_ROLE,
        'UserSchoolRole',
        data.userSchoolRoleId
      );

      revalidatePath('/admin/users');
      return redirectWithMessage(request, '/admin/users', { success: 'role-removed' });
    }

    throw new Error('ไม่รองรับคำสั่งนี้');
  } catch (error) {
    let message = 'เกิดข้อผิดพลาด';
    if (error instanceof ZodError) {
      message = error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง';
    } else if (error instanceof Error) {
      message = error.message || message;
    }
    return redirectWithMessage(request, '/admin/users', { error: message });
  }
}


