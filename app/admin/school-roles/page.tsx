import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SearchParams = { [key: string]: string | string[] | undefined };

function getMessage(params: SearchParams | undefined) {
  const success = typeof params?.success === 'string' ? params.success : undefined;
  const error = typeof params?.error === 'string' ? params.error : undefined;
  return { success, error };
}

export default async function SchoolRolesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const roles = session.user.roles ?? [];
  if (!roles.some((r: { role?: string }) => r.role === 'ADMIN')) {
    redirect('/admin');
  }

  const params = await searchParams;
  const filterSchoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const filterUserId = typeof params.userId === 'string' ? params.userId : '';

  const [mappings, schools, users, roleList] = await Promise.all([
    prisma.userSchoolRole.findMany({
      where: {
        isActive: true,
        ...(filterSchoolId ? { schoolId: BigInt(filterSchoolId) } : {}),
        ...(filterUserId ? { userId: BigInt(filterUserId) } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        school: { select: { sc_id: true, name: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ schoolId: 'asc' }, { userId: 'asc' }, { roleId: 'asc' }],
    }),
    prisma.school.findMany({
      where: { del: false },
      orderBy: { name: 'asc' },
      select: { sc_id: true, name: true },
    }),
    prisma.user.findMany({
      where: { del: false },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.role.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">จัดการบทบาทผู้ใช้ในโรงเรียน (UserSchoolRole)</h1>
          <p className="text-sm text-slate-600 mt-1">
            ดูและกำหนดว่าใครมีบทบาทใดในโรงเรียนใด
          </p>
        </div>
        <Link href="/admin" className="text-sm text-primary hover:underline">← กลับไปศูนย์แอดมิน</Link>
      </header>

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'role-assigned' && 'กำหนดบทบาทให้ผู้ใช้สำเร็จ'}
          {success === 'role-removed' && 'ลบบทบาทออกจากโรงเรียนสำเร็จ'}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900 mb-4">กรอง</h2>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">โรงเรียน</label>
            <select
              name="schoolId"
              defaultValue={filterSchoolId}
              className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- ทั้งหมด --</option>
              {schools.map((s) => (
                <option key={s.sc_id.toString()} value={s.sc_id.toString()}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">ผู้ใช้</label>
            <select
              name="userId"
              defaultValue={filterUserId}
              className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- ทั้งหมด --</option>
              {users.map((u) => (
                <option key={u.id.toString()} value={u.id.toString()}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">กรอง</Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900 mb-4">เพิ่มบทบาท (ผู้ใช้ + โรงเรียน + บทบาท)</h2>
        <form action="/api/admin/school-roles" method="post" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="assign-role" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">ผู้ใช้</label>
            <select
              name="userId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>-- เลือกผู้ใช้ --</option>
              {users.map((u) => (
                <option key={u.id.toString()} value={u.id.toString()}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">โรงเรียน</label>
            <select
              name="schoolId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>-- เลือกโรงเรียน --</option>
              {schools.map((s) => (
                <option key={s.sc_id.toString()} value={s.sc_id.toString()}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">บทบาท</label>
            <select
              name="roleId"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>-- เลือกบทบาท --</option>
              {roleList.map((r) => (
                <option key={r.id.toString()} value={r.id.toString()}>{r.code} — {r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">เพิ่มบทบาท</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900 mb-4">รายการบทบาทในโรงเรียน ({mappings.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-medium text-slate-700">ผู้ใช้</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">โรงเรียน</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">บทบาท</th>
                <th className="px-3 py-2 w-24">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id.toString()} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <span className="font-medium">{m.user.fullName}</span>
                    <span className="text-slate-500 text-xs block">{m.user.email}</span>
                  </td>
                  <td className="px-3 py-2">{m.school.name}</td>
                  <td className="px-3 py-2">{m.role.code} — {m.role.name}</td>
                  <td className="px-3 py-2">
                    <form action="/api/admin/school-roles" method="post" className="inline">
                      <input type="hidden" name="intent" value="remove-role" />
                      <input type="hidden" name="userSchoolRoleId" value={m.id.toString()} />
                      <Button type="submit" size="sm" variant="destructive">ลบ</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mappings.length === 0 && (
          <p className="text-slate-500 text-sm py-4 text-center">ยังไม่มีรายการบทบาทในโรงเรียน</p>
        )}
      </section>
    </div>
  );
}
