import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import ProjectForm from './project-form';
import { BackLink } from '@/components/ui/back-link';
import { getUserSchools } from '@/lib/auth/scoping';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user;
  const roles = user.roles ?? [];
  const schoolIds = await getUserSchools(user.id);

  const schoolsRaw = await prisma.school.findMany({
    where: { sc_id: { in: schoolIds }, del: false },
    select: { sc_id: true, name: true },
  });

  if (schoolsRaw.length === 0) {
    redirect('/projects');
  }

  const schools = schoolsRaw.map((s) => ({
    id: s.sc_id.toString(),
    name: s.name,
  }));

  const params = await searchParams;
  const requestedSchoolId = params?.schoolId;
  const defaultSchoolId =
    requestedSchoolId && schools.some((s) => s.id === requestedSchoolId)
      ? requestedSchoolId
      : schools[0].id;

  const currentAcademicYear = thaiAcademicYear();
  const currentFiscalYear = thaiFiscalYear();

  // นโยบาย สพฐ รายปี (ปีงบประมาณปัจจุบัน)
  const policies = await prisma.oBECPolicy.findMany({
    where: { fiscalYear: currentFiscalYear },
    orderBy: { sortNo: 'asc' },
    select: { id: true, code: true, nameTh: true },
  });

  // ตัวชี้วัด QA (สำหรับ dropdown)
  const qaIndicators = await prisma.qAIndicator.findMany({
    orderBy: [{ standardId: 'asc' }, { sortNo: 'asc' }],
    include: { standard: { select: { code: true, nameTh: true } } },
    select: {
      id: true,
      code: true,
      nameTh: true,
      standard: { select: { code: true, nameTh: true } },
    },
  });

  // ตัวชี้วัด PA (ส่วนที่ 1)
  const paAspects = await prisma.pAAspect.findMany({
    where: { part: 'PART1' },
    orderBy: { sortNo: 'asc' },
    include: {
      indicators: { orderBy: { sortNo: 'asc' }, select: { id: true, code: true, nameTh: true } },
    },
  });

  const paIndicatorsFlat = paAspects.flatMap((a) =>
    a.indicators.map((i) => ({
      id: i.id.toString(),
      code: i.code,
      nameTh: i.nameTh,
      aspectCode: a.code,
    }))
  );

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/projects" label="ย้อนกลับรายการโครงการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">เพิ่มโครงการใหม่</h1>
        <p className="text-muted-foreground mt-1">
          บันทึกรายละเอียดโครงการ รายงานโครงการ และสรุปการดำเนินโครงการ (PDF พร้อมลายเซ็นอิเล็กทรอนิกส์)
        </p>
      </div>

      <ProjectForm
        schools={schools}
        policies={policies.map((p) => ({ id: p.id.toString(), code: p.code, nameTh: p.nameTh }))}
        qaIndicators={qaIndicators.map((q) => ({
          id: q.id.toString(),
          code: q.code,
          nameTh: q.nameTh,
          standardCode: q.standard.code,
          standardName: q.standard.nameTh,
        }))}
        paIndicators={paIndicatorsFlat}
        currentAcademicYear={currentAcademicYear}
        currentFiscalYear={currentFiscalYear}
        defaultSchoolId={defaultSchoolId}
      />
      <BackLink href="/projects" label="ย้อนกลับรายการโครงการ" className="mt-6" />
    </div>
  );
}
