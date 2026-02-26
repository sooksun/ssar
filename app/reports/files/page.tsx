import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPrimaryFiles } from '@/lib/queries/files';
import { thaiAcademicYear } from '@/lib/evidence';

type SearchParams = {
  schoolId?: string;
  fiscalYear?: string;
};

function buildFileLink(row: {
  storageType: string;
  externalUrl?: string | null;
  storagePath?: string | null;
  driveFileId?: string | null;
}) {
  if (row.storageType === 'URL') {
    return row.externalUrl || row.storagePath || undefined;
  }
  if (row.storageType === 'YOUTUBE') {
    return row.externalUrl || row.storagePath || undefined;
  }
  if (row.storageType === 'GDRIVE') {
    if (row.storagePath) return row.storagePath;
    if (row.driveFileId) {
      return `https://drive.google.com/file/d/${row.driveFileId}`;
    }
  }
  return row.externalUrl || row.storagePath || undefined;
}

export default async function PrimaryFilesReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roleSchools: string[] = (user.roles ?? []).map((role) => role.schoolId);
  const accessibleSchoolIds = Array.from(new Set(roleSchools));

  if (accessibleSchoolIds.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">รายงานไฟล์หลัก</h1>
        <p className="mt-4 text-sm text-muted-foreground">บัญชีนี้ยังไม่ได้รับมอบหมายโรงเรียน</p>
      </div>
    );
  }

  const schools = await prisma.school.findMany({
    where: {
      sc_id: { in: accessibleSchoolIds.map((id) => BigInt(id)) },
      del: false,
    },
    orderBy: { name: 'asc' },
    select: {
      sc_id: true,
      name: true,
    },
  });

  const academicYearNow = thaiAcademicYear();
  const selectedAcademicYear =
    params?.fiscalYear && !Number.isNaN(Number(params.fiscalYear))
      ? Number(params.fiscalYear)
      : academicYearNow;

  const selectedSchoolId =
    params?.schoolId && accessibleSchoolIds.includes(params.schoolId)
      ? params.schoolId
      : 'ALL';

  const querySchools =
    selectedSchoolId === 'ALL'
      ? accessibleSchoolIds.map((id) => BigInt(id))
      : [BigInt(selectedSchoolId)];

  const rows = await getPrimaryFiles({
    schoolIds: querySchools,
    fiscalYear: selectedAcademicYear,
  });

  const totalFiles = rows.length;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">รายงานไฟล์หลัก</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            รวบรวมไฟล์หลัก (Primary) ของหลักฐานในปีการศึกษา {selectedAcademicYear}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-sm font-medium text-slate-500">จำนวนไฟล์หลัก</p>
          <p className="text-2xl font-bold text-slate-900">{totalFiles}</p>
        </div>
      </div>

      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="files-school">
            โรงเรียน
          </label>
          <select
            id="files-school"
            name="schoolId"
            defaultValue={selectedSchoolId}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">ทั้งหมด</option>
            {schools.map((school) => (
              <option key={school.sc_id.toString()} value={school.sc_id.toString()}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="files-fiscal-year">
            ปีการศึกษา
          </label>
          <input
            id="files-fiscal-year"
            name="fiscalYear"
            type="number"
            min={2500}
            max={3000}
            defaultValue={selectedAcademicYear}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="md:col-span-1 lg:col-span-2 flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            แสดงรายงาน
          </button>
          <a
            href="/reports/files"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ล้างตัวกรอง
          </a>
          <a
            href={`/api/reports/files?${new URLSearchParams({
              ...(selectedSchoolId === 'ALL' ? {} : { schoolId: selectedSchoolId }),
              fiscalYear: selectedAcademicYear.toString(),
            }).toString()}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ดาวน์โหลด JSON
          </a>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">รายละเอียดไฟล์หลัก</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">หลักฐาน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">โรงเรียน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ตัวชี้วัด</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ประเภทไฟล์</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ลิงก์ไฟล์</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">อัปโหลด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => {
                const fileLink = buildFileLink(row);
                return (
                  <tr key={row.evidenceId}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">{row.evidenceCode ?? '-'}</div>
                      <div className="text-sm text-slate-600">{row.title}</div>
                      <a
                        href={`/evidence/${row.evidenceId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        เปิดหลักฐาน
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-800">{row.schoolName}</div>
                      <div className="text-xs text-slate-500">รหัส: {row.schoolId}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-800">{row.indicatorCode}</div>
                      <div className="text-xs text-slate-500">{row.indicatorName}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {row.storageType}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {fileLink ? (
                        <a href={fileLink} target="_blank" className="text-primary hover:underline">
                          เปิดไฟล์
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-slate-600">
                      {new Date(row.uploadedAt).toLocaleString('th-TH')}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    ไม่พบข้อมูลไฟล์หลักตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


