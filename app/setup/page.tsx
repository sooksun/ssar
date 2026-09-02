import { requireRoles } from '@/lib/auth/guards';
import Link from 'next/link';

const setupLinks = [
  {
    href: '/setup/levels',
    title: 'ระดับการศึกษา',
    description: 'จัดการระดับหลัก (เช่น ปฐมวัย, ขั้นพื้นฐาน)',
  },
  {
    href: '/setup/standards',
    title: 'มาตรฐาน',
    description: 'เพิ่ม/แก้ไขมาตรฐานตามระดับการศึกษา',
  },
  {
    href: '/setup/indicators',
    title: 'ตัวชี้วัด',
    description: 'บริหารตัวชี้วัดและคำอธิบายแต่ละข้อ',
  },
  {
    href: '/setup/subs',
    title: 'ตัวชี้วัดย่อย',
    description: 'กำหนดตัวชี้วัดย่อยและลำดับข้อ (Item No)',
  },
];

export default async function SetupIndexPage() {
  const session = await requireRoles(['ADMIN', 'QA_LEAD']);
  const roles = session?.user.roles ?? [];
  const allowedRoles = new Set(['ADMIN', 'QA_LEAD']);
  const hasPermission = roles.some((role) => allowedRoles.has(role.role));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">ศูนย์ตั้งค่าระบบ QA</h1>
        <p className="text-sm text-slate-600">
          เลือกหมวดหมู่ที่ต้องการแก้ไขข้อมูลพื้นฐานสำหรับการประเมินคุณภาพการศึกษา
        </p>
      </header>

      {!hasPermission ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          คุณไม่มีสิทธิ์เข้าถึงเมนูนี้ (เฉพาะ ADMIN และ QA_LEAD)
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {setupLinks.map((item) => (
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


