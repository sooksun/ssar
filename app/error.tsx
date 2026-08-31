'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary ระดับ root — กันไม่ให้ผู้ใช้เห็นหน้า error ดิบของ Next
 * เมื่อ server component โยน error (เช่น DB ล่ม, query พัง)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        ระบบไม่สามารถแสดงหน้านี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
        หากยังพบปัญหาโปรดแจ้งผู้ดูแลระบบ
      </p>
      {error.digest && (
        <p className="text-muted-foreground text-xs">รหัสอ้างอิง: {error.digest}</p>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          ลองใหม่
        </button>
        <Link href="/dashboard" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
          กลับแดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
