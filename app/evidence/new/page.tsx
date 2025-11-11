import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiFiscalYear } from '@/lib/evidence';
import { getIndicatorById } from '@/app/actions/evidence';
import EvidenceForm from './evidence-form';
import { BackLink } from '@/components/ui/back-link';

export default async function NewEvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ indicatorId?: string; schoolId?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];
  const canCreate = roles.some((role) => ['ADMIN', 'QA_LEAD', 'TEACHER'].includes(role.role));
  if (!canCreate) {
    redirect('/evidence');
  }

  // Await searchParams ก่อนใช้งาน (Next.js 15 requirement)
  const params = await searchParams;

  // ดึงโรงเรียนที่ user มีสิทธิ์
  const schoolIds = roles.map((role) => BigInt(role.schoolId));
  const schoolsRaw = await prisma.school.findMany({
    where: {
      sc_id: {
        in: schoolIds,
      },
      del: false,
    },
    select: {
      sc_id: true,
      name: true,
    },
  });
  if (schoolsRaw.length === 0) {
    redirect('/evidence');
  }

  const schools = schoolsRaw.map((school) => ({
    id: school.sc_id.toString(),
    name: school.name,
  }));

  const requestedSchoolId = params?.schoolId;
  const defaultSchoolId = requestedSchoolId && schools.some((s) => s.id === requestedSchoolId)
    ? requestedSchoolId
    : schools[0].id;

  // ดึงระดับการศึกษา
  const levels = await prisma.eduLevel.findMany({
    orderBy: {
      id: 'asc',
    },
  });

  // ปีงบประมาณปัจจุบัน
  const currentFiscalYear = thaiFiscalYear();

  // ดึง indicatorId จาก URL parameter (ถ้ามี)
  const indicatorIdParam = params?.indicatorId || null;
  
  // ดึงข้อมูล indicator ถ้ามี indicatorIdParam
  let indicatorData = null;
  if (indicatorIdParam) {
    const result = await getIndicatorById(indicatorIdParam);
    if (result.success && result.data) {
      indicatorData = result.data;
    }
  }

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/evidence" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">เพิ่มหลักฐานใหม่</h1>
        <p className="text-muted-foreground mt-1">
          สร้างหลักฐานการประกันคุณภาพ
        </p>
      </div>

      <EvidenceForm
        schools={schools}
        levels={levels}
        currentFiscalYear={currentFiscalYear}
        currentUserId={user.id}
        userRoles={roles}
        indicatorIdParam={indicatorIdParam}
        indicatorData={indicatorData}
        defaultSchoolId={defaultSchoolId}
      />
    </div>
  );
}

