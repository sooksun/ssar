import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { getTeachingMediaById } from '@/app/actions/teaching-media';
import { BackLink } from '@/components/ui/back-link';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileThumbnail } from '@/lib/file-thumbnail';

export default async function TeachingMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const result = await getTeachingMediaById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const teachingMedia = result.data;

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/teaching-media" label="ย้อนกลับรายการ" className="mb-4" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{teachingMedia.title}</h1>
          <p className="text-muted-foreground mt-1">
            ข้อมูลสื่อการสอน - {teachingMedia.indicator.code} - {teachingMedia.indicator.nameTh}
          </p>
        </div>
        <Link href={`/teaching-media/${id}/edit`}>
          <Button variant="outline">แก้ไข</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* ข้อมูลพื้นฐาน */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">ข้อมูลพื้นฐาน</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">โรงเรียน</label>
              <p className="mt-1">{teachingMedia.school.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ปีการศึกษา</label>
              <p className="mt-1">{teachingMedia.academicYear}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ตัวชี้วัด</label>
              <p className="mt-1">
                {teachingMedia.indicator.code} - {teachingMedia.indicator.nameTh}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ครูผู้ผลิต</label>
              <p className="mt-1">{teachingMedia.teacherName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    teachingMedia.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : teachingMedia.status === 'SUBMITTED'
                        ? 'bg-blue-100 text-blue-800'
                        : teachingMedia.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {teachingMedia.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">วันที่สร้าง</label>
              <p className="mt-1">
                {new Date(teachingMedia.createdAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* รายละเอียด */}
        {teachingMedia.description && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">รายละเอียดสื่อ</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {teachingMedia.description}
            </p>
          </div>
        )}

        {/* ไฟล์ */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">ไฟล์ที่เกี่ยวข้อง</h2>
            <Link href={`/teaching-media/${id}/files`}>
              <Button variant="outline" size="sm">
                จัดการไฟล์
              </Button>
            </Link>
          </div>
          {teachingMedia.files.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีไฟล์</p>
          ) : (
            <div className="space-y-2">
              {teachingMedia.files.map((file) => (
                <div
                  key={file.id.toString()}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border bg-muted">
                      <FileThumbnail file={file} size={56} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{file.fileName}</p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground">{file.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.uploadedAt).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>
                  {file.isPrimary && (
                    <span className="ml-4 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                      หลัก
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BackLink href="/teaching-media" label="ย้อนกลับรายการ" className="mt-6" />
    </div>
  );
}

