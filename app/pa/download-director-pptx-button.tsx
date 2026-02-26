'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  /** แสดงเฉพาะเมื่อผู้ใช้มีข้อตกลง PA ตำแหน่งผู้อำนวยการ */
  hasPrincipalAgreement?: boolean;
};

export function DownloadDirectorPptxButton({ hasPrincipalAgreement }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (useAI: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pa/pptx/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useAI }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i) ?? disposition?.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1]?.trim() ?? `รายงานPA-ผู้อำนวยการ-${new Date().toISOString().slice(0, 10)}.pptx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(filename);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดาวน์โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (hasPrincipalAgreement === false) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          disabled={loading}
          onClick={() => handleDownload(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'กำลังสร้าง…' : 'สร้าง PowerPoint รายงานผู้อำนวยการ (ใช้ AI)'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => handleDownload(false)}
        >
          สร้าง PowerPoint (ไม่ใช้ AI)
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        รายงานสำหรับนำเสนอภาคเรียนละ 1 ครั้ง — เลือกใช้ AI เพื่อให้ระบบเขียนความเรียงสรุปผลงานรายตัวชี้วัด
      </p>
    </div>
  );
}
