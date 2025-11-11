import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ReviewForm from './ui-review-form';
import { getReviewStatusBadgeClass, getReviewStatusLabel } from '@/lib/status';
import { BackLink } from '@/components/ui/back-link';
import Link from 'next/link';
import { canAccessSchool } from '@/lib/auth/scoping';

export default async function EvidenceReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const roles = session.user.roles ?? [];
  const allowedRoles = new Set(['ADMIN', 'QA_LEAD', 'ASSESSOR']);
  const hasRole = roles.some((role: { role: string }) => allowedRoles.has(role.role));
  if (!hasRole) {
    redirect('/evidence');
  }

  const { edit: editParam } = await searchParams;

  const { id } = await params;
  const evId = BigInt(id);

  const evidence = await prisma.evidence.findUnique({
    where: { id: evId },
    select: { id: true, evidenceCode: true, schoolId: true },
  });

  if (!evidence) redirect('/evidence');

  const hasAccess = await canAccessSchool(BigInt(session.user.id), evidence.schoolId);
  if (!hasAccess) {
    redirect('/evidence');
  }

  const [reviews, files] = await Promise.all([
    prisma.evidenceReview.findMany({
      where: { evidenceId: evId },
      include: {
        reviewer: {
          select: { fullName: true, email: true },
        },
        evidenceFile: {
          select: {
            id: true,
            fileName: true,
            storageType: true,
            externalUrl: true,
            driveFileId: true,
          },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    }),
    prisma.evidenceFile.findMany({
      where: { evidenceId: evId, del: false },
      select: {
        id: true,
        fileName: true,
        storageType: true,
        externalUrl: true,
        driveFileId: true,
        uploadedAt: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
    }),
  ]);

  const userRoleCodes = roles.map((role) => role.role);
  const userId = session.user.id;
  const canManageAllReviews = userRoleCodes.some((role: string) =>
    ['ADMIN', 'QA_LEAD', 'ASSESSOR'].includes(role),
  );

  const editReviewRecord = editParam
    ? reviews.find((r) => r.id.toString() === editParam)
    : undefined;

  const formReview = editReviewRecord
    ? {
        id: editReviewRecord.id.toString(),
        reviewStatus: editReviewRecord.reviewStatus,
        score: editReviewRecord.score ? Number(editReviewRecord.score) : undefined,
        comment: editReviewRecord.comment,
        evidenceFileId: editReviewRecord.evidenceFileId
          ? editReviewRecord.evidenceFileId.toString()
          : undefined,
      }
    : undefined;

  const basePath = `/evidence/${id}/reviews`;

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/evidence" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">รีวิวหลักฐาน</h1>
        <p className="text-muted-foreground mt-1">{evidence?.evidenceCode}</p>
      </div>

      <ReviewForm
        evidenceId={id}
        files={files.map((file) => ({
          id: file.id.toString(),
          name: file.fileName,
          info:
            file.storageType === 'GDRIVE'
              ? ' (Google Drive)'
              : file.storageType === 'URL'
                ? ' (URL)'
                : file.storageType === 'YOUTUBE'
                  ? ' (YouTube)'
                  : '',
        }))}
        review={formReview}
        returnTo={basePath}
      />

      <div className="rounded-lg border bg-card mt-6">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">รายการรีวิว</h2>
        </div>
        <div className="p-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีรีวิว</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id.toString()} className="border rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.reviewer.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.reviewedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {r.evidenceFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          ไฟล์:{' '}
                          <span className="font-medium text-foreground">{r.evidenceFile.fileName}</span>
                        </span>
                        {(() => {
                          if (r.evidenceFile.storageType === 'GDRIVE' && r.evidenceFile.driveFileId) {
                            return (
                              <a
                                href={`https://drive.google.com/file/d/${r.evidenceFile.driveFileId}/view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                เปิดไฟล์
                              </a>
                            );
                          }
                          const directLink = r.evidenceFile.externalUrl;
                          if (directLink) {
                            return (
                              <a
                                href={directLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                เปิดไฟล์
                              </a>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                    {r.score !== null && (
                      <span className="font-medium">
                        ความพร้อมรับการตรวจ: {r.score?.toString()}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getReviewStatusBadgeClass(r.reviewStatus)}`}
                    >
                      {getReviewStatusLabel(r.reviewStatus)}
                    </span>
                    {(canManageAllReviews || r.reviewerId.toString() === userId) && (
                      <Link
                        href={`${basePath}?edit=${r.id.toString()}`}
                        className="text-sm text-primary hover:underline"
                      >
                        แก้ไข
                      </Link>
                    )}
                  </div>
                </div>
                {r.comment && <p className="text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


