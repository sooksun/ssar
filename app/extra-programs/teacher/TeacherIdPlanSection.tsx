'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getAcademicYearOptions } from '@/lib/year-options';

type School = { id: string; name: string };

type IdPlanRecord = {
  id: string;
  idPlanCode: string;
  note: string | null;
};

export function TeacherIdPlanSection({
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
  const [, setRecord] = useState<IdPlanRecord | null>(null);
  const [idPlanCode, setIdPlanCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const teacherList = schoolId ? teachersBySchool[schoolId] ?? [] : [];
  const displayName =
    selectedForUserId === '' || selectedForUserId === currentUserId
      ? currentUserName ?? 'ผู้ใช้'
      : teacherList.find((t) => t.id === selectedForUserId)?.name ?? 'ครูที่เลือก';

  const fetchRecord = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      let url = `/api/extra/teacher-id-plan?schoolId=${encodeURIComponent(schoolId)}&academicYear=${academicYear}`;
      if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
        url += `&forUserId=${encodeURIComponent(selectedForUserId)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setRecord(json.data);
        setIdPlanCode(json.data.idPlanCode ?? '');
        setNote(json.data.note ?? '');
      } else {
        setRecord(null);
        setIdPlanCode('');
        setNote('');
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [schoolId, academicYear, canSelectTeacher, selectedForUserId, currentUserId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const academicYearOptions = getAcademicYearOptions(2560, currentAcademicYear + 1);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        schoolId,
        academicYear,
        idPlanCode: idPlanCode.trim() || '-',
        note: note.trim() || null,
      };
      if (canSelectTeacher && selectedForUserId && selectedForUserId !== currentUserId) {
        body.forUserId = selectedForUserId;
      }
      const res = await fetch('/api/extra/teacher-id-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      toast.success('บันทึก ID plan เรียบร้อย');
      router.refresh();
      await fetchRecord();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  }

  if (schools.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-xl font-semibold mb-2">ID plan ของครู</h2>
      <p className="text-sm text-muted-foreground mb-2">
        บันทึกรหัสแผน (ID plan) ครู 1 คน 1 รายการ ต่อโรงเรียน ต่อปีการศึกษา
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
        <div className="space-y-4 max-w-xl">
          <div className="space-y-1">
            <label className="text-sm font-medium">รหัสแผน (ID plan) *</label>
            <input
              type="text"
              value={idPlanCode}
              onChange={(e) => setIdPlanCode(e.target.value)}
              placeholder="เช่น 1-2568-001"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก ID plan'}
          </Button>
        </div>
      )}
    </div>
  );
}
