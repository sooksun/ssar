import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';

// ข้อมูลโปรแกรมเสริม (สามารถดึงจาก database หรือ config file ได้ในอนาคต)
type ExtraProgramCard = {
  title: string;
  description: string;
  href: string;
  gradient: string;
  border: string;
  text: string;
  iconSrc: string;
  iconAlt: string;
  comingSoon?: boolean;
  submenu?: { label: string; href: string }[];
};
const extraPrograms: ExtraProgramCard[] = [
  {
    title: 'บันทึกทะเบียนคุมสื่อการสอน',
    description: 'ระบบบันทึกและจัดการทะเบียนคุมสื่อการสอน',
    href: '/teaching-media',
    gradient: 'from-violet-50 via-white to-white',
    border: 'border-violet-200',
    text: 'text-violet-700',
    iconSrc: '/icon_media.png',
    iconAlt: 'ไอคอนสื่อการสอน',
  },
  {
    title: 'บันทึกแผนการสอน',
    description: 'ระบบบันทึกและจัดการแผนการสอน',
    href: '/lesson-plans',
    gradient: 'from-sky-50 via-white to-white',
    border: 'border-sky-200',
    text: 'text-sky-700',
    iconSrc: '/icon_plan.png',
    iconAlt: 'ไอคอนแผนการสอน',
    submenu: [
      { label: 'รายการแผนการสอน', href: '/lesson-plans' },
      { label: 'เพิ่มแผนการสอน', href: '/lesson-plans/new' },
    ],
  },
  {
    title: 'บันทึกโครงการ',
    description: 'รายงานโครงการ สรุปการดำเนินโครงการ (PDF + ลายเซ็นอิเล็กทรอนิกส์) อ้างอิงนโยบาย สพฐ และตัวชี้วัด QA・PA',
    href: '/projects',
    gradient: 'from-amber-50 via-white to-white',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconSrc: '/icon_plan.png',
    iconAlt: 'ไอคอนโครงการ',
    submenu: [
      { label: 'รายการโครงการ', href: '/projects' },
      { label: 'เพิ่มโครงการ', href: '/projects/new' },
    ],
  },
  {
    title: 'การประเมิน PA',
    description: 'การประเมินผลการพัฒนางานตามข้อตกลง (PA)',
    href: '/pa',
    gradient: 'from-teal-50 via-white to-white',
    border: 'border-teal-200',
    text: 'text-teal-700',
    iconSrc: '/icon_plan.png',
    iconAlt: 'ไอคอน PA',
  },
  {
    title: 'SAR ครู และ ID plan ของครู',
    description: 'ส่ง SAR ครู และบันทึกรหัสแผน (ID plan) ต่อคน ต่อโรงเรียน ต่อปีการศึกษา',
    href: '/extra-programs/teacher',
    gradient: 'from-emerald-50 via-white to-white',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconSrc: '/icon_plan.png',
    iconAlt: 'ไอคอน SAR / ID plan',
  },
  {
    title: 'บันทึกการสอนชุมชน',
    description: 'ภาคเรียนละไม่เกิน 1 ฉบับต่อคน — กรอกตาม template (pp5.pdf) แนบไฟล์หรือลิงก์',
    href: '/extra-programs/community-teaching',
    gradient: 'from-rose-50 via-white to-white',
    border: 'border-rose-200',
    text: 'text-rose-700',
    iconSrc: '/icon_plan.png',
    iconAlt: 'ไอคอนการสอนชุมชน',
  },
  {
    title: 'บันทึกการนิเทศ',
    description: 'ระบบบันทึกและจัดการการนิเทศภายใน',
    href: '#',
    gradient: 'from-purple-50 via-white to-white',
    border: 'border-purple-200',
    text: 'text-purple-700',
    iconSrc: '/icon_supervision.png',
    iconAlt: 'ไอคอนการนิเทศ',
    comingSoon: true,
  },
  {
    title: 'บันทึกการลงเวลามาปฏิบัติราชการ',
    description: 'ระบบบันทึกการลงเวลามาปฏิบัติราชการ',
    href: '#',
    gradient: 'from-indigo-50 via-white to-white',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    iconSrc: '/icon_atten.png',
    iconAlt: 'ไอคอนการลงเวลา',
    comingSoon: true,
  },
];

