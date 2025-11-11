import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { getEvidenceStatusBadgeClass, getEvidenceStatusLabel, getReviewStatusBadgeClass, getReviewStatusLabel } from '@/lib/status';
import { BackLink } from '@/components/ui/back-link';
import { isImageFile, isVideoFile } from '@/lib/file-types';
import ExternalEvaluationsPanel from './external/ui-external-evaluations';

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];
  const schoolIds = roles.map((role) => BigInt(role.schoolId));
  const currentUserName = user?.name || 'ไม่ระบุ';
  const primaryRole = roles[0];
  const currentUserOrg =
    primaryRole?.schoolName || primaryRole?.role || user?.primarySchoolName || 'ไม่ระบุ';

  // Await params (Next.js 15 requirement)
  const { id } = await params;
  const evidenceId = BigInt(id);

  // ดึงข้อมูลหลักฐาน
  const evidence = await prisma.evidence.findFirst({
    where: {
      id: evidenceId,
      schoolId: {
        in: schoolIds, // ตรวจสอบ school access
      },
      del: false,
    },
    include: {
      school: {
        select: {
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
      owner: {
        select: {
          fullName: true,
          email: true,
        },
      },
      files: {
        where: {
          del: false,
        },
        select: {
          id: true,
          fileName: true,
          storageType: true,
          isPrimary: true,
          uploadedAt: true,
          storagePath: true,
          externalUrl: true,
          thumbnailUrl: true,
          mimeType: true,
        },
        orderBy: [
          {
            isPrimary: 'desc',
          },
          {
            uploadedAt: 'desc',
          },
        ],
      },
      externalEvaluations: {
        orderBy: { evaluationDate: 'desc' },
      },
      reviews: {
        include: {
          reviewer: {
            select: {
              fullName: true,
              email: true,
            },
          },
          evidenceFile: {
            select: {
              id: true,
              fileName: true,
              storageType: true,
              driveFileId: true,
              externalUrl: true,
            },
          },
        },
        orderBy: {
          reviewedAt: 'desc',
        },
      },
    },
  });

  if (!evidence) {
    notFound();
  }

  // ตรวจสอบสิทธิ์
  const userRoleCodes = roles.map((role) => role.role);
  const isOwner = evidence.ownerUserId?.toString() === user.id;
  const isAdmin = userRoleCodes.includes('ADMIN');
  const isQaLead = userRoleCodes.includes('QA_LEAD');
  const isAssessor = userRoleCodes.includes('ASSESSOR');
  const canEdit = isOwner || isAdmin || isQaLead;
  const canDelete = isOwner || isAdmin;
  const canReview = isQaLead || isAssessor || isAdmin;
  const reviewsBasePath = `/evidence/${id}/reviews`;

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/evidence" label="ย้อนกลับรายการ" className="mb-4" />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                {evidence.evidenceCode || 'ไม่มีรหัส'}
              </h1>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${getEvidenceStatusBadgeClass(evidence.status)}`}>
                {getEvidenceStatusLabel(evidence.status)}
              </span>
            </div>
            <p className="text-xl text-muted-foreground">{evidence.title}</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Link href={`/evidence/${id}/edit`}>
                <Button variant="outline">แก้ไข</Button>
              </Link>
            )}
            {canDelete && (
              <Button variant="destructive">ลบ</Button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ข้อมูลหลักฐาน</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">โรงเรียน</p>
            <p className="font-medium">{evidence.school.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ระดับการศึกษา</p>
            <p className="font-medium">
              {evidence.indicator.standard.level.nameTh}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">มาตรฐาน</p>
            <p className="font-medium">
              {evidence.indicator.standard.code} -{' '}
              {evidence.indicator.standard.nameTh}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ตัวชี้วัด</p>
            <p className="font-medium">
              {evidence.indicator.code} - {evidence.indicator.nameTh}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ปีงบประมาณ</p>
            <p className="font-medium">{evidence.fiscalYear}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">เจ้าของหลักฐาน</p>
            <p className="font-medium">
              {evidence.owner?.fullName || 'ไม่ระบุ'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">วันที่สร้าง</p>
            <p className="font-medium">
              {new Date(evidence.createdAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ระดับความลับ</p>
            <p className="font-medium">{evidence.privacyLevel}</p>
          </div>
        </div>
        {evidence.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">รายละเอียด</p>
            <p className="whitespace-pre-wrap">{evidence.description}</p>
          </div>
        )}
      </div>

      {/* Files Section */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">ไฟล์ที่แนบ</h2>
          {canEdit && (
            <Link href={`/evidence/${id}/files`}>
              <Button variant="outline">เพิ่มไฟล์</Button>
            </Link>
          )}
        </div>
        {evidence.files.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ยังไม่มีไฟล์ที่แนบ
          </p>
        ) : (
          <div className="space-y-2">
            {evidence.files.map((file) => {
              const isImage =
                isImageFile(file.fileName, file.mimeType) ||
                (file.storageType === 'URL' && isImageFile(file.externalUrl || file.storagePath));
              const isVideo =
                isVideoFile(file.fileName, file.mimeType) ||
                (file.storageType === 'URL' && isVideoFile(file.externalUrl || file.storagePath));
              const isPdf =
                (file.mimeType && file.mimeType.toLowerCase().includes('pdf')) ||
                (file.externalUrl || file.storagePath || '').toLowerCase().includes('.pdf');
              // สำหรับรูปภาพ: ใช้ externalUrl
              // สำหรับวิดีโอ: ใช้ thumbnailUrl ถ้ามี
              const imageSrc =
                file.storageType === 'URL' && isImage
                  ? file.externalUrl || file.storagePath
                  : file.storageType === 'URL' && isVideo && file.thumbnailUrl
                    ? file.thumbnailUrl
                    : undefined;
              
              // สำหรับ LINK ให้เปิดในแท็บใหม่ แทนที่จะแสดงใน embedded page
              const isLinkType = file.storageType === 'LINK';
              const linkHref = isLinkType 
                ? file.externalUrl || file.storagePath || '#' 
                : `/evidence/${id}/files/${file.id.toString()}/view`;

              const thumbnailContent = (
                <>
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={file.fileName}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : file.storageType === 'YOUTUBE' ? (
                    <Image
                      src="/youtube.png"
                      alt="YouTube"
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : file.storageType === 'GDRIVE' ? (
                    <Image
                      src="/gdrive.png"
                      alt="Google Drive"
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : file.storageType === 'CANVA' ? (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#00C4CC] to-[#7B61FF] text-white text-[10px] font-bold">
                      CANVA
                    </div>
                  ) : file.storageType === 'LINK' ? (
                    <div className="flex h-full w-full items-center justify-center bg-blue-500 text-white text-[10px] font-bold">
                      LINK
                    </div>
                  ) : isVideo && imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={`Thumbnail ${file.fileName}`}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : isVideo ? (
                    <div className="flex h-full w-full items-center justify-center bg-red-500 text-white text-[10px] font-bold">
                      VIDEO
                    </div>
                  ) : isPdf ? (
                    <Image
                      src="/file_pdf.png"
                      alt="ตัวอย่างไฟล์ PDF"
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      ไม่มีพรีวิว
                    </div>
                  )}
                </>
              );

              return (
                <div
                  key={file.id.toString()}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {file.isPrimary && (
                      <span className="rounded-full bg-primary text-primary-foreground px-2 py-1 text-xs font-medium">
                        หลัก
                      </span>
                    )}

                    {isLinkType ? (
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-14 w-14 overflow-hidden rounded-full border bg-muted"
                      >
                        {thumbnailContent}
                      </a>
                    ) : (
                      <Link
                        href={linkHref}
                        className="h-14 w-14 overflow-hidden rounded-full border bg-muted"
                      >
                        {thumbnailContent}
                      </Link>
                    )}

                    <div>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.storageType} • {new Date(file.uploadedAt).toLocaleDateString('th-TH')}
                      </p>
                      {file.storagePath && (
                        <p className="text-xs text-muted-foreground break-all">{file.storagePath}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Link
                      href={`/evidence/${id}/files`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      แก้ไข
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">รีวิว</h2>
          {canReview && (
            <Link href={`/evidence/${id}/reviews`}>
              <Button variant="outline">เพิ่มรีวิว</Button>
            </Link>
          )}
        </div>
        {evidence.reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ยังไม่มีรีวิว
          </p>
        ) : (
          <div className="space-y-4">
            {evidence.reviews.map((review) => {
              const canEditThisReview =
                canReview &&
                (isAdmin || isQaLead || isAssessor || review.reviewerId.toString() === user.id);

              return (
                <div
                  key={review.id.toString()}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div>
                      <p className="font-medium">
                        {review.reviewer.fullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.reviewedAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {review.evidenceFile && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            ไฟล์:{' '}
                            <span className="font-medium text-foreground">
                              {review.evidenceFile.fileName}
                            </span>
                          </span>
                          {(() => {
                            if (review.evidenceFile.storageType === 'GDRIVE' && review.evidenceFile.driveFileId) {
                              return (
                                <a
                                  href={`https://drive.google.com/file/d/${review.evidenceFile.driveFileId}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  เปิดไฟล์
                                </a>
                              );
                            }
                            const directLink = review.evidenceFile.externalUrl;
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
                      {review.score !== null && (
                        <span className="font-medium">
                          ความพร้อมรับการตรวจ: {review.score.toString()}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getReviewStatusBadgeClass(review.reviewStatus)}`}
                      >
                        {getReviewStatusLabel(review.reviewStatus)}
                      </span>
                      {canEditThisReview && (
                        <Link
                          href={`${reviewsBasePath}?edit=${review.id.toString()}`}
                          className="text-sm text-primary hover:underline"
                        >
                          แก้ไข
                        </Link>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm whitespace-pre-wrap mt-2">
                      {review.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {evidence.status === 'READY' && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">การประเมินภายใน</h2>
          <ExternalEvaluationsPanel
            evidenceId={id}
            canEdit={canEdit}
            currentUserName={currentUserName}
            currentUserOrg={currentUserOrg}
            evaluations={(evidence?.externalEvaluations || []).map((ev) => ({
              id: ev.id.toString(),
              evaluatorName: ev.evaluatorName,
              evaluatorOrg: ev.evaluatorOrg,
              evaluationDate: ev.evaluationDate.toISOString(),
              score: ev.score ? Number(ev.score) : undefined,
              strengths: ev.strengths,
              weaknesses: ev.weaknesses,
              recommendations: ev.recommendations,
              attachmentUrl: ev.attachmentUrl,
            }))}
          />
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <BackLink href="/evidence" label="ย้อนกลับรายการ" />
      </div>
    </div>
  );
}

