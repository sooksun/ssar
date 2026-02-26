import { auth } from '@/lib/auth/nextauth';
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

  const schoolIds = roles.map((r) => BigInt(r.schoolId));
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
            เพิ่มหลักฐาน (รูปภาพ, วิดีโอ, เอกสาร) พร้อมข้อความอธิบาย — ระบบจะใช้ AI
            ช่วยเชื่อมโยงกับตัวชี้วัด QA และ PA อัตโนมัติ
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
            แนบไฟล์ได้หลายแบบ: อัปโหลดรูป/วิดีโอ/PDF หรือใส่ลิงก์ YouTube, Google Drive, Canva
          </li>
          <li>
            หลังบันทึก ระบบจะเรียก AI วิเคราะห์และเชื่อมโยงตัวชี้วัด QA + PA ให้อัตโนมัติ (ใช้ตารางเดิม)
          </li>
          <li>
            แก้ไขหรือเชื่อมโยงตัวชี้วัดด้วยตนเองได้จากเมนู <Link href="/evidence" className="text-primary hover:underline">หลักฐาน</Link> เหมือนเดิม
          </li>
        </ul>
      </div>
    </div>
  );
}
