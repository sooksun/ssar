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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [users, roles, schools] = await Promise.all([
    prisma.user.findMany({
      where: { del: false },
      orderBy: { fullName: 'asc' },
      include: {
        primarySchool: true,
        schoolRoles: {
          where: { isActive: true },
          include: {
            role: true,
            school: true,
          },
        },
      },
    }),
    prisma.role.findMany({ orderBy: { code: 'asc' } }),
    prisma.school.findMany({
      where: { del: false },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { success, error } = getMessage(params);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการผู้ใช้</h1>
        <p className="text-sm text-slate-600">
          เพิ่มผู้ใช้ใหม่ กำหนดโรงเรียนหลัก และจัดการบทบาทตามโรงเรียน
        </p>
      </header>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success === 'created' && 'เพิ่มผู้ใช้ใหม่สำเร็จ'}
          {success === 'updated' && 'อัปเดตข้อมูลผู้ใช้สำเร็จ'}
          {success === 'deleted' && 'ปิดใช้งานผู้ใช้สำเร็จ'}
          {success === 'role-assigned' && 'กำหนดบทบาทให้ผู้ใช้สำเร็จ'}
          {success === 'role-removed' && 'ลบบทบาทผู้ใช้ออกจากโรงเรียนสำเร็จ'}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">เพิ่มผู้ใช้ใหม่</h2>
        <form action="/api/admin/users" method="post" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-fullname">
              ชื่อ-นามสกุล
            </label>
            <input
              id="user-fullname"
              name="fullName"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-email">
              อีเมล
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-password">
              รหัสผ่านเริ่มต้น
            </label>
            <input
              id="user-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-phone">
              เบอร์ติดต่อ (ถ้ามี)
            </label>
            <input
              id="user-phone"
              name="phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-primary-school">
              โรงเรียนหลัก (สำหรับบัญชี)
            </label>
            <select
              id="user-primary-school"
              name="primarySchoolId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
              {schools.map((school) => (
                <option key={school.id.toString()} value={school.sc_id.toString()}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-role">
              บทบาทเริ่มต้น
            </label>
            <select
              id="user-role"
              name="roleId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- เลือกบทบาท (เลือกภายหลังได้) --</option>
              {roles.map((role) => (
                <option key={role.id.toString()} value={role.id.toString()}>
                  {role.code} — {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="user-assigned-school">
              โรงเรียนสำหรับบทบาทนี้
            </label>
            <select
              id="user-assigned-school"
              name="assignedSchoolId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- เลือกโรงเรียน (ถ้ามี) --</option>
              {schools.map((school) => (
                <option key={school.id.toString()} value={school.sc_id.toString()}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit">บันทึก</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">รายการผู้ใช้</h2>
        {users.map((user) => (
          <div
            key={user.id.toString()}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-sm text-slate-600">{user.email}</p>
                <div className="mt-1 text-xs text-slate-500">
                  {user.primarySchool ? (
                    <span>โรงเรียนหลัก: {user.primarySchool.name}</span>
                  ) : (
                    <span>ยังไม่กำหนดโรงเรียนหลัก</span>
                  )}
                </div>
              </div>
              <form action="/api/admin/users" method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={user.id.toString()} />
                <Button type="submit" size="sm" variant="destructive">
                  ปิดใช้งาน
                </Button>
              </form>
            </div>

            <form action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="id" value={user.id.toString()} />
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600" htmlFor={`user-fullname-${user.id.toString()}`}>
                  ชื่อ-นามสกุล
                </label>
                <input
                  id={`user-fullname-${user.id.toString()}`}
                  name="fullName"
                  defaultValue={user.fullName}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={`user-phone-${user.id.toString()}`}>
                  เบอร์ติดต่อ
                </label>
                <input
                  id={`user-phone-${user.id.toString()}`}
                  name="phone"
                  defaultValue={user.phone ?? ''}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`user-primary-school-${user.id.toString()}`}
                >
                  โรงเรียนหลัก
                </label>
                <select
                  id={`user-primary-school-${user.id.toString()}`}
                  name="primarySchoolId"
                  defaultValue={user.schoolId ? user.schoolId.toString() : ''}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">-- ไม่กำหนด --</option>
                  {schools.map((school) => (
                    <option key={school.id.toString()} value={school.sc_id.toString()}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-slate-600"
                  htmlFor={`user-new-password-${user.id.toString()}`}
                >
                  เปลี่ยนรหัสผ่าน (ใส่เมื่อต้องการเปลี่ยน)
                </label>
                <input
                  id={`user-new-password-${user.id.toString()}`}
                  name="newPassword"
                  type="password"
                  minLength={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-5">
                <Button type="submit" size="sm">
                  อัปเดตข้อมูลผู้ใช้
                </Button>
              </div>
            </form>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-800">บทบาทในโรงเรียน</h3>
              <div className="mt-3 space-y-2">
                {user.schoolRoles.length > 0 ? (
                  user.schoolRoles.map((mapping) => (
                    <div
                      key={mapping.id.toString()}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold">{mapping.role.code}</span> — {mapping.role.name}{' '}
                        <span className="text-slate-500">({mapping.school.name})</span>
                      </div>
                      <form action="/api/admin/users" method="post">
                        <input type="hidden" name="intent" value="remove-role" />
                        <input type="hidden" name="userSchoolRoleId" value={mapping.id.toString()} />
                        <Button type="submit" size="sm" variant="destructive">
                          ลบ
                        </Button>
                      </form>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">ยังไม่มีบทบาทในโรงเรียน</p>
                )}
              </div>

              <form action="/api/admin/users" method="post" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="intent" value="assign-role" />
                <input type="hidden" name="userId" value={user.id.toString()} />
                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="text-xs font-medium text-slate-600" htmlFor={`assign-school-${user.id.toString()}`}>
                    โรงเรียน
                  </label>
                  <select
                    id={`assign-school-${user.id.toString()}`}
                    name="schoolId"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>
                      -- เลือกโรงเรียน --
                    </option>
                    {schools.map((school) => (
                      <option key={school.id.toString()} value={school.sc_id.toString()}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label className="text-xs font-medium text-slate-600" htmlFor={`assign-role-${user.id.toString()}`}>
                    บทบาท
                  </label>
                  <select
                    id={`assign-role-${user.id.toString()}`}
                    name="roleId"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>
                      -- เลือกบทบาท --
                    </option>
                    {roles.map((role) => (
                      <option key={role.id.toString()} value={role.id.toString()}>
                        {role.code} — {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <Button type="submit" size="sm" variant="secondary">
                    เพิ่มบทบาทให้ผู้ใช้
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ))}
        {users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีผู้ใช้ในระบบ
          </div>
        ) : null}
      </section>
    </div>
  );
}


