import { auth } from '@/lib/auth/nextauth';
import { getUserSchools } from '@/lib/auth/scoping';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import { BackLink } from '@/components/ui/back-link';
import WorkCollectionForm from './work-collection-form';
import Link from 'next/link';
import { getFiscalYearOptions } from '@/lib/year-options';

export default async function WorkCollectionPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const roles = session.user.roles ?? [];
  const canAdd = roles.some((r) => ['ADMIN', 'QA_LEAD', 'TEACHER'].includes(r.role));
  if (!canAdd) redirect('/dashboard');

  const schoolIds = await getUserSchools(session.user.id);
  const schools =
    schoolIds.length > 0
      ? await prisma.school.findMany({
          where: { sc_id: { in: schoolIds }, del: false },
          select: { sc_id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const currentFiscalYear = thaiFiscalYear();
  const currentAcademicYear = thaiAcademicYear();
  const fiscalYearOptions = getFiscalYearOptions();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">เก็บงาน</h1>
          <p className="text-muted-foreground mt-1">
            เพิ่มหลักฐาน (รูปภาพ, วิดีโอ, เอกสาร หรือลิงก์ YouTube / Google Drive / Canva) พร้อมข้อความอธิบาย —
            ระบบจะใช้ AI ช่วยเชื่อมโยงหลักฐานกับตัวชี้วัดในหลายมุมมองอัตโนมัติ
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <WorkCollectionForm
          schools={schools.map((s) => ({ id: s.sc_id.toString(), name: s.name }))}
          currentFiscalYear={currentFiscalYear}
          currentAcademicYear={currentAcademicYear}
          fiscalYearOptions={fiscalYearOptions}
        />
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">การทำงาน</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            กรอกชื่อ/หัวข้อและข้อความอธิบาย (ทำอะไร ที่ไหน เกิดผลต่อตนเอง/ครู/ผู้เรียน/โรงเรียนอย่างไร)
          </li>
          <li>
            แนบไฟล์ได้หลายแบบ: อัปโหลดรูป/วิดีโอ/PDF/PPT หรือใส่ลิงก์ YouTube, Google Drive, Canva
          </li>
          <li>
            หลังบันทึก กด &quot;AI วิเคราะห์&quot; (หรือบันทึกและให้ AI เชื่อมโยง) ระบบจะวิเคราะห์หลักฐานแล้วเชื่อมโยงกับตัวชี้วัดในหลายมุมมอง เช่น
            <ul className="ml-4 mt-1 list-disc list-inside space-y-0.5">
              <li>มุมมอง ประกันคุณภาพ ปฐมวัย (ตัวชี้วัดที่ 1, 2, 3 ฯลฯ)</li>
              <li>มุมมอง ประกันคุณภาพ ขั้นพื้นฐาน (ตัวชี้วัดที่ 1, 2, 3 ฯลฯ)</li>
              <li>มุมมอง ประเมินครูผู้ช่วย (ตัวชี้วัดที่ 1, 2 ฯลฯ)</li>
              <li>มุมมอง PA ของครู (ตัวชี้วัดที่ 1, 2, 3 ฯลฯ)</li>
              <li>มุมมอง PA ของผู้บริหาร (ตัวชี้วัดที่ 1, 2 ฯลฯ)</li>
            </ul>
          </li>
          <li>
            ดูหรือแก้ไขการเชื่อมโยงได้จากหน้ารายละเอียดหลักฐานในเมนู <Link href="/evidence" className="text-primary hover:underline">หลักฐาน</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
