import { prisma } from '@/lib/db';

type BigIntInput = bigint | number | string;

function toBigInt(value: BigIntInput): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(value);
  }
  return BigInt(value);
}

/**
 * รายการ schoolId (sc_id) ที่ user มีสิทธิ์เข้าถึง:
 * - ADMIN: ทุกโรงเรียน
 * - AREA_HEAD_OFFICE / AREA_ADMIN: ทุกโรงเรียนในเขตพื้นที่ที่ผูกไว้
 * - TEACHER / SCHOOL_DIRECTOR / SCHOOL_ADMIN / QA_LEAD / ASSESSOR: ตาม UserSchoolRole
 */
export async function getUserSchools(userIdInput: BigIntInput): Promise<bigint[]> {
  const userId = toBigInt(userIdInput);

  const [memberships, areaRoles] = await Promise.all([
    prisma.userSchoolRole.findMany({
      where: { userId, isActive: true },
      select: { schoolId: true, role: { select: { code: true } } },
    }),
    prisma.userAreaRole.findMany({
      where: { userId, isActive: true },
      select: { areaId: true, role: { select: { code: true } } },
    }),
  ]);

  const isAdmin = memberships.some((m) => m.role?.code === 'ADMIN');
  if (isAdmin) {
    const schools = await prisma.school.findMany({
      where: { del: false },
      select: { sc_id: true },
    });
    return schools.map((s) => s.sc_id);
  }

  const schoolIds = new Set<bigint>();
  for (const m of memberships) {
    if (m.schoolId) schoolIds.add(m.schoolId);
  }

  if (areaRoles.length > 0) {
    const areaIds = areaRoles.map((r) => r.areaId);
    const schoolsInAreas = await prisma.school.findMany({
      where: { areaId: { in: areaIds }, del: false },
      select: { sc_id: true },
    });
    schoolsInAreas.forEach((s) => schoolIds.add(s.sc_id));
  }

  if (schoolIds.size === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    if (user?.schoolId) schoolIds.add(user.schoolId);
  }

  return Array.from(schoolIds);
}

/**
 * ตรวจสอบว่า user เข้าถึงโรงเรียนได้หรือไม่:
 * - ADMIN หรือ school อยู่ในเขตที่ user เป็น AREA_HEAD_OFFICE/AREA_ADMIN หรือมี UserSchoolRole ที่ school นี้
 */
export async function canAccessSchool(
  userIdInput: BigIntInput,
  schoolIdInput: BigIntInput
): Promise<boolean> {
  const userId = toBigInt(userIdInput);
  const schoolId = toBigInt(schoolIdInput);

  const membership = await prisma.userSchoolRole.findFirst({
    where: {
      userId,
      isActive: true,
      OR: [{ schoolId }, { role: { code: 'ADMIN' } }],
    },
    select: { schoolId: true, role: { select: { code: true } } },
  });

  if (membership) {
    if (membership.role?.code === 'ADMIN') return true;
    if (membership.schoolId === schoolId) return true;
  }

  const school = await prisma.school.findUnique({
    where: { sc_id: schoolId },
    select: { areaId: true },
  });
  if (school?.areaId) {
    const areaRole = await prisma.userAreaRole.findFirst({
      where: { userId, areaId: school.areaId, isActive: true },
    });
    if (areaRole) return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });
  return user?.schoolId === schoolId;
}

/**
 * ตรวจสอบว่า user สามารถจัดการ PA 1/ส, 2/ส, 3/ส ของครูคนอื่นในโรงเรียนนี้ได้หรือไม่
 * (ผู้ดูแลระบบ / ผู้อำนวยการ / ผู้ดูแลโรงเรียน)
 */
export async function canManageTeacherPaInSchool(
  userIdInput: BigIntInput,
  schoolIdInput: BigIntInput
): Promise<boolean> {
  const userId = toBigInt(userIdInput);
  const schoolId = toBigInt(schoolIdInput);

  const memberships = await prisma.userSchoolRole.findMany({
    where: { userId, isActive: true },
    select: { schoolId: true, role: { select: { code: true } } },
  });

  for (const m of memberships) {
    if (m.role?.code === 'ADMIN') return true;
    if (
      m.schoolId === schoolId &&
      ['SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'].includes(m.role?.code ?? '')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * ตรวจสอบว่า targetUserId เป็นผู้ใช้ในโรงเรียน schoolId หรือไม่ (มี UserSchoolRole ที่โรงเรียนนี้)
 */
export async function isUserInSchool(
  targetUserIdInput: BigIntInput,
  schoolIdInput: BigIntInput
): Promise<boolean> {
  const targetUserId = toBigInt(targetUserIdInput);
  const schoolId = toBigInt(schoolIdInput);
  const role = await prisma.userSchoolRole.findFirst({
    where: { userId: targetUserId, schoolId, isActive: true },
  });
  return !!role;
}


