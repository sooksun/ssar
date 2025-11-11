import { AUDIT_ACTIONS } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

type SearchParams = {
  action?: string;
  schoolId?: string;
  limit?: string;
};

const thaiDateTimeFormatter = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(date: Date) {
  try {
    return thaiDateTimeFormatter.format(date);
  } catch {
    return date.toISOString();
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const actionFilter = params?.action && params.action !== 'ALL' ? params.action : undefined;
  const schoolFilter =
    params?.schoolId && params.schoolId !== 'ALL' && params.schoolId.trim().length > 0
      ? BigInt(params.schoolId)
      : undefined;
  const limit = params?.limit ? Math.min(Math.max(Number(params.limit), 10), 500) : 200;

  const where: Prisma.AuditLogWhereInput = {};
  if (actionFilter) {
    where.action = actionFilter;
  }
  if (schoolFilter) {
    where.schoolId = schoolFilter;
  }

  const [logs, schools] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: true,
        school: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.school.findMany({
      where: { del: false },
      orderBy: { name: 'asc' },
    }),
  ]);

  const actionOptions = Object.values(AUDIT_ACTIONS);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-600">
          ตรวจสอบกิจกรรมสำคัญในระบบ เช่น การสร้างหลักฐาน การจัดการผู้ใช้ และการลงชื่อเข้าใช้
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">ตัวกรอง</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="audit-action">
              ประเภทเหตุการณ์
            </label>
            <select
              id="audit-action"
              name="action"
              defaultValue={actionFilter ?? 'ALL'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">ทั้งหมด</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="audit-school">
              โรงเรียน
            </label>
            <select
              id="audit-school"
              name="schoolId"
              defaultValue={schoolFilter ? schoolFilter.toString() : 'ALL'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">ทั้งหมด</option>
              {schools.map((school) => (
                <option key={school.id.toString()} value={school.sc_id.toString()}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="audit-limit">
              จำนวนรายการ
            </label>
            <input
              id="audit-limit"
              name="limit"
              type="number"
              min={10}
              max={500}
              defaultValue={limit}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-5 flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              ใช้ตัวกรอง
            </button>
            <a
              href="/admin/audit"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ล้างตัวกรอง
            </a>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">วันที่/เวลา</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">เหตุการณ์</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ผู้กระทำ</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">โรงเรียน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id.toString()} className="align-top">
                  <td className="px-4 py-3 text-slate-600">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {log.action}
                    </span>
                    <div className="text-xs text-slate-500">{log.targetTable}</div>
                  </td>
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <div>
                        <p className="font-medium text-slate-900">{log.actor.fullName}</p>
                        <p className="text-xs text-slate-500">{log.actor.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">ระบบ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.school ? (
                      <div>
                        <p className="text-sm text-slate-800">{log.school.name}</p>
                        <p className="text-xs text-slate-500">SC_ID: {log.school.sc_id.toString()}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.payload ? (
                      <pre className="max-w-xl whitespace-pre-wrap rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    ไม่พบข้อมูลการบันทึกเหตุการณ์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


