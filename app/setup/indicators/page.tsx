import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function getMessage(params: SearchParams | undefined) {
  const success = typeof params?.success === 'string' ? params.success : undefined;
  const error = typeof params?.error === 'string' ? params.error : undefined;
  return { success, error };
}

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [standards, indicators] = await Promise.all([
    prisma.qAStandard.findMany({
      include: { level: true },
      orderBy: [{ levelId: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
    }),
    prisma.qAIndicator.findMany({
      include: {
        standard: {
          include: {
            level: true,
          },
        },
      },
      orderBy: [{ standard: { levelId: 'asc' } }, { standard: { sortNo: 'asc' } }, { sortNo: 'asc' }],
    }),
  ]);

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการตัวชี้วัด</h1>
        <p className="text-sm text-slate-600">
          เพิ่มหรืออัปเดตตัวชี้วัด พร้อมคำอธิบาย และผูกกับมาตรฐานที่เกี่ยวข้อง
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มตัวชี้วัดใหม่สำเร็จ'}
          {success === 'updated' && 'อัปเดตตัวชี้วัดสำเร็จ'}
          {success === 'deleted' && 'ลบตัวชี้วัดสำเร็จ'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มตัวชี้วัดใหม่</h2>
        <form action="/api/setup/indicators" method="post" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="indicator-standard">
              มาตรฐาน
            </label>
            <select
              id="indicator-standard"
              name="standardId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="" disabled>
                -- เลือกมาตรฐาน --
              </option>
              {standards.map((standard) => (
                <option key={standard.id.toString()} value={standard.id.toString()}>
                  {standard.level.code}-{standard.code} — {standard.nameTh}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="indicator-code">
              รหัสตัวชี้วัด
            </label>
            <input
              id="indicator-code"
              name="code"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-slate-600" htmlFor="indicator-name">
              ชื่อตัวชี้วัด (ภาษาไทย)
            </label>
            <input
              id="indicator-name"
              name="nameTh"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-4">
            <label className="text-xs font-medium text-slate-600" htmlFor="indicator-desc">
              คำอธิบายเพิ่มเติม
            </label>
            <textarea
              id="indicator-desc"
              name="descriptionTh"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="indicator-sort">
              ลำดับ (Sort No)
            </label>
            <input
              id="indicator-sort"
              name="sortNo"
              type="number"
              min={1}
              defaultValue={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">รายการตัวชี้วัด</h2>
        {indicators.map((indicator) => (
          <div
            key={indicator.id.toString()}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">มาตรฐาน</p>
                <p className="text-sm font-medium text-slate-800">
                  {indicator.standard.level.code}-{indicator.standard.code} — {indicator.standard.nameTh}
                </p>
              </div>
              <form action="/api/setup/indicators" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={indicator.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ลบ
                </Button>
              </form>
            </div>
            <form
              action="/api/setup/indicators"
              method="post"
              className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6"
            >
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={indicator.id.toString()} />
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`indicator-standard-${indicator.id.toString()}`}
                >
                  มาตรฐาน
                </label>
                <select
                  id={`indicator-standard-${indicator.id.toString()}`}
                  name="standardId"
                  defaultValue={indicator.standardId.toString()}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {standards.map((standard) => (
                    <option key={standard.id.toString()} value={standard.id.toString()}>
                      {standard.level.code}-{standard.code} — {standard.nameTh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`indicator-code-${indicator.id.toString()}`}>
                  รหัส
                </label>
                <input
                  id={`indicator-code-${indicator.id.toString()}`}
                  name="code"
                  defaultValue={indicator.code}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-slate-600" htmlFor={`indicator-name-${indicator.id.toString()}`}>
                  ชื่อตัวชี้วัด (ภาษาไทย)
                </label>
                <input
                  id={`indicator-name-${indicator.id.toString()}`}
                  name="nameTh"
                  defaultValue={indicator.nameTh}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-6">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`indicator-desc-${indicator.id.toString()}`}
                >
                  คำอธิบายเพิ่มเติม
                </label>
                <textarea
                  id={`indicator-desc-${indicator.id.toString()}`}
                  name="descriptionTh"
                  defaultValue={indicator.descriptionTh ?? ''}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`indicator-sort-${indicator.id.toString()}`}>
                  ลำดับ (Sort No)
                </label>
                <input
                  id={`indicator-sort-${indicator.id.toString()}`}
                  name="sortNo"
                  type="number"
                  min={1}
                  defaultValue={indicator.sortNo ?? 1}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-6">
                <Button type="submit" size="sm">
                  อัปเดต
                </Button>
              </div>
            </form>
          </div>
        ))}
        {indicators.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลตัวชี้วัด
          </div>
        ) : null}
      </section>
    </div>
  );
}


