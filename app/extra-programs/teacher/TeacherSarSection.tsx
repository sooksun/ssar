'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getAcademicYearOptions } from '@/lib/year-options';

type School = { id: string; name: string };

type DocRecord = {
  id: string;
  fileName: string;
  storageType: string;
  storagePath: string | null;
  externalUrl: string | null;
  uploadedAt: string;
};

export function TeacherSarSection({
  schools,
  currentAcademicYear,
  currentUserId,
  currentUserName,
  canSelectTeacher = false,
  teachersBySchool = {},
}: {
  schools: School[];
  currentAcademicYear: number;
  currentUserId: string;
  currentUserName?: string | null;
  canSelectTeacher?: boolean;
  teachersBySchool?: Record<string, { id: string; name: string }[]>;
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [selectedForUserId, setSelectedForUserId] = useState('');
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gdriveLink, setGdriveLink] = useState('');

  const teacherList = schoolId ? teachersBySchool[schoolId] ?? [] : [];
  const displayName =
    selectedForUserId === '' || selectedForUserId === currentUserId
      ? currentUserName ?? 'ผู้ใช้'
      : teacherList.find((t) => t.id === selectedForUserId)?.name ?? 'ครูที่เลือก';

  const fetchDoc = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      let url = `/api/extra/teacher-sar?schoolId=${encodeURIComponent(schoolId)}&academicYear=${academicYear}`;
      if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
        url += `&forUserId=${encodeURIComponent(selectedForUserId)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setDoc(json.data);
      } else {
        setDoc(null);
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [schoolId, academicYear, canSelectTeacher, selectedForUserId, currentUserId]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const academicYearOptions = getAcademicYearOptions(2560, currentAcademicYear + 1);

  function addForUserId(fd: FormData) {
    if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
      fd.set('forUserId', selectedForUserId);
    }
  }

  async function handleUpload(formData: FormData) {
    setUploading(true);
    try {
      const res = await fetch('/api/extra/teacher-sar', { method: 'POST', body: formData });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'อัปโหลดไม่สำเร็จ');
        return;
      }
      toast.success('บันทึก SAR ครูเรียบร้อย');
      router.refresh();
      await fetchDoc();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('schoolId', schoolId);
    fd.set('academicYear', String(academicYear));
    fd.set('storageType', 'URL');
    addForUserId(fd);
    fd.append('files', file);
    handleUpload(fd);
    e.target.value = '';
  }

  function onGdriveSubmit() {
    const url = gdriveLink?.trim();
    if (!url) {
      toast.warning('กรุณาระบุลิงก์ Google Drive');
      return;
    }
    const fd = new FormData();
    fd.set('schoolId', schoolId);
    fd.set('academicYear', String(academicYear));
    fd.set('storageType', 'GDRIVE');
    fd.set('storagePath', url);
    addForUserId(fd);
    handleUpload(fd);
  }

  if (schools.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold mb-2">ส่ง SAR ครู</h2>
      <p className="text-sm text-muted-foreground mb-2">
        ครู 1 คน บันทึกได้ 1 ไฟล์ SAR ต่อคน ต่อโรงเรียน ต่อปีการศึกษา (ผูก user, โรงเรียน, ปีการศึกษา)
      </p>
      <p className="text-sm font-medium text-primary mb-4">
        กำลังแสดง/บันทึกของ: {displayName}
        {canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId && (
          <span className="text-muted-foreground font-normal"> (บันทึกแทนครู)</span>
        )}
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">โรงเรียน</label>
          <select
            value={schoolId}
            onChange={(e) => {
              setSchoolId(e.target.value);
              setSelectedForUserId('');
            }}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[220px]"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ปีการศึกษา</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[120px]"
          >
            {academicYearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {canSelectTeacher && teacherList.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">แสดง/บันทึกของ</label>
            <select
              value={selectedForUserId}
              onChange={(e) => setSelectedForUserId(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[220px]"
            >
              <option value="">ตนเอง ({currentUserName ?? 'ผู้ใช้'})</option>
              {teacherList.filter((t) => t.id !== currentUserId).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          {doc ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{doc.fileName}</span>
              {(doc.storagePath || doc.externalUrl) && (
                <a
                  href={doc.storageType === 'GDRIVE' ? (doc.externalUrl || doc.storagePath) || '#' : doc.storagePath || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  เปิด/ดาวน์โหลด
                </a>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">ยังไม่มีไฟล์ SAR</span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={onFileChange}
                disabled={uploading}
              />
              <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
              </span>
            </label>
            <span className="text-muted-foreground text-sm">หรือ</span>
            <input
              type="url"
              placeholder="ลิงก์ Google Drive"
              value={gdriveLink}
              onChange={(e) => setGdriveLink(e.target.value)}
              className="flex h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="button" size="sm" variant="outline" onClick={onGdriveSubmit} disabled={uploading}>
              บันทึกลิงก์
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
