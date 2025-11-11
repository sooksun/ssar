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

export async function getUserSchools(userIdInput: BigIntInput): Promise<bigint[]> {
  const userId = toBigInt(userIdInput);

  const memberships = await prisma.userSchoolRole.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      schoolId: true,
      role: {
        select: {
          code: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    return user?.schoolId ? [user.schoolId] : [];
  }

  const isAdmin = memberships.some((membership) => membership.role?.code === 'ADMIN');
  if (isAdmin) {
    const schools = await prisma.school.findMany({
      where: {
        del: false,
      },
      select: {
        sc_id: true,
      },
    });
    return schools.map((school) => school.sc_id);
  }

  const schoolIds = new Set<bigint>();
  memberships.forEach((membership) => {
    if (membership.schoolId && !schoolIds.has(membership.schoolId)) {
      schoolIds.add(membership.schoolId);
    }
  });

  return Array.from(schoolIds);
}

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
      OR: [
        { schoolId },
        {
          role: {
            code: 'ADMIN',
          },
        },
      ],
    },
    select: {
      schoolId: true,
      role: {
        select: {
          code: true,
        },
      },
    },
  });

  if (membership) {
    if (membership.role?.code === 'ADMIN') {
      return true;
    }

    if (membership.schoolId === schoolId) {
      return true;
    }
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      schoolId: true,
    },
  });

  return user?.schoolId === schoolId;
}


