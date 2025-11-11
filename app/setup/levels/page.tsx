import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function LevelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const levels = await prisma.eduLevel.findMany({
    orderBy: { id: 'asc' },
  });

  const latestAction = typeof params?.success === 'string' ? params?.success : undefined;
  const errorMessage = typeof params?.error === 'string' ? params?.error : undefined;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการระดับการศึกษา</h1>
        <p className="text-sm text-slate-600">
          เพิ่ม แก้ไข หรือลบข้อมูลระดับการศึกษา (เช่น ปฐมวัย, ขั้นพื้นฐาน)
        </p>
      </header>

      {latestAction ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {latestAction === 'created' && 'บันทึกระดับการศึกษาใหม่สำเร็จ'}
          {latestAction === 'updated' && 'อัปเดตข้อมูลสำเร็จ'}
          {latestAction === 'deleted' && 'ลบข้อมูลสำเร็จ'}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มระดับการศึกษาใหม่</h2>
        <form action="/api/setup/levels" method="post" className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-2">
            <label htmlFor="level-code" className="text-sm font-medium text-slate-700">
              รหัสระดับ
            </label>
            <input
              id="level-code"
              name="code"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="level-name" className="text-sm font-medium text-slate-700">
              ชื่อ (ภาษาไทย)
            </label>
            <input
              id="level-name"
              name="nameTh"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-900">รายการระดับการศึกษา</h2>
        <div className="space-y-3">
          {levels.map((level) => (
            <div
              key={level.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">รหัส</p>
                  <code className="rounded bg-slate-100 px-2 py-1 text-sm">{level.code}</code>
                </div>
                <form action="/api/setup/levels" method="post" className="flex gap-2">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={level.id.toString()} />
                  <Button type="submit" size="sm" variant="destructive">
                    ลบ
                  </Button>
                </form>
              </div>
              <form
                action="/api/setup/levels"
                method="post"
                className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3"
              >
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={level.id.toString()} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600" htmlFor={`code-${level.id.toString()}`}>
                    รหัสระดับ
                  </label>
                  <input
                    id={`code-${level.id.toString()}`}
                    name="code"
                    defaultValue={level.code}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-600" htmlFor={`name-${level.id.toString()}`}>
                    ชื่อภาษาไทย
                  </label>
                  <input
                    id={`name-${level.id.toString()}`}
                    name="nameTh"
                    defaultValue={level.nameTh}
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Button type="submit" size="sm">
                    อัปเดต
                  </Button>
                </div>
              </form>
            </div>
          ))}
          {levels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              ยังไม่มีข้อมูลระดับการศึกษา
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}


