'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkCollectionItem } from '@/app/actions/evidence';
import { Button } from '@/components/ui/button';
import { isVideoFile } from '@/lib/file-types';
import { toast } from '@/lib/toast';

const MAX_IMAGE_DOC_FILES = 5;
const MAX_VIDEO_FILES = 1;

interface School {
  id: string;
  name: string;
}

interface WorkCollectionFormProps {
  schools: School[];
  currentFiscalYear: number;
  currentAcademicYear: number;
  fiscalYearOptions: number[];
}

const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50';

export default function WorkCollectionForm({
  schools,
  currentFiscalYear,
  currentAcademicYear,
  fiscalYearOptions,
}: WorkCollectionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storageType, setStorageType] = useState<'URL' | 'YOUTUBE' | 'GDRIVE' | 'CANVA' | 'LINK'>('URL');
  const [externalUrl, setExternalUrl] = useState('');
  const [linkFileName, setLinkFileName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warning('กรุณาระบุชื่อหรือหัวข้อหลักฐาน');
      return;
    }
    if (!schoolId) {
      toast.warning('กรุณาเลือกโรงเรียน');
      return;
    }

    if (storageType === 'URL' && uploadFiles && uploadFiles.length > 0) {
      const filesArray = Array.from(uploadFiles);
      const hasVideo = filesArray.some((f) => isVideoFile(f.name, f.type));
      if (hasVideo && filesArray.length > MAX_VIDEO_FILES) {
        toast.warning('อัปโหลดวิดีโอได้ครั้งละ 1 ไฟล์เท่านั้น');
        return;
      }
      if (!hasVideo && filesArray.length > MAX_IMAGE_DOC_FILES) {
        toast.warning(`รูปภาพหรือเอกสาร PDF/PPT แนบได้ครั้งละไม่เกิน ${MAX_IMAGE_DOC_FILES} ไฟล์`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('schoolId', schoolId);
        formData.set('fiscalYear', String(fiscalYear));
        formData.set('academicYear', String(currentAcademicYear));
        formData.set('title', title.trim());
        if (description.trim()) formData.set('description', description.trim());
        formData.set('storageType', storageType);

        if (storageType === 'URL' && uploadFiles && uploadFiles.length > 0) {
          for (let i = 0; i < uploadFiles.length; i++) {
            formData.append('files', uploadFiles[i]);
          }
        } else if (['YOUTUBE', 'GDRIVE', 'CANVA', 'LINK'].includes(storageType) && externalUrl.trim()) {
          formData.set('externalUrl', externalUrl.trim());
          if (linkFileName.trim()) formData.set('fileName', linkFileName.trim());
        }

        const result = await createWorkCollectionItem(formData);

        if (!result.success) {
          toast.error(result.error || 'เกิดข้อผิดพลาด');
          return;
        }

        const evidenceId = result.evidenceId!;
        if (result.fileError) {
          toast.warning(result.fileError);
        }

        const analyzeRes = await fetch(`/api/evidence/${evidenceId}/analyze`, { method: 'POST' });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) {
          toast.warning(
            'เรียก AI วิเคราะห์ไม่สำเร็จ — สามารถกดปุ่ม "AI วิเคราะห์" ในหน้ารายละเอียดหลักฐานภายหลังได้'
          );
        } else if (analyzeData.hasGemini) {
          toast.success('ระบบได้เชื่อมโยงตัวชี้วัด QA และ PA ตามที่ AI แนะนำแล้ว');
        }

        router.push(`/evidence/${evidenceId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'ไม่สามารถบันทึกได้');
      }
    });
  };

  if (schools.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        คุณไม่มีสิทธิ์เข้าถึงโรงเรียนใด — ไม่สามารถเพิ่มงานเก็บงานได้
      </p>
    );
  }

  const isLinkType = storageType !== 'URL';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="wc-school" className="text-sm font-medium">
            โรงเรียน <span className="text-destructive">*</span>
          </label>
          <select
            id="wc-school"
            required
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className={inputClass}
          >
            <option value="">เลือกโรงเรียน</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="wc-fiscal" className="text-sm font-medium">
            ปีงบประมาณ <span className="text-destructive">*</span>
          </label>
          <select
            id="wc-fiscal"
            required
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className={inputClass}
          >
            {fiscalYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="wc-title" className="text-sm font-medium">
          ชื่อ/หัวข้อหลักฐาน <span className="text-destructive">*</span>
        </label>
        <input
          id="wc-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น กิจกรรมค่ายวิทยาศาสตร์ ม.2"
          className={inputClass}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="wc-desc" className="text-sm font-medium">
          ข้อความอธิบายประกอบ (ทำอะไร ที่ไหน เกิดผลต่อตนเอง/ครู/ผู้เรียน/โรงเรียนอย่างไร)
        </label>
        <textarea
          id="wc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="อธิบายสั้นๆ ว่าทำอะไร ที่ไหน ผลที่เกิดขึ้น..."
          className={`${inputClass} min-h-[120px] resize-y`}
          rows={4}
        />
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">ไฟล์แนบ (รูปภาพ, วิดีโอ, เอกสาร PDF/PPT หรือลิงก์)</h3>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">ประเภท</label>
          <select
            value={storageType}
            onChange={(e) =>
              setStorageType(e.target.value as 'URL' | 'YOUTUBE' | 'GDRIVE' | 'CANVA' | 'LINK')
            }
            className={inputClass}
          >
            <option value="URL">อัปโหลดไฟล์ (รูป/วิดีโอ/PDF/PPT)</option>
            <option value="YOUTUBE">ลิงก์ YouTube</option>
            <option value="GDRIVE">ลิงก์ Google Drive</option>
            <option value="CANVA">ลิงก์ Canva</option>
            <option value="LINK">ลิงก์อื่นๆ</option>
          </select>
        </div>

        {isLinkType ? (
          <>
            <div className="space-y-2">
              <label htmlFor="wc-url" className="text-sm font-medium">
                URL <span className="text-destructive">*</span>
              </label>
              <input
                id="wc-url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder={
                  storageType === 'YOUTUBE'
                    ? 'https://www.youtube.com/...'
                    : storageType === 'GDRIVE'
                      ? 'https://drive.google.com/...'
                      : 'https://...'
                }
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="wc-filename" className="text-sm font-medium">
                ชื่อไฟล์ (ถ้าต้องการ)
              </label>
              <input
                id="wc-filename"
                type="text"
                value={linkFileName}
                onChange={(e) => setLinkFileName(e.target.value)}
                placeholder="เช่น วิดีโอการสอนคณิต ม.1"
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label htmlFor="wc-upload" className="text-sm font-medium">
              เลือกไฟล์
            </label>
            <p className="text-xs text-muted-foreground">
              รูปภาพ หรือ เอกสาร PDF/PPT: ได้ครั้งละ 1–5 ไฟล์ — วิดีโอ: ได้ครั้งละ 1 ไฟล์
            </p>
            <input
              id="wc-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setUploadFiles(e.target.files)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'กำลังบันทึกและวิเคราะห์...' : 'บันทึกและให้ AI เชื่อมโยงตัวชี้วัด'}
        </Button>
      </div>
    </form>
  );
}
