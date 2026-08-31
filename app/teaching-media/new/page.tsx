import { auth } from '@/lib/auth/nextauth';
import { getUserSchools } from '@/lib/auth/scoping';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import TeachingMediaForm from './teaching-media-form';
import { BackLink } from '@/components/ui/back-link';

export default async function NewTeachingMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ indicatorId?: string; schoolId?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  // ดึงโรงเรียนที่ user มีสิทธิ์ (รวมสิทธิ์ระดับเขต)
  const schoolIds = await getUserSchools(user.id);
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
    redirect('/teaching-media');
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

  // ดึงตัวชี้วัด 2.6 สำหรับระดับพื้นฐาน
  const basicLevel = await prisma.eduLevel.findFirst({
    where: { code: 'BASIC' },
  });

  if (!basicLevel) {
    redirect('/teaching-media');
  }

  // ดึงตัวชี้วัด 2.6
  const indicator26 = await prisma.qAIndicator.findFirst({
    where: {
      code: '2.6',
      standard: {
        levelId: basicLevel.id,
      },
    },
    include: {
      standard: {
        include: {
          level: true,
        },
      },
    },
  });

  if (!indicator26) {
    redirect('/teaching-media');
  }

  // ปีการศึกษาและปีงบประมาณปัจจุบัน
  const currentAcademicYear = thaiAcademicYear();
  const currentFiscalYear = thaiFiscalYear();

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/teaching-media" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">เพิ่มสื่อการสอนใหม่</h1>
        <p className="text-muted-foreground mt-1">
          บันทึกสื่อการสอนสำหรับข้อ 2.6 - การใช้สื่อ อุปกรณ์ และระบบเทคโนโลยี
        </p>
      </div>

      <TeachingMediaForm
        schools={schools}
        currentAcademicYear={currentAcademicYear}
        currentFiscalYear={currentFiscalYear}
        currentUserId={user.id}
        defaultSchoolId={defaultSchoolId}
        indicatorId={indicator26.id.toString()}
        indicatorCode={indicator26.code}
        indicatorName={indicator26.nameTh}
      />
      <BackLink href="/teaching-media" label="ย้อนกลับรายการ" className="mt-6" />
    </div>
  );
}

