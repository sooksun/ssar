'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getAcademicYearOptions } from '@/lib/year-options';

type School = { id: string; name: string };

type DocRecord = {
  id: string;
  documentType: string;
  fileName: string;
  storageType: string;
  storagePath: string | null;
  externalUrl: string | null;
  uploadedAt: string;
};

type DocsState = {
  PA1: DocRecord | null;
  PA2: DocRecord | null;
  PA3: DocRecord | null;
};

const LABEL: Record<string, string> = {
  PA1: 'PA 1/ส',
  PA2: 'PA 2/ส',
  PA3: 'PA 3/ส',
};

export function PATeacherDocumentsSection({
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
  /** ชื่อครูที่ล็อกอิน — แสดงว่าบันทึกนี้เป็นของใคร */
  currentUserName?: string | null;
  /** ผู้ดูแลระบบ/ผอ. สามารถเลือกครูเพื่อดูหรือบันทึก PA แทนได้ */
  canSelectTeacher?: boolean;
  teachersBySchool?: Record<string, { id: string; name: string }[]>;
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [selectedForUserId, setSelectedForUserId] = useState('');
  const [docs, setDocs] = useState<DocsState>({ PA1: null, PA2: null, PA3: null });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [gdriveLinks, setGdriveLinks] = useState<Record<string, string>>({ PA1: '', PA2: '', PA3: '' });

  const teacherList = schoolId ? teachersBySchool[schoolId] ?? [] : [];
  const displayName =
    selectedForUserId === '' || selectedForUserId === currentUserId
      ? currentUserName ?? 'ผู้ใช้'
      : teacherList.find((t) => t.id === selectedForUserId)?.name ?? 'ครูที่เลือก';

  const fetchDocs = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      let url = `/api/pa/teacher-documents?schoolId=${encodeURIComponent(schoolId)}&academicYear=${academicYear}`;
      if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
        url += `&forUserId=${encodeURIComponent(selectedForUserId)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setDocs(json.data);
      } else {
        setDocs({ PA1: null, PA2: null, PA3: null });
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [schoolId, academicYear, canSelectTeacher, selectedForUserId, currentUserId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const academicYearOptions = getAcademicYearOptions(2560, currentAcademicYear + 1);

  async function handleUpload(type: 'PA1' | 'PA2' | 'PA3', formData: FormData) {
    setUploading(type);
    try {
      const res = await fetch('/api/pa/teacher-documents', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'อัปโหลดไม่สำเร็จ');
        return;
      }
      toast.success(`บันทึก${LABEL[type]}เรียบร้อย`);
      router.refresh();
      await fetchDocs();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setUploading(null);
    }
  }

  function addForUserId(fd: FormData) {
    if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
      fd.set('forUserId', selectedForUserId);
    }
  }

  function onFileChange(type: 'PA1' | 'PA2' | 'PA3', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('schoolId', schoolId);
    fd.set('academicYear', String(academicYear));
    fd.set('documentType', type);
    fd.set('storageType', 'URL');
    addForUserId(fd);
    fd.append('files', file);
    handleUpload(type, fd);
    e.target.value = '';
  }

  function onGdriveSubmit(type: 'PA1' | 'PA2' | 'PA3') {
    const url = gdriveLinks[type]?.trim();
    if (!url) {
      toast.warning('กรุณาระบุลิงก์ Google Drive');
      return;
    }
    const fd = new FormData();
    fd.set('schoolId', schoolId);
    fd.set('academicYear', String(academicYear));
    fd.set('documentType', type);
    fd.set('storageType', 'GDRIVE');
    fd.set('storagePath', url);
    fd.set('fileName', LABEL[type]);
    addForUserId(fd);
    handleUpload(type, fd);
  }

  if (schools.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold mb-2">บันทึก PA 1/ส, PA 2/ส, PA 3/ส (ของครู)</h2>
      <p className="text-sm text-muted-foreground mb-2">
        ครู 1 คน บันทึกได้ 1 ชุด (PA 1/ส, PA 2/ส, PA 3/ส) ต่อคน ต่อโรงเรียน ต่อปีการศึกษา — โรงเรียนมี 10 คน บันทึกได้ 10 ชุด (ผูก user, โรงเรียน, ปีการศึกษา)
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
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
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
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {canSelectTeacher && teacherList.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">แสดง/บันทึก PA ของ</label>
            <select
              value={selectedForUserId}
              onChange={(e) => setSelectedForUserId(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[220px]"
            >
              <option value="">ตนเอง ({currentUserName ?? 'ผู้ใช้'})</option>
              {teacherList
                .filter((t) => t.id !== currentUserId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="space-y-6">
          {(['PA1', 'PA2', 'PA3'] as const).map((type) => (
            <div
              key={type}
              className="rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="min-w-[100px] font-medium">{LABEL[type]}</div>
              <div className="flex-1 space-y-2">
                {docs[type] ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{docs[type]!.fileName}</span>
                    {docs[type]!.storagePath && (
                      <a
                        href={
                          docs[type]!.storageType === 'GDRIVE'
                            ? docs[type]!.externalUrl || docs[type]!.storagePath
                            : docs[type]!.storagePath!
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        เปิด/ดาวน์โหลด
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">ยังไม่มีไฟล์</span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                      onChange={(e) => onFileChange(type, e)}
                      disabled={uploading !== null}
                    />
                    <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                      {uploading === type ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
                    </span>
                  </label>
                  <span className="text-muted-foreground text-sm">หรือ</span>
                  <input
                    type="url"
                    placeholder="ลิงก์ Google Drive"
                    value={gdriveLinks[type]}
                    onChange={(e) =>
                      setGdriveLinks((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                    className="flex h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onGdriveSubmit(type)}
                    disabled={uploading !== null}
                  >
                    บันทึกลิงก์
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
