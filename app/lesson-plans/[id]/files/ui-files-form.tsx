'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  addLessonPlanFile,
  deleteLessonPlanFile,
  setPrimaryLessonPlanFile,
  updateLessonPlanFile,
} from '@/app/actions/lesson-plan';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  describeAllowedFileTypes,
  isImageFile,
  isVideoFile,
} from '@/lib/file-types';
import { toast } from '@/lib/toast';

type FileItem = {
  id: string;
  fileName: string;
  storageType: 'YOUTUBE' | 'GDRIVE' | 'URL' | 'CANVA' | 'LINK';
  isPrimary: boolean;
  uploadedAt: string;
  storagePath?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  fileUrls?: Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }> | null;
  mimeType?: string;
  fileType?: 'PLAN' | 'REFLECTION' | 'OTHER';
  description?: string;
};

function formatThaiDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return '-';
  const thaiYear = dateObj.getFullYear() + 543;
  const monthName = dateObj.toLocaleDateString('th-TH', { month: 'long' });
  const day = dateObj.getDate();
  return `${day} ${monthName} ${thaiYear}`;
}

export default function LessonPlanFilesForm({
  lessonPlanId,
  files,
}: {
  lessonPlanId: string;
  files: FileItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [storageType, setStorageType] = useState<'YOUTUBE' | 'GDRIVE' | 'URL' | 'CANVA' | 'LINK'>('URL');
  const [fileType, setFileType] = useState<'PLAN' | 'REFLECTION' | 'OTHER'>('PLAN');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, Partial<FileItem>>>({});
  const allowedListText = describeAllowedFileTypes();
  const fileAccept = '.pdf,.jpg,.jpeg,.png,.mp4,.webm,.mov,.avi';

  const isLinkType = useMemo(() => storageType !== 'URL', [storageType]);

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(() => {
      (async () => {
        try {
          // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่ (สำหรับ URL type)
          const files = formData.getAll('files') as File[];
          const storageType = formData.get('storageType') as string;
          const hasFiles = storageType === 'URL' && files.length > 0;

          let res;
          if (hasFiles) {
            // ใช้ API route สำหรับ file uploads (รองรับไฟล์ขนาดใหญ่)
            const response = await fetch(`/api/lesson-plans/${lessonPlanId}/files`, {
              method: 'POST',
              body: formData,
            });
            res = await response.json();
          } else {
            // ใช้ server action สำหรับประเภทอื่น (YOUTUBE, GDRIVE, CANVA, LINK)
            res = await addLessonPlanFile(formData);
          }

          if (!res.success) {
            const message = res.error || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
            setError(message);
            toast.error(message);
            return;
          }
          toast.success('เพิ่มไฟล์เรียบร้อยแล้ว');
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
          setError(message);
          toast.error(message);
        }
      })();
    });
  }

  return (
    <div className="space-y-8">
      {/* Add file form */}
      <form action={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <input type="hidden" name="lessonPlanId" value={lessonPlanId} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">ประเภทการเก็บ</label>
            <select
              name="storageType"
              value={storageType}
              onChange={(e) => setStorageType(e.target.value as FileItem['storageType'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="URL">URL / Upload</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="GDRIVE">Google Drive</option>
              <option value="CANVA">Canva</option>
              <option value="LINK">ลิงก์เว็บไซต์</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ประเภทไฟล์</label>
            <select
              name="fileType"
              value={fileType}
              onChange={(e) => {
                const value = e.target.value as 'PLAN' | 'REFLECTION' | 'OTHER';
                if (value === 'PLAN' || value === 'REFLECTION' || value === 'OTHER') {
                  setFileType(value);
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="PLAN">แผนการสอน</option>
              <option value="REFLECTION">บันทึกหลังแผน</option>
              <option value="OTHER">อื่นๆ</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">ชื่อไฟล์ (ใช้แสดงในระบบ)</label>
            <input
              name="fileName"
              placeholder={storageType === 'URL' ? 'ไม่กรอกจะใช้ชื่อไฟล์เดิม' : 'เช่น แผนการสอนบทที่ 1'}
              required={storageType !== 'URL'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              สามารถตั้งชื่อให้สื่อความหมายได้ (ควรระบุสกุลไฟล์ เช่น .pdf, .jpg หากเป็นไฟล์อัปโหลด)
            </p>
          </div>

          {!isLinkType && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">อัปโหลดไฟล์</label>
              <input
                name="files"
                type="file"
                multiple
                accept={fileAccept}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    const fileArray = Array.from(files);
                    const imageFiles = fileArray.filter((f) => isImageFile(f.name, f.type));
                    const videoFiles = fileArray.filter((f) => isVideoFile(f.name, f.type));
                    
                    // ตรวจสอบ client-side
                    if (imageFiles.length > 0 && videoFiles.length > 0) {
                      setError('ไม่สามารถอัปโหลดรูปภาพและวิดีโอพร้อมกันได้');
                      e.target.value = '';
                      return;
                    }
                    if (imageFiles.length > 20) {
                      setError('สามารถอัปโหลดรูปภาพได้มากสุด 20 รูป');
                      e.target.value = '';
                      return;
                    }
                    if (videoFiles.length > 1) {
                      setError('สามารถอัปโหลดวิดีโอได้เพียง 1 ไฟล์');
                      e.target.value = '';
                      return;
                    }
                    if (videoFiles.length === 1) {
                      const videoFile = videoFiles[0];
                      const videoSizeMB = videoFile.size / (1024 * 1024);
                      if (videoSizeMB > 1000) {
                        setError('ขนาดวิดีโอต้องไม่เกิน 1000 MB');
                        e.target.value = '';
                        return;
                      }
                    }
                    setError('');
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                รองรับไฟล์ {allowedListText}
                <br />
                • รูปภาพ: อัปโหลดได้มากสุด 20 รูป (รูปแรกจะเป็น thumbnail ของกลุ่มรูปภาพเท่านั้น)
                <br />
                • วิดีโอ: อัปโหลดได้ 1 ไฟล์ ขนาดไม่เกิน 1000 MB (จะสร้าง thumbnail อัตโนมัติ)
                <br />
                • ตั้งเป็นไฟล์หลัก (thumbnail ของแผนการสอน) ได้เฉพาะรูปภาพ (JPG, JPEG, PNG) - ให้ user เป็นผู้กำหนดเอง
              </p>
            </div>
          )}

          {storageType === 'YOUTUBE' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">ลิงก์ YouTube</label>
              <input
                name="storagePath"
                required
                placeholder="https://www.youtube.com/watch?v=QwtWLTeQlRk"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                ระบบจะเปิดลิงก์ YouTube ตามที่ระบุจาก thumbnail
              </p>
            </div>
          )}

          {storageType === 'GDRIVE' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">ลิงก์ Google Drive</label>
              <input
                name="storagePath"
                required
                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                รองรับรูปแบบ https://drive.google.com/file/d/FILE_ID/view
              </p>
            </div>
          )}

          {storageType === 'CANVA' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">ลิงก์ Canva (แชร์สาธารณะ)</label>
              <input
                name="storagePath"
                required
                placeholder="https://www.canva.com/design/..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                ระบุลิงก์ Canva ที่แชร์สาธารณะแล้ว ระบบจะแสดงแบบ embedded
              </p>
            </div>
          )}

          {storageType === 'LINK' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">ลิงก์เว็บไซต์</label>
              <input
                name="externalUrl"
                type="url"
                required
                placeholder="https://sites.google.com/..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                ระบุลิงก์เว็บไซต์ทั่วไป เช่น Google Sites, เว็บไซต์อื่นๆ
              </p>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">คำอธิบายไฟล์</label>
            <textarea
              name="description"
              rows={2}
              placeholder="เช่น ไฟล์แผนการสอน, บันทึกหลังแผน"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'กำลังอัปโหลด...' : 'บันทึกไฟล์'}
          </Button>
        </div>
      </form>

      {/* Files list */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">ไฟล์ที่มีอยู่</h2>
        </div>
        <div className="p-4 space-y-2">
          {files.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีไฟล์</p>
          ) : (
            files.map((f) => {
              const isEditing = editingId === f.id;
              const current = editState[f.id] || {};
              const isImage = isImageFile(f.fileName, f.mimeType);
              const isVideo = isVideoFile(f.fileName, f.mimeType);
              const isPdf =
                (f.mimeType && f.mimeType.toLowerCase().includes('pdf')) ||
                (f.storageType === 'URL' &&
                  (f.externalUrl || f.storagePath || '').toLowerCase().includes('.pdf'));
              
              // ตรวจสอบว่ามี fileUrls (กลุ่มรูปภาพ) หรือไม่
              const hasMultipleImages = f.fileUrls && Array.isArray(f.fileUrls) && f.fileUrls.length > 0;
              
              // สำหรับรูปภาพ: ใช้ thumbnailUrl หรือ externalUrl
              // สำหรับวิดีโอ: ใช้ thumbnailUrl ถ้ามี หรือแสดง icon วิดีโอ
              const previewSrc =
                f.storageType === 'URL' && isImage
                  ? f.thumbnailUrl || f.externalUrl || f.storagePath
                  : f.storageType === 'URL' && isVideo && f.thumbnailUrl
                    ? f.thumbnailUrl
                    : undefined;
              
              // สำหรับ LINK ให้เปิดในแท็บใหม่ แทนที่จะแสดงใน embedded page
              const isLinkType = f.storageType === 'LINK';
              const linkHref = isLinkType 
                ? f.externalUrl || f.storagePath || '#' 
                : `/lesson-plans/${lessonPlanId}/files/${f.id}/view`;

              const thumbnailContent = (
                <>
                  {previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt={`ไฟล์ ${f.fileName}`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : f.storageType === 'YOUTUBE' ? (
                    <Image
                      src="/youtube.png"
                      alt="YouTube"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : f.storageType === 'GDRIVE' ? (
                    <Image
                      src="/gdrive.png"
                      alt="Google Drive"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : f.storageType === 'CANVA' ? (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#00C4CC] to-[#7B61FF] text-white text-xs font-bold">
                      CANVA
                    </div>
                  ) : f.storageType === 'LINK' ? (
                    <div className="flex h-full w-full items-center justify-center bg-blue-500 text-white text-xs font-bold">
                      LINK
                    </div>
                  ) : isVideo && previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt={`Thumbnail ${f.fileName}`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : isVideo ? (
                    <div className="flex h-full w-full items-center justify-center bg-red-500 text-white text-xs font-bold">
                      VIDEO
                    </div>
                  ) : isPdf ? (
                    <Image
                      src="/file_pdf.png"
                      alt="ไฟล์ PDF"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      ไม่มีพรีวิว
                    </div>
                  )}
                </>
              );

              return (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {isLinkType ? (
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border bg-muted"
                      >
                        {thumbnailContent}
                      </a>
                    ) : (
                      <Link
                        href={linkHref}
                        className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border bg-muted"
                      >
                        {thumbnailContent}
                      </Link>
                    )}
                    {f.isPrimary && (
                      <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        หลัก
                      </span>
                    )}
                    {f.fileType && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {f.fileType === 'PLAN' ? 'แผนการสอน' : f.fileType === 'REFLECTION' ? 'บันทึกหลังแผน' : 'อื่นๆ'}
                      </span>
                    )}
                    <div>
                      {isEditing ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">ชื่อไฟล์</label>
                            <input
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              defaultValue={f.fileName}
                              onChange={(e) =>
                                setEditState((s) => ({
                                  ...s,
                                  [f.id]: { ...s[f.id], fileName: e.target.value },
                                }))
                              }
                            />
                            {hasMultipleImages && (
                              <p className="text-xs text-muted-foreground">
                                กลุ่มรูปภาพ {f.fileUrls?.length || 0} ไฟล์
                              </p>
                            )}
                          </div>
                          {f.storageType === 'URL' && (
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-muted-foreground">External URL</label>
                              <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                defaultValue={f.externalUrl}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [f.id]: { ...s[f.id], externalUrl: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          )}
                          {f.storageType !== 'URL' && f.storageType !== 'LINK' && (
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-muted-foreground">
                                {f.storageType === 'YOUTUBE'
                                  ? 'ลิงก์ YouTube'
                                  : f.storageType === 'GDRIVE'
                                    ? 'ลิงก์ Google Drive'
                                    : f.storageType === 'CANVA'
                                      ? 'ลิงก์ Canva'
                                      : 'ลิงก์'}
                              </label>
                              <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                defaultValue={f.storagePath}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [f.id]: { ...s[f.id], storagePath: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          )}
                          {f.storageType === 'LINK' && (
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-muted-foreground">ลิงก์เว็บไซต์</label>
                              <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                defaultValue={f.externalUrl}
                                onChange={(e) =>
                                  setEditState((s) => ({
                                    ...s,
                                    [f.id]: { ...s[f.id], externalUrl: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          )}
                          <label className="mt-6 inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={current.isPrimary !== undefined ? current.isPrimary : f.isPrimary}
                              disabled={!isImage}
                              onChange={(e) =>
                                setEditState((s) => ({
                                  ...s,
                                  [f.id]: { ...s[f.id], isPrimary: e.target.checked },
                                }))
                              }
                            />
                            ตั้งเป็นไฟล์หลัก
                          </label>
                          {!isImage && (
                            <p className="text-xs text-muted-foreground">
                              ตั้งเป็นไฟล์หลักได้เฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">
                            {f.fileName}
                            {hasMultipleImages && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({f.fileUrls?.length || 0} ไฟล์)
                              </span>
                            )}
                          </p>
                          <p>
                            {f.storageType} • {formatThaiDate(f.uploadedAt)}
                            {f.fileType && (
                              <span className="ml-2">
                                • {f.fileType === 'PLAN' ? 'แผนการสอน' : f.fileType === 'REFLECTION' ? 'บันทึกหลังแผน' : 'อื่นๆ'}
                              </span>
                            )}
                          </p>
                          {f.storagePath && (
                            <p className="break-all text-xs">{f.storagePath}</p>
                          )}
                          {f.description && (
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <Button variant="outline" onClick={() => setEditingId(f.id)}>
                        แก้ไข
                      </Button>
                    )}
                    {isEditing && (
                      <>
                        <Button
                          variant="default"
                          onClick={() =>
                            startTransition(() => {
                              (async () => {
                                const fd = new FormData();
                                fd.set('lessonPlanId', lessonPlanId);
                                fd.set('fileId', f.id);
                                if (current.fileName) fd.set('fileName', current.fileName);
                                if (current.externalUrl) fd.set('externalUrl', current.externalUrl);
                                if (current.storagePath) fd.set('storagePath', current.storagePath);
                                // ส่ง isPrimary ไปทุกครั้ง (checked = 'on', unchecked = 'off')
                                // ใช้ค่าจาก current.isPrimary ถ้ามีการเปลี่ยนแปลง หรือใช้ค่าจาก f.isPrimary ถ้าไม่เปลี่ยนแปลง
                                const isPrimaryValue = current.isPrimary !== undefined ? current.isPrimary : f.isPrimary;
                                fd.set('isPrimary', isPrimaryValue ? 'on' : 'off');
                                try {
                                  const res = await updateLessonPlanFile(fd);
                                  if (!res.success) {
                                    toast.error(res.error || 'ไม่สามารถบันทึกไฟล์ได้');
                                    return;
                                  }
                                  toast.success('อัปเดตข้อมูลไฟล์เรียบร้อยแล้ว');
                                  setEditingId(null);
                                  router.refresh();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error ? error.message : 'ไม่สามารถบันทึกไฟล์ได้'
                                  );
                                }
                              })();
                            })
                          }
                        >
                          บันทึก
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)}>
                          ยกเลิก
                        </Button>
                      </>
                    )}
                    {!f.isPrimary && !isEditing && isImage && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          startTransition(() => {
                            (async () => {
                              try {
                                const res = await setPrimaryLessonPlanFile(lessonPlanId, f.id);
                                if (!res.success) {
                                  toast.error(res.error || 'ไม่สามารถตั้งไฟล์หลักได้');
                                  return;
                                }
                                toast.success('ปรับไฟล์หลักเรียบร้อยแล้ว');
                                router.refresh();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : 'ไม่สามารถตั้งไฟล์หลักได้'
                                );
                              }
                            })();
                          })
                        }
                      >
                        ตั้งเป็นหลัก
                      </Button>
                    )}
                    {!isEditing && (
                      <Button
                        variant="destructive"
                        onClick={() =>
                          startTransition(() => {
                            (async () => {
                              try {
                                const res = await deleteLessonPlanFile(lessonPlanId, f.id);
                                if (!res.success) {
                                  toast.error(res.error || 'ไม่สามารถลบไฟล์ได้');
                                  return;
                                }
                                toast.success('ลบไฟล์เรียบร้อยแล้ว');
                                router.refresh();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : 'ไม่สามารถลบไฟล์ได้'
                                );
                              }
                            })();
                          })
                        }
                      >
                        ลบ
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

