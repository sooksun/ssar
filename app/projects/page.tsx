import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { getProjectList } from '@/app/actions/project';
import { thaiAcademicYear } from '@/lib/evidence';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; academicYear?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const currentAcademicYear = thaiAcademicYear();
  const selectedAcademicYear = params?.academicYear
    ? parseInt(params.academicYear, 10)
    : currentAcademicYear;

  const result = await getProjectList({
    schoolId: params?.schoolId,
    academicYear: selectedAcademicYear,
    status: params?.status,
  });

  if (!result.success) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  const projects = result.data ?? [];

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/extra-programs" label="ย้อนกลับโปรแกรมเสริม" className="mb-4" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">บันทึกโครงการ</h1>
          <p className="text-muted-foreground mt-1">
            รายงานโครงการ สรุปการดำเนินโครงการ (PDF + ลายเซ็นอิเล็กทรอนิกส์) อ้างอิงนโยบาย สพฐ และตัวชี้วัด QA・PA
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          เพิ่มโครงการ
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 text-sm text-muted-foreground">
          พบทั้งหมด {projects.length} รายการ (ปีการศึกษา {selectedAcademicYear})
        </div>

        {projects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>ยังไม่มีข้อมูลโครงการ</p>
            <Link href="/projects/new" className="mt-4 text-primary hover:underline">
              เพิ่มโครงการใหม่
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded-lg border p-4 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.description || 'ไม่มีรายละเอียด'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>รหัส: {p.code}</span>
                      <span>โรงเรียน: {p.schoolName}</span>
                      <span>ปีการศึกษา: {p.academicYear}</span>
                      <span>ปีงบประมาณ: {p.fiscalYear}</span>
                      {p.responsibleUserName && <span>ผู้รับผิดชอบ: {p.responsibleUserName}</span>}
                      <span>สถานะ: {p.status}</span>
                    </div>
                  </div>
                  {p.files && p.files.length > 0 && (
                    <div className="ml-4 text-sm text-muted-foreground">
                      ไฟล์ {p.files.length} รายการ
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BackLink href="/extra-programs" label="ย้อนกลับโปรแกรมเสริม" className="mt-6" />
    </div>
  );
}
