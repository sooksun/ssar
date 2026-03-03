'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTeachingMedia } from '@/app/actions/teaching-media';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { getAcademicYearOptions, getFiscalYearOptions } from '@/lib/year-options';

interface School {
  id: string;
  name: string;
}

interface TeachingMediaFormProps {
  schools: School[];
  currentAcademicYear: number;
  currentFiscalYear: number;
  currentUserId: string;
  defaultSchoolId: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
}

export default function TeachingMediaForm({
  schools,
  currentAcademicYear,
  currentFiscalYear,
  currentUserId: _currentUserId,
  defaultSchoolId,
  indicatorId,
  indicatorCode,
  indicatorName,
}: TeachingMediaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>('');

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(defaultSchoolId);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(currentAcademicYear);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(currentFiscalYear);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const formData = new FormData();
    formData.append('schoolId', selectedSchoolId);
    formData.append('indicatorId', indicatorId);
    formData.append('academicYear', selectedAcademicYear.toString());
    formData.append('fiscalYear', selectedFiscalYear.toString());
    formData.append('title', title);
    formData.append('description', description || '');
    formData.append('teacherName', teacherName);
    formData.append('status', 'DRAFT');

    startTransition(() => {
      createTeachingMedia(formData)
        .then(async (result) => {
          if (!result.success) {
            setError(result.error || 'เกิดข้อผิดพลาด');
            toast.error(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
            return;
          }

          toast.success('สร้างสื่อการสอนเรียบร้อยแล้ว');

          if (result.data?.id) {
            router.push(`/teaching-media/${result.data.id}`);
          } else {
            router.push('/teaching-media');
          }
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
          setError(message);
          toast.error(message);
        });
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* School */}
        <div className="space-y-2">
          <label htmlFor="schoolId" className="text-sm font-medium">
            โรงเรียน <span className="text-red-500">*</span>
          </label>
          <select
            id="schoolId"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator (Read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">ตัวชี้วัด</label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed">
            {indicatorCode} - {indicatorName}
          </div>
          <input type="hidden" name="indicatorId" value={indicatorId} />
        </div>

        {/* Academic Year */}
        <div className="space-y-2">
          <label htmlFor="academicYear" className="text-sm font-medium">
            ปีการศึกษา <span className="text-red-500">*</span>
          </label>
          <select
            id="academicYear"
            name="academicYear"
            required
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(parseInt(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {getAcademicYearOptions(2566).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Fiscal Year */}
        <div className="space-y-2">
          <label htmlFor="fiscalYear" className="text-sm font-medium">
            ปีงบประมาณ <span className="text-red-500">*</span>
          </label>
          <select
            id="fiscalYear"
            name="fiscalYear"
            required
            value={selectedFiscalYear}
            onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {getFiscalYearOptions(2566).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            ชื่อสื่อ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            รายละเอียดสื่อ
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Teacher Name */}
        <div className="space-y-2">
          <label htmlFor="teacherName" className="text-sm font-medium">
            ชื่อครูผู้ผลิตสื่อ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="teacherName"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
          <Link href="/teaching-media">
            <Button type="button" variant="outline">
              ยกเลิก
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

