import { requireRoles } from '@/lib/auth/guards';
import Link from 'next/link';

const adminLinks = [
  {
    href: '/admin/users',
    title: 'ผู้ใช้',
    description: 'จัดการบัญชีผู้ใช้ กำหนดโรงเรียนหลักและบทบาท',
  },
  {
    href: '/admin/school-roles',
    title: 'บทบาทในโรงเรียน (UserSchoolRole)',
    description: 'ดู/กำหนดว่าใครมีบทบาทใดในโรงเรียนใด',
  },
  {
    href: '/admin/roles',
    title: 'บทบาท',
    description: 'สร้าง/แก้ไขบทบาทสำหรับควบคุมสิทธิ์',
  },
  {
    href: '/admin/schools',
    title: 'โรงเรียน',
    description: 'เพิ่มโรงเรียนใหม่หรืออัปเดตข้อมูลโรงเรียน',
  },
  {
    href: '/admin/audit',
    title: 'Audit Log',
    description: 'ตรวจสอบประวัติกิจกรรมสำคัญในระบบ',
  },
];

export default async function AdminIndexPage() {
  const session = await requireRoles(['ADMIN']);
  const roles = session?.user.roles ?? [];
  const isAdmin = roles.some((role) => role.role === 'ADMIN');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">ศูนย์การจัดการผู้ดูแลระบบ</h1>
        <p className="text-sm text-slate-600">
          เลือกหัวข้อเพื่อจัดการผู้ใช้ บทบาท โรงเรียน และตรวจสอบบันทึกเหตุการณ์
        </p>
      </header>

      {!isAdmin ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ (เฉพาะ ADMIN)
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <h2 className="text-lg font-medium text-slate-900 group-hover:text-primary">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