export default async function ExtraProgramsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">โปรแกรมเสริม</h1>
          <p className="text-muted-foreground mt-1">
            ระบบเพิ่มเติมสำหรับศูนย์กลางหลักฐาน
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">เมนูหลัก</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {extraPrograms.map((card) => {
            const cardContent = (
              <>
                <div className="relative z-10">
                  <h3 className={`font-semibold ${card.text}`}>{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  {card.comingSoon && (
                    <div className="mt-3">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800">
                        เร็วๆ นี้
                      </span>
                    </div>
                  )}
                  {card.submenu && card.submenu.length > 0 && (
                    <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                      {card.submenu.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-md border border-sky-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-sky-700 shadow-sm hover:bg-sky-50"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Image
                  src={card.iconSrc}
                  alt={card.iconAlt}
                  width={126}
                  height={126}
                  unoptimized
                  className="pointer-events-none select-none absolute -top-8 -right-4 h-28 w-28 opacity-95 drop-shadow-md"
                />
              </>
            );

            if (card.comingSoon || card.href === '#') {
              return (
                <div
                  key={card.href}
                  className={`relative rounded-xl border p-6 shadow-sm bg-gradient-to-br ${card.gradient} ${card.border} opacity-75 cursor-not-allowed`}
                >
                  {cardContent}
                </div>
              );
            }

            // การ์ดที่มีเมนูย่อย: คลิกที่การ์ดไปหน้ารายการ เมนูย่อยเป็นลิงก์แยก
            if (card.submenu && card.submenu.length > 0) {
              return (
                <div
                  key={card.href}
                  className={`relative rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md bg-gradient-to-br ${card.gradient} ${card.border}`}
                >
                  <Link href={card.href} className="absolute inset-0 z-0" aria-hidden="true" />
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={card.href}
                href={card.href}
                className={`relative rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md bg-gradient-to-br ${card.gradient} ${card.border} cursor-pointer`}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>

      {/* API Documentation Section */}
      <div className="rounded-lg border bg-card p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">API สำหรับโปรแกรมเสริม (Single Login)</h2>
        <p className="text-muted-foreground mb-4">
          สำหรับพัฒนาโปรแกรมเสริมที่มาต่อยอด สามารถใช้ API ต่อไปนี้เพื่อการตรวจสอบการเข้าสู่ระบบ (Single Login)
          โดยโปรแกรมเสริมสามารถใช้ token เพื่อเข้าถึงระบบได้โดยไม่ต้อง login ซ้ำ
        </p>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <h3 className="font-semibold mb-2">1. ขอ Authentication Token</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <code className="bg-background px-2 py-1 rounded text-xs">
                GET /api/auth/token
              </code>
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Authentication:</strong> ต้องมี session cookie จาก NextAuth (ต้อง login ก่อน)
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Response:</strong>
            </p>
            <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "expiresAt": "2024-01-02T12:00:00.000Z"
}`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              ส่งคืน JWT token สำหรับใช้ในการเข้าถึง API ของโปรแกรมเสริม (หมดอายุ 24 ชั่วโมง)
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <h3 className="font-semibold mb-2">2. ตรวจสอบ Token</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <code className="bg-background px-2 py-1 rounded text-xs">
                POST /api/auth/verify
              </code>
              {' '}หรือ{' '}
              <code className="bg-background px-2 py-1 rounded text-xs">
                GET /api/auth/verify?token={'{token}'}
              </code>
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Request Body (POST):</strong>
            </p>
            <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`}
            </pre>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Response:</strong>
            </p>
            <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "ชื่อผู้ใช้",
    "primarySchoolId": "1",
    "primarySchoolName": "โรงเรียนตัวอย่าง",
    "roles": [
      {
        "role": "TEACHER",
        "schoolId": "1",
        "schoolName": "โรงเรียนตัวอย่าง"
      }
    ]
  }
}`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              ตรวจสอบความถูกต้องของ token และส่งคืนข้อมูลผู้ใช้
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <h3 className="font-semibold mb-2">3. ใช้ Token ในโปรแกรมเสริม</h3>
            <p className="text-sm text-muted-foreground mb-2">
              เมื่อพัฒนาโปรแกรมเสริม สามารถใช้ token เพื่อตรวจสอบการเข้าสู่ระบบได้ดังนี้:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
              <li>เรียก <code className="bg-background px-1 py-0.5 rounded text-xs">GET /api/auth/token</code> จากหน้าเว็บที่มี session</li>
              <li>เก็บ token ที่ได้จาก response</li>
              <li>ส่ง token ไปยังโปรแกรมเสริม (ผ่าน URL parameter, POST body, หรือ header)</li>
              <li>ในโปรแกรมเสริม เรียก <code className="bg-background px-1 py-0.5 rounded text-xs">POST /api/auth/verify</code> เพื่อตรวจสอบ token</li>
              <li>ใช้ข้อมูลผู้ใช้จาก response เพื่อกำหนดสิทธิ์การเข้าถึง</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>ตัวอย่างการใช้งาน:</strong>
            </p>
            <pre className="bg-background p-2 rounded text-xs overflow-x-auto mt-2">
{`// ในโปรแกรมเสริม (JavaScript)
const response = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token: userToken }),
});

const data = await response.json();
if (data.success) {
  // ใช้ข้อมูลผู้ใช้จาก data.user
  console.log('User:', data.user);
}`}
            </pre>
          </div>
        </div>
      </div>
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mt-8" />
    </div>
  );
}

