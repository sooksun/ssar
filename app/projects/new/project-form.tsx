'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/app/actions/project';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { getAcademicYearOptions, getFiscalYearOptions } from '@/lib/year-options';

interface School {
  id: string;
  name: string;
}

interface Policy {
  id: string;
  code: string;
  nameTh: string;
}

interface QAIndicator {
  id: string;
  code: string;
  nameTh: string;
  standardCode: string;
  standardName: string;
}

interface PAIndicator {
  id: string;
  code: string;
  nameTh: string;
  aspectCode: string;
}

interface ProjectFormProps {
  schools: School[];
  policies: Policy[];
  qaIndicators: QAIndicator[];
  paIndicators: PAIndicator[];
  currentAcademicYear: number;
  currentFiscalYear: number;
  defaultSchoolId: string;
}

export default function ProjectForm({
  schools,
  policies,
  qaIndicators,
  paIndicators,
  currentAcademicYear,
  currentFiscalYear,
  defaultSchoolId,
}: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [obePolicyId, setObePolicyId] = useState('');
  const [qaIndicatorId, setQaIndicatorId] = useState('');
  const [paIndicatorId, setPaIndicatorId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [schoolUsers, setSchoolUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/projects/school-users?schoolId=${encodeURIComponent(schoolId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSchoolUsers(data);
        else setSchoolUsers([]);
      })
      .catch(() => setSchoolUsers([]));
  }, [schoolId]);

  const academicYearOptions = getAcademicYearOptions(2565, currentAcademicYear);
  const fiscalYearOptions = getFiscalYearOptions(2565, currentFiscalYear);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData();
    formData.append('schoolId', schoolId);
    formData.append('code', code.trim() || `PJ-${academicYear}-001`);
    formData.append('academicYear', academicYear.toString());
    formData.append('fiscalYear', fiscalYear.toString());
    if (responsibleUserId) formData.append('responsibleUserId', responsibleUserId);
    if (obePolicyId) formData.append('obePolicyId', obePolicyId);
    if (qaIndicatorId) formData.append('qaIndicatorId', qaIndicatorId);
    if (paIndicatorId) formData.append('paIndicatorId', paIndicatorId);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('status', 'DRAFT');

    startTransition(() => {
      createProject(formData)
        .then((result) => {
          if (!result.success) {
            setError(result.error || 'เกิดข้อผิดพลาด');
            toast.error(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
            return;
          }
          toast.success('บันทึกโครงการเรียบร้อย');
          const id = result.data?.id;
          if (id) router.push(`/projects/${id}`);
          else router.push('/projects');
        });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-white p-6">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">โรงเรียน *</label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            required
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">รหัสโครงการ *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="เช่น PJ-2568-001"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">ปีการศึกษา *</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
            className="w-full rounded-md border px-3 py-2"
          >
            {academicYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">ปีงบประมาณ *</label>
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="w-full rounded-md border px-3 py-2"
          >
            {fiscalYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">รหัสผู้รับผิดชอบโครงการ (ผู้ใช้ในระบบ)</label>
          <select
            value={responsibleUserId}
            onChange={(e) => setResponsibleUserId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">-- เลือกผู้รับผิดชอบ --</option>
            {schoolUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">สอดคล้องกับ นโยบาย สพฐ ข้อใด</label>
          <select
            value={obePolicyId}
            onChange={(e) => setObePolicyId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">-- เลือกนโยบาย สพฐ --</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.nameTh}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">สอดคล้องกับ ตัวชี้วัดการประกันคุณภาพ ใด</label>
          <select
            value={qaIndicatorId}
            onChange={(e) => setQaIndicatorId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">-- เลือกตัวชี้วัด QA --</option>
            {qaIndicators.map((q) => (
              <option key={q.id} value={q.id}>
                {q.standardCode}-{q.code} {q.nameTh}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">สอดคล้องกับ ตัวชี้วัด PA ใด</label>
          <select
            value={paIndicatorId}
            onChange={(e) => setPaIndicatorId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">-- เลือกตัวชี้วัด PA --</option>
            {paIndicators.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.nameTh}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">ชื่อโครงการ *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">รายละเอียด</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกโครงการ'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/projects')}
          disabled={isPending}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
