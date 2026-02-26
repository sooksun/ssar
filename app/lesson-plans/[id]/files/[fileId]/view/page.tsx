import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { canAccessSchool } from '@/lib/auth/scoping';
import { BackLink } from '@/components/ui/back-link';
import { FileViewer } from './file-viewer';

export default async function LessonPlanFileViewPage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id, fileId } = await params;
  const lpId = BigInt(id);
  const fileIdBigInt = BigInt(fileId);

  // ดึงข้อมูลไฟล์พร้อมตรวจสอบสิทธิ์
  const file = await prisma.lessonPlanFile.findUnique({
    where: { id: fileIdBigInt },
    include: {
      lessonPlan: {
        include: {
          school: {
            select: {
              sc_id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!file || file.del || file.lessonPlanId !== lpId) {
    notFound();
  }

  // ตรวจสอบสิทธิ์การเข้าถึง
  const hasAccess = await canAccessSchool(
    BigInt(session.user.id),
    file.lessonPlan.school.sc_id
  );

  if (!hasAccess) {
    redirect('/lesson-plans');
  }

  return (
    <div className="container mx-auto p-6">
      <BackLink
        href={`/lesson-plans/${id}/files`}
        label="ย้อนกลับรายการไฟล์"
        className="mb-4"
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{file.fileName}</h1>
        <p className="text-muted-foreground mt-1">
          {file.lessonPlan.title} - {file.lessonPlan.school.name}
        </p>
        {file.description && (
          <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FileViewer file={file} />
      </div>

      <div className="mt-6">
        <BackLink
          href={`/lesson-plans/${id}/files`}
          label="ย้อนกลับรายการไฟล์"
        />
      </div>
    </div>
  );
}

