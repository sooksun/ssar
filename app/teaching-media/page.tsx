import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { getTeachingMediaList } from '@/app/actions/teaching-media';
import { thaiAcademicYear } from '@/lib/evidence';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { FileThumbnail } from '@/lib/file-thumbnail';

export default async function TeachingMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; academicYear?: string; indicatorId?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const currentAcademicYear = thaiAcademicYear();
  const selectedAcademicYear = params?.academicYear
    ? parseInt(params.academicYear)
    : currentAcademicYear;

  const result = await getTeachingMediaList({
    schoolId: params?.schoolId,
    academicYear: selectedAcademicYear,
    indicatorId: params?.indicatorId,
  });

  if (!result.success) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  const teachingMedia = result.data || [];

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/extra-programs" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ทะเบียนสื่อการสอน</h1>
          <p className="text-muted-foreground mt-1">
            ระบบบันทึกสื่อการสอนสำหรับข้อ 2.6 - การใช้สื่อ อุปกรณ์ และระบบเทคโนโลยี
          </p>
        </div>
        <Link
          href="/teaching-media/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          เพิ่มสื่อการสอน
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 text-sm text-muted-foreground">
          พบทั้งหมด {teachingMedia.length} รายการ (ปีการศึกษา {selectedAcademicYear})
        </div>

        {teachingMedia.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>ยังไม่มีข้อมูลสื่อการสอน</p>
            <Link href="/teaching-media/new" className="mt-4 text-primary hover:underline">
              เพิ่มสื่อการสอนใหม่
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {teachingMedia.map((item) => {
              // files array ถูกเรียงตาม isPrimary desc แล้ว ดังนั้นไฟล์แรกจะเป็น primary หรือไฟล์ล่าสุด
              const primaryFile = item.files[0];
              return (
                <Link
                  key={item.id.toString()}
                  href={`/teaching-media/${item.id}`}
                  className="block rounded-lg border p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {primaryFile && (
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border bg-muted">
                          <FileThumbnail file={primaryFile} size={64} />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description || 'ไม่มีรายละเอียด'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>โรงเรียน: {item.school.name}</span>
                          <span>ตัวชี้วัด: {item.indicator.code} - {item.indicator.nameTh}</span>
                          <span>ครูผู้ผลิต: {item.teacherName}</span>
                          <span>สถานะ: {item.status}</span>
                        </div>
                      </div>
                    </div>
                    {item.files.length > 0 && (
                      <div className="ml-4 text-sm text-muted-foreground">
                        มีไฟล์ {item.files.length} ไฟล์
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BackLink href="/extra-programs" label="ย้อนกลับรายการ" className="mt-6" />
    </div>
  );
}

