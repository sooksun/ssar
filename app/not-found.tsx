import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-muted-foreground text-sm">
        หน้านี้อาจถูกย้าย ลบไปแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        กลับแดชบอร์ด
      </Link>
    </div>
  );
}
