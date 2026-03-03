'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLessonPlan } from '@/app/actions/lesson-plan';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { getAcademicYearOptions, getFiscalYearOptions } from '@/lib/year-options';

interface School {
  id: string;
  name: string;
}

interface LessonPlanFormProps {
  schools: School[];
  currentAcademicYear: number;
  currentFiscalYear: number;
  currentUserId: string;
  defaultSchoolId: string;
}

export default function LessonPlanForm({
  schools,
  currentAcademicYear,
  currentFiscalYear,
  currentUserId: _currentUserId,
  defaultSchoolId,
}: LessonPlanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>('');

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(defaultSchoolId);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(currentAcademicYear);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(currentFiscalYear);
  const [semester, setSemester] = useState<number | ''>(1);
  const [code, setCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [planType, setPlanType] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [planDate, setPlanDate] = useState<string>('');
  const [reflection, setReflection] = useState<string>('');

  const planTypeOptions = [
    { value: '', label: '-- เลือกประเภท --' },
    { value: 'แผนรายวิชา', label: 'แผนรายวิชา' },
    { value: 'แผนบูรณาการ', label: 'แผนบูรณาการ' },
  ];
  const gradeOptions = [
    '', 'อนุบาล 2', 'อนุบาล 3', 'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
    'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6', 'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3',
  ];
  const subjectOptions = [
    { value: '', label: '-- เลือกวิชา --' },
    { value: 'ไทย', label: 'ไทย' },
    { value: 'คณิต', label: 'คณิต' },
    { value: 'วิทย์', label: 'วิทย์' },
    { value: 'อังกฤษ', label: 'อังกฤษ' },
    { value: 'PBL', label: 'PBL' },
    { value: 'อื่น ๆ', label: 'อื่น ๆ' },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const formData = new FormData();
    formData.append('schoolId', selectedSchoolId);
    formData.append('code', code || '');
    formData.append('academicYear', selectedAcademicYear.toString());
    formData.append('fiscalYear', selectedFiscalYear.toString());
    if (semester !== '') formData.append('semester', semester.toString());
    formData.append('title', title);
    formData.append('planType', planType || '');
    formData.append('grade', grade || '');
    formData.append('room', room || '');
    formData.append('subject', subject || '');
    formData.append('description', description || '');
    formData.append('teacherName', teacherName);
    formData.append('planDate', planDate || '');
    formData.append('reflection', reflection || '');
    formData.append('status', 'DRAFT');

    startTransition(() => {
      createLessonPlan(formData)
        .then(async (result) => {
          if (!result.success) {
            setError(result.error || 'เกิดข้อผิดพลาด');
            await Swal.fire({
              icon: 'error',
              title: 'บันทึกไม่สำเร็จ',
              text: result.error || 'เกิดข้อผิดพลาดในการบันทึก',
              confirmButtonText: 'ตกลง',
            });
            return;
          }

          await Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'สร้างแผนการสอนเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง',
          });

          if (result.data?.id) {
            router.push(`/lesson-plans/${result.data.id}`);
          } else {
            router.push('/lesson-plans');
          }
        })
        .catch(async (error) => {
          const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
          setError(message);
          await Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: message,
            confirmButtonText: 'ตกลง',
          });
        });
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* 1. รหัสแผนการสอน */}
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium">
            รหัสแผนการสอน
          </label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="เช่น LP-2568-001"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* 2. ชื่อแผนการสอน */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            ชื่อแผนการสอน <span className="text-red-500">*</span>
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

        {/* 3. ประเภทแผนการสอน */}
        <div className="space-y-2">
          <label htmlFor="planType" className="text-sm font-medium">
            ประเภทแผนการสอน
          </label>
          <select
            id="planType"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {planTypeOptions.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. ชั้น + 5. ห้อง */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="grade" className="text-sm font-medium">
              ชั้น
            </label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- เลือกชั้น --</option>
              {gradeOptions.filter(Boolean).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="room" className="text-sm font-medium">
              ห้อง
            </label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="เช่น ห้อง 1"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* 6. วิชา */}
        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium">
            วิชา
          </label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {subjectOptions.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 7. รายละเอียด */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            รายละเอียด
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="รายละเอียดแผนการสอน..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          ไฟล์แนบแผนการสอน — บันทึกแล้วสามารถแนบไฟล์ได้ในหน้ารายละเอียดแผน
        </p>

        {/* 9. อื่น ๆ ที่จำเป็น: ปีการศึกษา ภาคเรียน วันที่ ชื่อครู โรงเรียน */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold">อื่น ๆ ที่จำเป็น</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <label htmlFor="semester" className="text-sm font-medium">
                ภาคเรียนที่
              </label>
              <select
                id="semester"
                value={semester === '' ? '' : semester}
                onChange={(e) => setSemester(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-- เลือก --</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
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
            <div className="space-y-2">
              <label htmlFor="planDate" className="text-sm font-medium">
                วันที่
              </label>
              <input
                type="date"
                id="planDate"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="teacherName" className="text-sm font-medium">
                ชื่อครูผู้สอน <span className="text-red-500">*</span>
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
          </div>
        </div>

        {/* Reflection */}
        <div className="space-y-2">
          <label htmlFor="reflection" className="text-sm font-medium">
            บันทึกหลังแผน
          </label>
          <textarea
            id="reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={6}
            placeholder="บันทึกผลการนำแผนไปใช้ สิ่งที่ได้เรียนรู้ ปัญหาที่พบ และแนวทางแก้ไข..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
          <Link href="/lesson-plans">
            <Button type="button" variant="outline">
              ยกเลิก
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

