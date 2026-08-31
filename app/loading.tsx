/**
 * Loading UI ระดับ root — ให้ Next stream หน้าออกมาได้ทันที
 * แทนที่จะค้างหน้าเปล่าระหว่างรอ server component ที่ query หนัก
 */
export default function Loading() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"
          role="status"
          aria-label="กำลังโหลด"
        />
        <p className="text-muted-foreground text-sm">กำลังโหลดข้อมูล…</p>
      </div>
    </div>
  );
}
