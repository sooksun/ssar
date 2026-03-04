import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { getProjectById } from '@/app/actions/project';
import { BackLink } from '@/components/ui/back-link';
import Link from 'next/link';
import { ProjectFilesSection } from './project-files-section';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const reportFile = project.files?.find((f) => f.fileType === 'PROJECT_REPORT');
  const summaryFile = project.files?.find((f) => f.fileType === 'EXECUTION_SUMMARY');

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/projects" label="ย้อนกลับรายการโครงการ" className="mb-4" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground mt-1">รหัสโครงการ: {project.code}</p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">รายละเอียดการบันทึกโครงการ</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">รหัสโครงการ</dt>
            <dd className="font-medium">{project.code}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">รหัสโรงเรียน / โรงเรียน</dt>
            <dd className="font-medium">{project.schoolName} ({project.schoolId})</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">ปีการศึกษา</dt>
            <dd>{project.academicYear}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">ปีงบประมาณ</dt>
            <dd>{project.fiscalYear}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">รหัสผู้รับผิดชอบโครงการ</dt>
            <dd>{project.responsibleUserName || project.responsibleUserId || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">สอดคล้องกับ นโยบาย สพฐ ข้อใด</dt>
            <dd>{project.obePolicyName || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">สอดคล้องกับ ตัวชี้วัดการประกันคุณภาพ</dt>
            <dd>{project.qaIndicatorName || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">สอดคล้องกับ ตัวชี้วัด PA</dt>
            <dd>{project.paIndicatorName || '-'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">รายละเอียด</dt>
            <dd className="mt-1">{project.description || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">สถานะ</dt>
            <dd>{project.status}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">รายงานโครงการ และสรุปการดำเนินโครงการ</h2>
        <p className="text-sm text-muted-foreground mb-4">
          อัปโหลดไฟล์ PDF (รายงานโครงการ / สรุปการดำเนินโครงการ) พร้อมลายเซ็นอิเล็กทรอนิกส์
        </p>
        <ProjectFilesSection
          projectId={id}
          reportFile={reportFile}
          summaryFile={summaryFile}
        />
      </div>

      <BackLink href="/projects" label="ย้อนกลับรายการโครงการ" className="mt-6" />
    </div>
  );
}
