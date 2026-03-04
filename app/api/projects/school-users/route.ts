import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';

/**
 * GET /api/projects/school-users?schoolId=
 * รายการผู้ใช้ที่ผูกกับโรงเรียน (สำหรับ dropdown ผู้รับผิดชอบโครงการ)
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const schoolIdParam = searchParams.get('schoolId');
  if (!schoolIdParam) {
    return NextResponse.json({ error: 'กรุณาระบุ schoolId' }, { status: 400 });
  }

  const schoolId = BigInt(schoolIdParam);
  const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
  }

  const members = await prisma.userSchoolRole.findMany({
    where: { schoolId, isActive: true },
    select: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    distinct: ['userId'],
  });

  const users = members.map((m) => ({
    id: m.user.id.toString(),
    fullName: m.user.fullName,
    email: m.user.email ?? '',
  }));

  return NextResponse.json(users);
}
