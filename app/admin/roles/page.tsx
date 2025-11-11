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

export default async function RolesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const roles = await prisma.role.findMany({
    orderBy: { code: 'asc' },
  });

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการบทบาท (Roles)</h1>
        <p className="text-sm text-slate-600">
          เพิ่มหรือตั้งชื่อบทบาทสำหรับกำหนดสิทธิ์การเข้าถึงระบบ
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มบทบาทใหม่สำเร็จ'}
          {success === 'updated' && 'อัปเดตบทบาทสำเร็จ'}
          {success === 'deleted' && 'ลบบทบาทสำเร็จ'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มบทบาทใหม่</h2>
        <form action="/api/admin/roles" method="post" className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="role-code">
              รหัสบทบาท (ตัวพิมพ์ใหญ่)
            </label>
            <input
              id="role-code"
              name="code"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="role-name">
              ชื่อบทบาท
            </label>
            <input
              id="role-name"
              name="name"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">รายการบทบาท</h2>
        {roles.map((role) => (
          <div
            key={role.id.toString()}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">รหัสบทบาท</p>
                <code className="rounded bg-slate-100 px-2 py-1 text-sm">{role.code}</code>
              </div>
              <form action="/api/admin/roles" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={role.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ลบ
                </Button>
              </form>
            </div>
            <form action="/api/admin/roles" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={role.id.toString()} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`role-code-${role.id.toString()}`}>
                  รหัสบทบาท
                </label>
                <input
                  id={`role-code-${role.id.toString()}`}
                  name="code"
                  defaultValue={role.code}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`role-name-${role.id.toString()}`}>
                  ชื่อบทบาท
                </label>
                <input
                  id={`role-name-${role.id.toString()}`}
                  name="name"
                  defaultValue={role.name}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" size="sm">
                  อัปเดต
                </Button>
              </div>
            </form>
          </div>
        ))}
        {roles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลบทบาท
          </div>
        ) : null}
      </section>
    </div>
  );
}


