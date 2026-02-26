'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';
import { getFiscalYearOptions } from '@/lib/year-options';
import * as Dialog from '@radix-ui/react-dialog';

interface School {
  id: string;
  name: string;
}

interface CreatePAAgreementFormProps {
  schools: School[];
  currentFiscalYear: number;
  currentUserId: string;
}

/** คำนวณวันเริ่ม-สิ้นสุดปีงบประมาณ (ต.ค. - ก.ย.) */
function fiscalYearToDateRange(fiscalYear: number): { start: string; end: string } {
  const startCe = fiscalYear - 544; // ต.ค. ปีก่อน → 2568 → 2024
  const endCe = fiscalYear - 543;   // ก.ย. ปีปัจจุบัน → 2568 → 2025
  return {
    start: `${startCe}-10-01`,
    end: `${endCe}-09-30`,
  };
}

export function CreatePAAgreementForm({
  schools,
  currentFiscalYear,
  currentUserId,
}: CreatePAAgreementFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [positionType, setPositionType] = useState<'TEACHER' | 'PRINCIPAL'>('TEACHER');
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);
  const [startDate, setStartDate] = useState(fiscalYearToDateRange(currentFiscalYear).start);
  const [endDate, setEndDate] = useState(fiscalYearToDateRange(currentFiscalYear).end);
  const [isPending, startTransition] = useTransition();
  const fiscalYearOptions = getFiscalYearOptions();

  const updateDatesForFiscalYear = (year: number) => {
    const { start, end } = fiscalYearToDateRange(year);
    setStartDate(start);
    setEndDate(end);
  };

  const handleFiscalYearChange = (value: number) => {
    setFiscalYear(value);
    updateDatesForFiscalYear(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกโรงเรียน', confirmButtonText: 'ตกลง' });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/pa/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            userId: currentUserId,
            fiscalYear,
            startDate,
            endDate,
            positionType,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          await Swal.fire({
            icon: 'error',
            title: 'สร้างข้อตกลงไม่สำเร็จ',
            text: data.error || 'เกิดข้อผิดพลาด',
            confirmButtonText: 'ตกลง',
          });
          return;
        }
        await Swal.fire({
          icon: 'success',
          title: 'สร้างข้อตกลงสำเร็จ',
          text: `สร้างข้อตกลง PA ปีงบประมาณ ${fiscalYear} เรียบร้อยแล้ว`,
          confirmButtonText: 'ตกลง',
        });
        setOpen(false);
        router.refresh();
        if (data.id) {
          router.push(`/pa/agreements/${data.id}`);
        }
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err instanceof Error ? err.message : 'ไม่สามารถสร้างข้อตกลงได้',
          confirmButtonText: 'ตกลง',
        });
      }
    });
  };

  if (schools.length === 0) {
    return null;
  }

  const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" size="default">
          สร้างข้อตกลง PA
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <Dialog.Title className="text-xl font-semibold">สร้างข้อตกลง PA</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            เลือกโรงเรียนและปีงบประมาณ ระบบจะสร้างรายการตัวชี้วัด 15 รายการ (ส่วนที่ 1) ให้อัตโนมัติ
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="pa-position" className="text-sm font-medium">
                ตำแหน่ง <span className="text-destructive">*</span>
              </label>
              <select
                id="pa-position"
                required
                value={positionType}
                onChange={(e) => setPositionType(e.target.value as 'TEACHER' | 'PRINCIPAL')}
                className={inputClass}
              >
                <option value="TEACHER">ครู (3 ด้าน 15 ตัวชี้วัด)</option>
                <option value="PRINCIPAL">ผู้บริหารสถานศึกษา (5 ด้าน 15 ตัวชี้วัด)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="pa-school" className="text-sm font-medium">
                โรงเรียน <span className="text-destructive">*</span>
              </label>
              <select
                id="pa-school"
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
              <label htmlFor="pa-fiscal-year" className="text-sm font-medium">
                ปีงบประมาณ <span className="text-destructive">*</span>
              </label>
              <select
                id="pa-fiscal-year"
                required
                value={fiscalYear}
                onChange={(e) => handleFiscalYearChange(Number(e.target.value))}
                className={inputClass}
              >
                {fiscalYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="pa-start-date" className="text-sm font-medium">
                  วันเริ่มต้น
                </label>
                <input
                  id="pa-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="pa-end-date" className="text-sm font-medium">
                  วันสิ้นสุด
                </label>
                <input
                  id="pa-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  ยกเลิก
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'กำลังสร้าง...' : 'สร้างข้อตกลง'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
