import { Button } from '@/components/ui/button';
import { requireRoles } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function getMessage(params: SearchParams | undefined) {
  const success = typeof params?.success === 'string' ? params.success : undefined;
  const error = typeof params?.error === 'string' ? params.error : undefined;
  return { success, error };
}

export default async function SubIndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRoles(['ADMIN', 'QA_LEAD']);

  const params = await searchParams;
  const [indicators, subIndicators] = await Promise.all([
    prisma.qAIndicator.findMany({
      include: { standard: { include: { level: true } } },
      orderBy: [
        { standard: { levelId: 'asc' } },
        { standard: { sortNo: 'asc' } },
        { sortNo: 'asc' },
        { code: 'asc' },
      ],
    }),
    prisma.qASubIndicator.findMany({
      include: {
        indicator: {
          include: {
            standard: {
              include: { level: true },
            },
          },
        },
      },
      orderBy: [{ indicator: { standard: { levelId: 'asc' } } }, { indicator: { code: 'asc' } }, { itemNo: 'asc' }],
    }),
  ]);

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการตัวชี้วัดย่อย</h1>
        <p className="text-sm text-slate-600">
          เพิ่มหรืออัปเดตตัวชี้วัดย่อยตามตัวชี้วัดหลัก พร้อมลำดับข้อ (item no)
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มตัวชี้วัดย่อยสำเร็จ'}
          {success === 'updated' && 'อัปเดตตัวชี้วัดย่อยสำเร็จ'}
          {success === 'deleted' && 'ลบตัวชี้วัดย่อยสำเร็จ'}
          {success === 'csv-imported' && `นำเข้า CSV สำเร็จ (เพิ่ม ${params.created ?? '0'} รายการ)`}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">นำเข้า CSV (Bulk upload)</h2>
        <p className="mt-1 text-sm text-slate-600">
          รูปแบบ: indicatorId,itemNo,textTh (บรรทัดแรกเป็น header ได้ เช่น indicatorId,itemNo,textTh)
        </p>
        <form action="/api/setup/subs/import" method="post" encType="multipart/form-data" className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="csv-file">
              เลือกไฟล์ CSV
            </label>
            <input
              id="csv-file"
              name="file"
              type="file"
              accept=".csv,.txt"
              required
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <Button type="submit" variant="secondary">นำเข้า CSV</Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มตัวชี้วัดย่อยใหม่</h2>
        <form action="/api/setup/subs" method="post" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="sub-indicator-parent">
              ตัวชี้วัดหลัก
            </label>
            <select
              id="sub-indicator-parent"
              name="indicatorId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="" disabled>
                -- เลือกตัวชี้วัด --
              </option>
              {indicators.map((indicator) => (
                <option key={indicator.id.toString()} value={indicator.id.toString()}>
                  {indicator.standard.level.code}-{indicator.standard.code}-{indicator.code} — {indicator.nameTh}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="sub-indicator-item">
              เลขข้อ (Item No)
            </label>
            <input
              id="sub-indicator-item"
              name="itemNo"
              type="number"
              min={1}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-4">
            <label className="text-xs font-medium text-slate-600" htmlFor="sub-indicator-text">
              ข้อความ (ภาษาไทย)
            </label>
            <textarea
              id="sub-indicator-text"
              name="textTh"
              rows={3}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">รายการตัวชี้วัดย่อย</h2>
        {subIndicators.map((sub) => (
          <div
            key={sub.id.toString()}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">ตัวชี้วัดหลัก</p>
                <p className="text-sm font-medium text-slate-800">
                  {sub.indicator.standard.level.code}-{sub.indicator.standard.code}-{sub.indicator.code} —{' '}
                  {sub.indicator.nameTh}
                </p>
              </div>
              <form action="/api/setup/subs" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={sub.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ลบ
                </Button>
              </form>
            </div>
            <form action="/api/setup/subs" method="post" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={sub.id.toString()} />
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`sub-parent-${sub.id.toString()}`}
                >
                  ตัวชี้วัดหลัก
                </label>
                <select
                  id={`sub-parent-${sub.id.toString()}`}
                  name="indicatorId"
                  defaultValue={sub.indicatorId.toString()}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {indicators.map((indicator) => (
                    <option key={indicator.id.toString()} value={indicator.id.toString()}>
                      {indicator.standard.level.code}-{indicator.standard.code}-{indicator.code} — {indicator.nameTh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`sub-item-${sub.id.toString()}`}>
                  เลขข้อ (Item No)
                </label>
                <input
                  id={`sub-item-${sub.id.toString()}`}
                  name="itemNo"
                  type="number"
                  min={1}
                  defaultValue={sub.itemNo}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-5">
                <label className="text-xs font-medium text-slate-600" htmlFor={`sub-text-${sub.id.toString()}`}>
                  ข้อความ (ภาษาไทย)
                </label>
                <textarea
                  id={`sub-text-${sub.id.toString()}`}
                  name="textTh"
                  rows={3}
                  defaultValue={sub.textTh}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-5">
                <Button type="submit" size="sm">
                  อัปเดต
                </Button>
              </div>
            </form>
          </div>
        ))}
        {subIndicators.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลตัวชี้วัดย่อย
          </div>
        ) : null}
      </section>
    </div>
  );
}


