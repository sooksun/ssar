import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { CreatePAAgreementForm } from '@/app/pa/create-pa-agreement-form';
import { DownloadDirectorPptxButton } from '@/app/pa/download-director-pptx-button';
import { PATeacherDocumentsSection } from '@/app/pa/teacher-documents-section';
import { getUserSchools } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';

const PA_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งแล้ว',
  IN_REVIEW: 'อยู่ระหว่างประเมิน',
  EVALUATED: 'ประเมินแล้ว',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ไม่อนุมัติ',
};

const POSITION_LABEL: Record<string, string> = {
  TEACHER: 'ครู',
  PRINCIPAL: 'ผู้บริหาร',
};

export default async function PAPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const schoolIds = await getUserSchools(session.user.id);
  const currentFiscalYear = thaiFiscalYear();

  const schools =
    schoolIds.length > 0
      ? await prisma.school.findMany({
          where: { sc_id: { in: schoolIds }, del: false },
          select: { sc_id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const agreements = await prisma.pAAgreement.findMany({
    where: schoolIds.length > 0 ? { schoolId: { in: schoolIds } } : undefined,
    orderBy: [{ fiscalYear: 'desc' }, { updatedAt: 'desc' }],
    include: {
      school: { select: { name: true } },
    },
    take: 50,
  });

  const currentUserId = session.user.id;
  const hasPrincipalAgreement = agreements.some(
    (a) => a.userId.toString() === currentUserId && a.positionType === 'PRINCIPAL'
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">การประเมินผลการพัฒนางานตามข้อตกลง (PA)</h1>
          <p className="text-muted-foreground mt-1">
            จัดการข้อตกลงและผลการประเมิน PA ตามมาตรฐานตำแหน่ง
          </p>
        </div>
        <CreatePAAgreementForm
          schools={schools.map((s) => ({ id: s.sc_id.toString(), name: s.name }))}
          currentFiscalYear={currentFiscalYear}
          currentUserId={session.user.id}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">รายการข้อตกลง PA</h2>
            <p className="text-sm text-muted-foreground">
              ปีงบประมาณปัจจุบัน: {currentFiscalYear}
            </p>
          </div>
          <DownloadDirectorPptxButton hasPrincipalAgreement={hasPrincipalAgreement} />
        </div>

        {agreements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="mb-4">ยังไม่มีข้อตกลง PA</p>
            <p className="text-sm">
              กดปุ่ม &quot;สร้างข้อตกลง PA&quot; ด้านบนเพื่อสร้างข้อตกลงสำหรับโรงเรียนและปีงบประมาณที่ต้องการ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">ปีงบประมาณ</th>
                  <th className="text-left py-3 px-2 font-medium">ตำแหน่ง</th>
                  <th className="text-left py-3 px-2 font-medium">สถานศึกษา</th>
                  <th className="text-left py-3 px-2 font-medium">สถานะ</th>
                  <th className="text-right py-3 px-2 font-medium">คะแนนรวม</th>
                  <th className="text-left py-3 px-2 font-medium">ผลการประเมิน</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {agreements.map((ag) => (
                  <tr key={ag.id.toString()} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{ag.fiscalYear}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ag.positionType === 'TEACHER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {POSITION_LABEL[ag.positionType] ?? ag.positionType}
                      </span>
                    </td>
                    <td className="py-3 px-2">{ag.school.name}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ag.status === 'EVALUATED' || ag.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : ag.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {PA_STATUS_LABEL[ag.status] ?? ag.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {ag.totalScore != null
                        ? Number(ag.totalScore).toFixed(1)
                        : '–'}
                    </td>
                    <td className="py-3 px-2">
                      {ag.isPassed === true && (
                        <span className="text-green-600 font-medium">ผ่าน</span>
                      )}
                      {ag.isPassed === false && (
                        <span className="text-red-600 font-medium">ไม่ผ่าน</span>
                      )}
                      {ag.isPassed == null && <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/pa/agreements/${ag.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PATeacherDocumentsSection
        schools={schools.map((s) => ({ id: s.sc_id.toString(), name: s.name }))}
        currentAcademicYear={thaiAcademicYear()}
      />

      <div className="rounded-xl border bg-muted/30 p-6">
        <h3 className="font-semibold mb-2">เกี่ยวกับ PA</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>PA ครู:</strong> ส่วนที่ 1 ข้อตกลงตามมาตรฐานตำแหน่ง 3 ด้าน 15 ตัวชี้วัด (60 คะแนน)</li>
          <li><strong>PA ผู้บริหาร:</strong> ส่วนที่ 1 ข้อตกลงตามมาตรฐานตำแหน่ง 5 ด้าน 15 ตัวชี้วัด (60 คะแนน)</li>
          <li>ส่วนที่ 2: ข้อตกลงประเด็นท้าทาย 3 ข้อพิจารณา (40 คะแนน) — เหมือนกันทั้งสองตำแหน่ง</li>
          <li>หลักฐานชิ้นเดียวกันสามารถใช้ประกอบทั้งมุมมอง QA และ PA ได้</li>
        </ul>
      </div>
    </div>
  );
}
