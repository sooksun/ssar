import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { canAccessSchool } from '@/lib/auth/scoping';
import { BackLink } from '@/components/ui/back-link';
import { FileViewer } from './file-viewer';

export default async function EvidenceFileViewPage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id, fileId } = await params;
  const evId = BigInt(id);
  const fileIdBigInt = BigInt(fileId);

  // ดึงข้อมูลไฟล์พร้อมตรวจสอบสิทธิ์
  const file = await prisma.evidenceFile.findUnique({
    where: { id: fileIdBigInt },
    include: {
      evidence: {
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

  if (!file || file.del || file.evidenceId !== evId) {
    notFound();
  }

  // ตรวจสอบสิทธิ์การเข้าถึง
  const hasAccess = await canAccessSchool(
    BigInt(session.user.id),
    file.evidence.school.sc_id
  );

  if (!hasAccess) {
    redirect('/evidence');
  }

  return (
    <div className="container mx-auto p-6">
      <BackLink
        href={`/evidence/${id}/files`}
        label="ย้อนกลับรายการไฟล์"
        className="mb-4"
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{file.fileName}</h1>
        <p className="text-muted-foreground mt-1">
          {file.evidence.evidenceCode} - {file.evidence.school.name}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {file.evidence.indicator.standard.level.nameTh} -{' '}
          {file.evidence.indicator.standard.nameTh} - {file.evidence.indicator.nameTh}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <FileViewer file={file} />
      </div>

      <div className="mt-6">
        <BackLink
          href={`/evidence/${id}/files`}
          label="ย้อนกลับรายการไฟล์"
        />
      </div>
    </div>
  );
}
