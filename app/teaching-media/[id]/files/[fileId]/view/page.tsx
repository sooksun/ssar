import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { canAccessSchool } from '@/lib/auth/scoping';
import { BackLink } from '@/components/ui/back-link';
import { FileViewer } from './file-viewer';

export default async function TeachingMediaFileViewPage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id, fileId } = await params;
  const tmId = BigInt(id);
  const fileIdBigInt = BigInt(fileId);

  // ดึงข้อมูลไฟล์พร้อมตรวจสอบสิทธิ์
  const file = await prisma.teachingMediaFile.findUnique({
    where: { id: fileIdBigInt },
    include: {
      teachingMedia: {
        include: {
          school: {
            select: {
              sc_id: true,
              name: true,
            },
          },
          indicator: {
            include: {
              standard: {
                include: {
                  level: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!file || file.del || file.teachingMediaId !== tmId) {
    notFound();
  }

  // ตรวจสอบสิทธิ์การเข้าถึง
  const hasAccess = await canAccessSchool(
    BigInt(session.user.id),
    file.teachingMedia.school.sc_id
  );

  if (!hasAccess) {
    redirect('/teaching-media');
  }

  return (
    <div className="container mx-auto p-6">
      <BackLink
        href={`/teaching-media/${id}/files`}
        label="ย้อนกลับรายการไฟล์"
        className="mb-4"
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{file.fileName}</h1>
        <p className="text-muted-foreground mt-1">
          {file.teachingMedia.title} - {file.teachingMedia.school.name}
        </p>
        {file.teachingMedia.indicator && (
          <p className="text-sm text-muted-foreground mt-1">
            {file.teachingMedia.indicator.standard?.level?.nameTh || ''} -{' '}
            {file.teachingMedia.indicator.standard?.nameTh || ''} - {file.teachingMedia.indicator.nameTh || ''}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FileViewer file={file} />
      </div>

      <div className="mt-6">
        <BackLink
          href={`/teaching-media/${id}/files`}
          label="ย้อนกลับรายการไฟล์"
        />
      </div>
    </div>
  );
}

