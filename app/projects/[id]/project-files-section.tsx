'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

type FileInfo = {
  id: string;
  fileType: string;
  fileName: string;
  storagePath: string | null;
  externalUrl: string | null;
  signedAt: string | null;
  uploadedAt: string;
} | null;

interface ProjectFilesSectionProps {
  projectId: string;
  reportFile: FileInfo;
  summaryFile: FileInfo;
}

export function ProjectFilesSection({
  projectId,
  reportFile,
  summaryFile,
}: ProjectFilesSectionProps) {
  const router = useRouter();
  const [isPendingReport, startTransitionReport] = useTransition();
  const [isPendingSummary, startTransitionSummary] = useTransition();
  const [signedReport, setSignedReport] = useState(false);
  const [signedSummary, setSignedSummary] = useState(false);

  function uploadFile(fileType: 'PROJECT_REPORT' | 'EXECUTION_SUMMARY', file: File, signed: boolean) {
    const formData = new FormData();
    formData.append('fileType', fileType);
    formData.append('file', file);
    if (signed) formData.append('signed', '1');

    const startTransition = fileType === 'PROJECT_REPORT' ? startTransitionReport : startTransitionSummary;
    startTransition(() => {
      fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('อัปโหลดไฟล์เรียบร้อย');
            router.refresh();
          } else {
            toast.error(data.error || 'อัปโหลดไม่สำเร็จ');
          }
        })
        .catch(() => toast.error('ไม่สามารถอัปโหลดได้'));
    });
  }

  const reportUrl = reportFile?.storagePath || reportFile?.externalUrl;
  const summaryUrl = summaryFile?.storagePath || summaryFile?.externalUrl;

  return (
    <div className="space-y-8">
      {/* รายงานโครงการ */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">รายงานโครงการ (PDF)</h3>
        {reportFile ? (
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={reportUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {reportFile.fileName}
            </a>
            {reportFile.signedAt && (
              <span className="text-xs text-emerald-600">ลงลายเซ็นอิเล็กทรอนิกส์แล้ว</span>
            )}
            <span className="text-xs text-muted-foreground">
              อัปโหลดเมื่อ {new Date(reportFile.uploadedAt).toLocaleDateString('th-TH')}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="block text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile('PROJECT_REPORT', f, signedReport);
            }}
            disabled={isPendingReport}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={signedReport}
              onChange={(e) => setSignedReport(e.target.checked)}
            />
            ไฟล์นี้ลงลายเซ็นอิเล็กทรอนิกส์แล้ว
          </label>
          {isPendingReport && <span className="text-sm text-muted-foreground">กำลังอัปโหลด...</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">รองรับไฟล์ PDF ขนาดไม่เกิน 10 MB</p>
      </div>

      {/* สรุปการดำเนินโครงการ */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">สรุปการดำเนินโครงการ (PDF)</h3>
        {summaryFile ? (
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={summaryUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {summaryFile.fileName}
            </a>
            {summaryFile.signedAt && (
              <span className="text-xs text-emerald-600">ลงลายเซ็นอิเล็กทรอนิกส์แล้ว</span>
            )}
            <span className="text-xs text-muted-foreground">
              อัปโหลดเมื่อ {new Date(summaryFile.uploadedAt).toLocaleDateString('th-TH')}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="block text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile('EXECUTION_SUMMARY', f, signedSummary);
            }}
            disabled={isPendingSummary}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={signedSummary}
              onChange={(e) => setSignedSummary(e.target.checked)}
            />
            ไฟล์นี้ลงลายเซ็นอิเล็กทรอนิกส์แล้ว
          </label>
          {isPendingSummary && <span className="text-sm text-muted-foreground">กำลังอัปโหลด...</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">รองรับไฟล์ PDF ขนาดไม่เกิน 10 MB</p>
      </div>
    </div>
  );
}
