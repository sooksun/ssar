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

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRoles(['ADMIN']);

  const params = await searchParams;
  const schools = await prisma.school.findMany({
    where: { del: false },
    orderBy: [{ province: 'asc' }, { name: 'asc' }],
  });

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการข้อมูลโรงเรียน</h1>
        <p className="text-sm text-slate-600">
          ลงทะเบียนโรงเรียนใหม่ หรืออัปเดตข้อมูลโรงเรียนที่มีอยู่ในระบบ
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มโรงเรียนใหม่สำเร็จ'}
          {success === 'updated' && 'อัปเดตข้อมูลโรงเรียนสำเร็จ'}
          {success === 'deleted' && 'ปิดการใช้งานโรงเรียนสำเร็จ'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มโรงเรียนใหม่</h2>
        <form action="/api/admin/schools" method="post" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="school-scid">
              รหัสโรงเรียน (SC_ID)
            </label>
            <input
              id="school-scid"
              name="scId"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="school-name">
              ชื่อโรงเรียน
            </label>
            <input
              id="school-name"
              name="name"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="school-area">
              เขตพื้นที่/เครือข่าย
            </label>
            <input
              id="school-area"
              name="areaName"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="school-province">
              จังหวัด
            </label>
            <input
              id="school-province"
              name="province"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="school-level-type">
              ระดับ (เช่น BASIC/EARLY_CHILDHOOD)
            </label>
            <input
              id="school-level-type"
              name="levelType"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">รายการโรงเรียน</h2>
        {schools.map((school) => (
          <div
            key={school.id.toString()}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">รหัสโรงเรียน</p>
                <code className="rounded bg-slate-100 px-2 py-1 text-sm">{school.sc_id.toString()}</code>
              </div>
              <form action="/api/admin/schools" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={school.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ปิดใช้งาน
                </Button>
              </form>
            </div>
            <form action="/api/admin/schools" method="post" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={school.id.toString()} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`school-scid-${school.id.toString()}`}>
                  รหัสโรงเรียน (SC_ID)
                </label>
                <input
                  id={`school-scid-${school.id.toString()}`}
                  name="scId"
                  defaultValue={school.sc_id.toString()}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600" htmlFor={`school-name-${school.id.toString()}`}>
                  ชื่อโรงเรียน
                </label>
                <input
                  id={`school-name-${school.id.toString()}`}
                  name="name"
                  defaultValue={school.name}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`school-area-${school.id.toString()}`}>
                  เขตพื้นที่/เครือข่าย
                </label>
                <input
                  id={`school-area-${school.id.toString()}`}
                  name="areaName"
                  defaultValue={school.area_name ?? ''}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`school-province-${school.id.toString()}`}
                >
                  จังหวัด
                </label>
                <input
                  id={`school-province-${school.id.toString()}`}
                  name="province"
                  defaultValue={school.province ?? ''}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`school-level-type-${school.id.toString()}`}
                >
                  ระดับ (Level Type)
                </label>
                <input
                  id={`school-level-type-${school.id.toString()}`}
                  name="levelType"
                  defaultValue={school.level_type ?? ''}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        {schools.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลโรงเรียนในระบบ
          </div>
        ) : null}
      </section>
    </div>
  );
}


