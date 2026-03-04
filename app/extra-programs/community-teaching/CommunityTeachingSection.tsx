'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getAcademicYearOptions } from '@/lib/year-options';

type School = { id: string; name: string };

type RecordData = {
  id: string;
  title: string | null;
  activityDate: string | null;
  location: string | null;
  summary: string | null;
  fileName: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  storageType: string;
};

const TEMPLATE_LINK = '/docref/pp5.pdf';

export function CommunityTeachingSection({
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
  const [semester, setSemester] = useState(1);
  const [selectedForUserId, setSelectedForUserId] = useState('');
  const [record, setRecord] = useState<RecordData | null>(null);
  const [title, setTitle] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [gdriveLink, setGdriveLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const teacherList = schoolId ? teachersBySchool[schoolId] ?? [] : [];
  const displayName =
    selectedForUserId === '' || selectedForUserId === currentUserId
      ? currentUserName ?? 'ผู้ใช้'
      : teacherList.find((t) => t.id === selectedForUserId)?.name ?? 'ครูที่เลือก';

  const fetchRecord = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      let url = `/api/extra/community-teaching?schoolId=${encodeURIComponent(schoolId)}&academicYear=${academicYear}&semester=${semester}`;
      if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
        url += `&forUserId=${encodeURIComponent(selectedForUserId)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setRecord(json.data);
        setTitle(json.data.title ?? '');
        setActivityDate(json.data.activityDate ? json.data.activityDate.slice(0, 10) : '');
        setLocation(json.data.location ?? '');
        setSummary(json.data.summary ?? '');
      } else {
        setRecord(null);
        setTitle('');
        setActivityDate('');
        setLocation('');
        setSummary('');
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [schoolId, academicYear, semester, canSelectTeacher, selectedForUserId, currentUserId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const academicYearOptions = getAcademicYearOptions(2560, currentAcademicYear + 1);

  function addForUserId(fd: FormData) {
    if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
      fd.set('forUserId', selectedForUserId);
    }
  }

  async function handleSave(withFile?: File | null, gdriveUrl?: string) {
    const isUpload = !!(withFile || gdriveUrl);
    if (isUpload) setUploading(true);
    else setSaving(true);
    try {
      if (withFile || gdriveUrl) {
        const fd = new FormData();
        fd.set('schoolId', schoolId);
        fd.set('academicYear', String(academicYear));
        fd.set('semester', String(semester));
        fd.set('title', title);
        if (activityDate) fd.set('activityDate', activityDate);
        fd.set('location', location);
        fd.set('summary', summary);
        addForUserId(fd);
        if (gdriveUrl) {
          fd.set('storageType', 'GDRIVE');
          fd.set('storagePath', gdriveUrl);
        } else if (withFile) {
          fd.set('storageType', 'URL');
          fd.append('files', withFile);
        }
        const res = await fetch('/api/extra/community-teaching', { method: 'POST', body: fd });
        const json = await res.json();
        if (!json.success) {
          toast.error(json.error || 'บันทึกไม่สำเร็จ');
          return;
        }
        if (gdriveUrl) setGdriveLink('');
      } else {
        const res = await fetch('/api/extra/community-teaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            academicYear,
            semester,
            forUserId: canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId ? selectedForUserId : undefined,
            title: title || null,
            activityDate: activityDate || null,
            location: location || null,
            summary: summary || null,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          toast.error(json.error || 'บันทึกไม่สำเร็จ');
          return;
        }
      }
      toast.success('บันทึกการสอนชุมชนเรียบร้อย');
      router.refresh();
      await fetchRecord();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      if (isUpload) setUploading(false);
      else setSaving(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleSave(file);
    e.target.value = '';
  }

  function onGdriveSubmit() {
    const url = gdriveLink?.trim();
    if (!url) {
      toast.warning('กรุณาระบุลิงก์ Google Drive');
      return;
    }
    handleSave(null, url);
  }

  if (schools.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold mb-2">บันทึกการสอนชุมชน</h2>
      <p className="text-sm text-muted-foreground mb-2">
        ภาคเรียนละไม่เกิน 1 ฉบับต่อ 1 คน (ผูก user, โรงเรียน, ปีการศึกษา, ภาคเรียน)
      </p>
      <p className="text-sm font-medium text-primary mb-2">
        กำลังแสดง/บันทึกของ: {displayName}
        {canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId && (
          <span className="text-muted-foreground font-normal"> (บันทึกแทนครู)</span>
        )}
      </p>
      <p className="text-sm mb-4">
        <a href={TEMPLATE_LINK} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          ดาวน์โหลดแบบฟอร์ม template (pp5.pdf)
        </a>
        {' '}— กรอกข้อมูลตาม template แล้วแนบไฟล์หรือลิงก์ด้านล่าง
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">โรงเรียน</label>
          <select
            value={schoolId}
            onChange={(e) => { setSchoolId(e.target.value); setSelectedForUserId(''); }}
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
        <div className="space-y-1">
          <label className="text-sm font-medium">ภาคเรียน</label>
          <select
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[100px]"
          >
            <option value={1}>ภาคเรียนที่ 1</option>
            <option value={2}>ภาคเรียนที่ 2</option>
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">ชื่อกิจกรรม/หัวข้อ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">วันที่จัดกิจกรรม</label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">สถานที่</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">สรุปผล/รายละเอียด</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => handleSave()} disabled={saving || uploading}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
            <span className="text-muted-foreground text-sm">(บันทึกเฉพาะข้อมูล ไม่แนบไฟล์)</span>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="font-medium">แนบไฟล์หรือลิงก์ (แบบ PA 1/ส)</div>
            {record?.storagePath ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{record.fileName ?? 'ไฟล์ที่แนบ'}</span>
                <a
                  href={record.storageType === 'GDRIVE' ? (record.externalUrl || record.storagePath) || '#' : record.storagePath || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  เปิด/ดาวน์โหลด
                </a>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">ยังไม่มีไฟล์หรือลิงก์</span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={onFileChange}
                  disabled={uploading || saving}
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onGdriveSubmit}
                disabled={uploading || saving}
              >
                บันทึกลิงก์
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
