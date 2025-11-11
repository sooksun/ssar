import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { getPrimaryFiles } from '@/lib/queries/files';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const schoolParam = url.searchParams.get('schoolId');
  const fiscalYearParam = url.searchParams.get('fiscalYear');

  const roles = session.user.roles ?? [];
  const accessibleSchoolIds = new Set<string>(roles.map((role) => role.schoolId));

  let targetSchools: bigint[];
  if (schoolParam) {
    if (!accessibleSchoolIds.has(schoolParam)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    try {
      targetSchools = [BigInt(schoolParam)];
    } catch {
      return NextResponse.json({ error: 'invalid schoolId' }, { status: 400 });
    }
  } else {
    targetSchools = Array.from(accessibleSchoolIds).map((id) => BigInt(id));
  }

  let fiscalYear: number | undefined;
  if (fiscalYearParam) {
    const parsed = Number(fiscalYearParam);
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: 'invalid fiscalYear' }, { status: 400 });
    }
    fiscalYear = parsed;
  }

  const data = await getPrimaryFiles({ schoolIds: targetSchools, fiscalYear });

  return NextResponse.json({
    data: data.map((item) => ({
      ...item,
      uploadedAt: item.uploadedAt.toISOString(),
    })),
  });
}


