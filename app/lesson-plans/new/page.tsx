import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import LessonPlanForm from './lesson-plan-form';
import { BackLink } from '@/components/ui/back-link';

export default async function NewLessonPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

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
    redirect('/lesson-plans');
  }

  const schools = schoolsRaw.map((school) => ({
    id: school.sc_id.toString(),
    name: school.name,
  }));

  const params = await searchParams;
  const requestedSchoolId = params?.schoolId;
  const defaultSchoolId =
    requestedSchoolId && schools.some((s) => s.id === requestedSchoolId)
      ? requestedSchoolId
      : schools[0].id;

  // ปีการศึกษาและปีงบประมาณปัจจุบัน
  const currentAcademicYear = thaiAcademicYear();
  const currentFiscalYear = thaiFiscalYear();

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/lesson-plans" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">เพิ่มแผนการสอนใหม่</h1>
        <p className="text-muted-foreground mt-1">
          บันทึกแผนการสอนและบันทึกหลังแผนของครู
        </p>
      </div>

      <LessonPlanForm
        schools={schools}
        currentAcademicYear={currentAcademicYear}
        currentFiscalYear={currentFiscalYear}
        currentUserId={user.id}
        defaultSchoolId={defaultSchoolId}
      />
      <BackLink href="/lesson-plans" label="ย้อนกลับรายการ" className="mt-6" />
    </div>
  );
}

