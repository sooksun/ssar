import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { getLessonPlanById } from '@/app/actions/lesson-plan';
import { BackLink } from '@/components/ui/back-link';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileThumbnail } from '@/lib/file-thumbnail';

export default async function LessonPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const result = await getLessonPlanById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const lessonPlan = result.data;

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/lesson-plans" label="ย้อนกลับรายการ" className="mb-4" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lessonPlan.title}</h1>
          <p className="text-muted-foreground mt-1">ข้อมูลแผนการสอน</p>
        </div>
        <Link href={`/lesson-plans/${id}/edit`}>
          <Button variant="outline">แก้ไข</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* ข้อมูลพื้นฐาน */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">ข้อมูลพื้นฐาน</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {lessonPlan.code && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">รหัสแผนการสอน</label>
                <p className="mt-1">{lessonPlan.code}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">โรงเรียน</label>
              <p className="mt-1">{lessonPlan.school.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ปีการศึกษา</label>
              <p className="mt-1">{lessonPlan.academicYear}</p>
            </div>
            {lessonPlan.semester != null && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">ภาคเรียนที่</label>
                <p className="mt-1">{lessonPlan.semester}</p>
              </div>
            )}
            {lessonPlan.planType && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">ประเภทแผนการสอน</label>
                <p className="mt-1">{lessonPlan.planType}</p>
              </div>
            )}
            {lessonPlan.room && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">ห้อง</label>
                <p className="mt-1">{lessonPlan.room}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">ครูผู้สอน</label>
              <p className="mt-1">{lessonPlan.teacherName}</p>
            </div>
            {lessonPlan.subject && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">วิชา</label>
                <p className="mt-1">{lessonPlan.subject}</p>
              </div>
            )}
            {lessonPlan.grade && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">ระดับชั้น</label>
                <p className="mt-1">{lessonPlan.grade}</p>
              </div>
            )}
            {lessonPlan.planDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันที่ใช้แผน</label>
                <p className="mt-1">
                  {new Date(lessonPlan.planDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            {lessonPlan.submittedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันที่ส่งแผน</label>
                <p className="mt-1">
                  {new Date(lessonPlan.submittedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    lessonPlan.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : lessonPlan.status === 'SUBMITTED'
                        ? 'bg-blue-100 text-blue-800'
                        : lessonPlan.status === 'REVIEWED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : lessonPlan.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {lessonPlan.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">วันที่สร้าง</label>
              <p className="mt-1">
                {new Date(lessonPlan.createdAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* รายละเอียดแผน */}
        {lessonPlan.description && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">รายละเอียดแผน</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">{lessonPlan.description}</p>
          </div>
        )}

        {/* บันทึกหลังแผน */}
        {lessonPlan.reflection && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">บันทึกหลังแผน</h2>
            <p className="whitespace-pre-wrap text-muted-foreground">{lessonPlan.reflection}</p>
          </div>
        )}

        {/* ไฟล์ */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">ไฟล์ที่เกี่ยวข้อง</h2>
            <Link href={`/lesson-plans/${id}/files`}>
              <Button variant="outline" size="sm">
                จัดการไฟล์
              </Button>
            </Link>
          </div>
          {lessonPlan.files.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีไฟล์</p>
          ) : (
            <div className="space-y-2">
              {lessonPlan.files.map((file) => (
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
                        ประเภท: {file.fileType} |{' '}
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
      <BackLink href="/lesson-plans" label="ย้อนกลับรายการ" className="mt-6" />
    </div>
  );
}

