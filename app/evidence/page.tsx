import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { getEvidenceStatusBadgeClass, getEvidenceStatusLabel } from '@/lib/status';
import { BackLink } from '@/components/ui/back-link';

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

  // ดึง school IDs ที่ user มีสิทธิ์
  const schoolIds = roles.map((role) => BigInt(role.schoolId));

  // กำหนดแท็บที่เลือกจาก query param
  const { level } = await searchParams;
  const activeLevel = level === 'BASIC' ? 'BASIC' : 'EARLY_CHILDHOOD';
  const activeLabel = activeLevel === 'BASIC' ? 'พื้นฐาน' : 'ปฐมวัย';

  // ดึงรายการหลักฐาน (จำกัดเฉพาะโรงเรียนที่ user มีสิทธิ์)
  const allEvidence = await prisma.evidence.findMany({
    where: {
      schoolId: {
        in: schoolIds,
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
          isPrimary: true,
          del: false,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // เพิ่มเป็น 100 เพื่อรองรับการกรอง
  });

  // กรองตาม level
  const evidence = allEvidence.filter((item) => {
    const levelCode = item.indicator.standard.level?.code;
    return levelCode === activeLevel;
  });

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">หลักฐาน</h1>
          <p className="text-muted-foreground mt-1">
            จัดการหลักฐานการประกันคุณภาพ
          </p>
        </div>
        <Link
          href="/evidence/new"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          + เพิ่มหลักฐานใหม่
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`/evidence?level=EARLY_CHILDHOOD`}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeLevel === 'EARLY_CHILDHOOD'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          ปฐมวัย
        </Link>
        <Link
          href={`/evidence?level=BASIC`}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeLevel === 'BASIC'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          พื้นฐาน
        </Link>
      </div>

      {/* Filter Section */}
      <div className={`mb-6 rounded-lg border p-4 ${
        activeLevel === 'BASIC' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <p className="text-sm text-muted-foreground">
          กำลังแสดง {evidence.length} รายการ ({activeLabel})
        </p>
      </div>

      {/* Evidence List */}
      {evidence.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">ยังไม่มีหลักฐาน</p>
          <Link
            href="/evidence/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            สร้างหลักฐานแรก
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {evidence.map((item) => (
            <Link
              key={item.id.toString()}
              href={`/evidence/${item.id}`}
              className="relative block overflow-visible rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative flex items-start">
                <div className="flex-1 pr-36">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {item.evidenceCode || 'ไม่มีรหัส'}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getEvidenceStatusBadgeClass(item.status)}`}
                    >
                      {getEvidenceStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{item.title}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>โรงเรียน: {item.school.name}</span>
                    <span>
                      มาตรฐาน: {item.indicator.standard.code} -{' '}
                      {item.indicator.standard.nameTh}
                    </span>
                    <span>ตัวชี้วัด: {item.indicator.code}</span>
                    <span>ปีการศึกษา: {item.fiscalYear}</span>
                    {item.owner && <span>เจ้าของ: {item.owner.fullName}</span>}
                  </div>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="pointer-events-none absolute -top-10 -right-6 flex h-28 w-28 items-center justify-center rounded-full border bg-card shadow-lg">
                  {(() => {
                    const file = item.files?.[0];
                    const src = file
                      ? file.storageType === 'URL'
                        ? file.externalUrl ?? file.storagePath ?? null
                        : file.storageType === 'GDRIVE' && file.driveFileId
                          ? `https://drive.google.com/uc?export=view&id=${file.driveFileId}`
                          : null
                      : null;
                    const isImage = file
                      ? src
                        ? /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.fileName || '') ||
                          /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(src) ||
                          (file.mimeType ? file.mimeType.toLowerCase().startsWith('image/') : false)
                        : false
                      : false;

                    return isImage && src ? (
                      <div className="h-full w-full overflow-hidden rounded-full">
                        <Image
                          src={src}
                          alt={file!.fileName}
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-muted text-center text-xs text-muted-foreground leading-tight px-3">
                        No
                        <br />
                        Picture
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-6">
        <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" />
      </div>
    </div>
  );
}

