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

export default async function StandardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRoles(['ADMIN', 'QA_LEAD']);

  const params = await searchParams;
  const [levels, standards] = await Promise.all([
    prisma.eduLevel.findMany({ orderBy: { id: 'asc' } }),
    prisma.qAStandard.findMany({
      include: { level: true },
      orderBy: [{ levelId: 'asc' }, { sortNo: 'asc' }, { code: 'asc' }],
    }),
  ]);

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการมาตรฐาน</h1>
        <p className="text-sm text-slate-600">
          กำหนดมาตรฐานตามระดับการศึกษา พร้อมลำดับการแสดงผล (sort no)
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มมาตรฐานใหม่สำเร็จ'}
          {success === 'updated' && 'อัปเดตมาตรฐานสำเร็จ'}
          {success === 'deleted' && 'ลบมาตรฐานสำเร็จ'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มมาตรฐานใหม่</h2>
        <form action="/api/setup/standards" method="post" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="standard-level">
              ระดับการศึกษา
            </label>
            <select
              id="standard-level"
              name="levelId"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              defaultValue=""
            >
              <option value="" disabled>
                -- เลือกระดับ --
              </option>
              {levels.map((level) => (
                <option key={level.id} value={level.id.toString()}>
                  {level.code} — {level.nameTh}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="standard-code">
              รหัสมาตรฐาน
            </label>
            <input
              id="standard-code"
              name="code"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="standard-name">
              ชื่อมาตรฐาน (ภาษาไทย)
            </label>
            <input
              id="standard-name"
              name="nameTh"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="standard-sort">
              ลำดับ (Sort No)
            </label>
            <input
              id="standard-sort"
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
        <h2 className="text-lg font-medium text-slate-900">รายการมาตรฐาน</h2>
        {standards.map((standard) => (
          <div
            key={standard.id.toString()}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">ระดับการศึกษา</p>
                <p className="text-sm font-medium text-slate-800">
                  {standard.level.code} — {standard.level.nameTh}
                </p>
              </div>
              <form action="/api/setup/standards" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={standard.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ลบ
                </Button>
              </form>
            </div>
            <form
              action="/api/setup/standards"
              method="post"
              className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"
            >
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={standard.id.toString()} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`level-${standard.id.toString()}`}>
                  ระดับการศึกษา
                </label>
                <select
                  id={`level-${standard.id.toString()}`}
                  name="levelId"
                  defaultValue={standard.levelId.toString()}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {levels.map((level) => (
                    <option key={level.id} value={level.id.toString()}>
                      {level.code} — {level.nameTh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`code-${standard.id.toString()}`}>
                  รหัสมาตรฐาน
                </label>
                <input
                  id={`code-${standard.id.toString()}`}
                  name="code"
                  defaultValue={standard.code}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600" htmlFor={`name-${standard.id.toString()}`}>
                  ชื่อมาตรฐาน (ภาษาไทย)
                </label>
                <input
                  id={`name-${standard.id.toString()}`}
                  name="nameTh"
                  defaultValue={standard.nameTh}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`sort-${standard.id.toString()}`}>
                  ลำดับ (Sort No)
                </label>
                <input
                  id={`sort-${standard.id.toString()}`}
                  name="sortNo"
                  type="number"
                  min={1}
                  defaultValue={standard.sortNo || 1}
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
        {standards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลมาตรฐาน
          </div>
        ) : null}
      </section>
    </div>
  );
}


