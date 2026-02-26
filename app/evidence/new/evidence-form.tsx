'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createEvidence,
  getStandardsByLevel,
  getIndicatorsByStandard,
  getNextEvidenceCode,
  getSubIndicatorsByIndicator,
} from '@/app/actions/evidence';
import { getEvidenceStatusLabel } from '@/lib/status';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { getAcademicYearOptions, getFiscalYearOptions } from '@/lib/year-options';

interface School {
  id: string;
  name: string;
}

interface Level {
  id: number;
  code: string;
  nameTh: string;
}

interface Standard {
  id: bigint;
  code: string;
  nameTh: string;
}

interface Indicator {
  id: bigint;
  code: string;
  nameTh: string;
}

interface SubIndicator {
  id: string;
  itemNo: number;
  textTh: string;
}

interface IndicatorData {
  id: string;
  code: string;
  nameTh: string;
  standardId: string;
  standardCode: string;
  standardName: string;
  levelId: number;
  levelCode: string;
  levelName: string;
}

interface EvidenceFormProps {
  schools: School[];
  levels: Level[];
  currentFiscalYear: number; // ปีงบประมาณ
  currentAcademicYear: number; // ปีการศึกษา
  currentUserId: string;
  userRoles: Array<{ role: string; schoolId: string; schoolName: string }>;
  indicatorIdParam?: string | null;
  indicatorData?: IndicatorData | null;
  defaultSchoolId: string;
}

export default function EvidenceForm({
  schools,
  levels,
  currentFiscalYear,
  currentAcademicYear,
  currentUserId,
  userRoles,
  indicatorIdParam,
  indicatorData,
  defaultSchoolId,
}: EvidenceFormProps) {
  const router = useRouter();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    defaultSchoolId || schools[0]?.id || ''
  );
  const [selectedLevelId, setSelectedLevelId] = useState<number | ''>(
    indicatorData?.levelId || ''
  );
  const [selectedStandardId, setSelectedStandardId] = useState<string>(
    indicatorData?.standardId || ''
  );
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>(
    indicatorIdParam || ''
  );
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(currentFiscalYear);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(currentAcademicYear);
  
  const [standards, setStandards] = useState<Standard[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [evidenceCode, setEvidenceCode] = useState<string>('');
  const [isLoadingStandards, setIsLoadingStandards] = useState(false);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isLoadingSubIndicators, setIsLoadingSubIndicators] = useState(false);
  const [subIndicators, setSubIndicators] = useState<SubIndicator[]>([]);
  const [titleValue, setTitleValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(defaultSchoolId || schools[0].id);
    }
  }, [defaultSchoolId, schools, selectedSchoolId]);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  // Auto-load standards และ indicators เมื่อมี indicatorData
  useEffect(() => {
    if (indicatorData && selectedLevelId === indicatorData.levelId) {
      // Load standards
      setIsLoadingStandards(true);
      getStandardsByLevel(indicatorData.levelId)
        .then((result) => {
          if (result.success && result.data) {
            setStandards(result.data);
            setSelectedStandardId(indicatorData.standardId);
          }
          setIsLoadingStandards(false);
        })
        .catch(() => {
          setIsLoadingStandards(false);
        });
    }
  }, [indicatorData, selectedLevelId]);

  useEffect(() => {
    if (indicatorData && selectedStandardId === indicatorData.standardId) {
      // Load indicators
      setIsLoadingIndicators(true);
      getIndicatorsByStandard(indicatorData.standardId)
        .then((result) => {
          if (result.success && result.data) {
            setIndicators(result.data);
            setSelectedIndicatorId(indicatorData.id);
          }
          setIsLoadingIndicators(false);
        })
        .catch(() => {
          setIsLoadingIndicators(false);
        });
    }
  }, [indicatorData, selectedStandardId]);

  // Load standards เมื่อเลือก level (ถ้าไม่มี indicatorData หรือ level เปลี่ยน)
  useEffect(() => {
    if (selectedLevelId && (!indicatorData || indicatorData.levelId !== selectedLevelId)) {
      setIsLoadingStandards(true);
      getStandardsByLevel(Number(selectedLevelId))
        .then((result) => {
          if (result.success && result.data) {
            setStandards(result.data);
            setSelectedStandardId(''); // Reset standard
            setSelectedIndicatorId(''); // Reset indicator
            setIndicators([]);
            setEvidenceCode('');
          }
          setIsLoadingStandards(false);
        })
        .catch(() => {
          setIsLoadingStandards(false);
        });
    } else if (!selectedLevelId) {
      setStandards([]);
      setSelectedStandardId('');
      setSelectedIndicatorId('');
      setIndicators([]);
      setEvidenceCode('');
    }
  }, [selectedLevelId, indicatorData]);

  // Load indicators เมื่อเลือก standard (ถ้าไม่มี indicatorData หรือ standard เปลี่ยน)
  useEffect(() => {
    if (selectedStandardId && (!indicatorData || indicatorData.standardId !== selectedStandardId)) {
      setIsLoadingIndicators(true);
      getIndicatorsByStandard(selectedStandardId)
        .then((result) => {
          if (result.success && result.data) {
            setIndicators(result.data);
            setSelectedIndicatorId(''); // Reset indicator
            setEvidenceCode('');
          }
          setIsLoadingIndicators(false);
        })
        .catch(() => {
          setIsLoadingIndicators(false);
        });
    } else if (!selectedStandardId) {
      setIndicators([]);
      setSelectedIndicatorId('');
      setEvidenceCode('');
    }
  }, [selectedStandardId, indicatorData]);

  // Load evidence code เมื่อเลือก indicator หรือเปลี่ยน fiscalYear
  useEffect(() => {
    if (selectedIndicatorId) {
      setIsLoadingCode(true);
      getNextEvidenceCode(selectedIndicatorId, selectedFiscalYear)
        .then((result) => {
          if (result.success && result.data) {
            setEvidenceCode(result.data);
          }
          setIsLoadingCode(false);
        })
        .catch(() => {
          setIsLoadingCode(false);
        });
    } else {
      setEvidenceCode('');
    }
  }, [selectedIndicatorId, selectedFiscalYear]);

  // Load sub indicators เมื่อเลือก indicator
  useEffect(() => {
    if (selectedIndicatorId) {
      setIsLoadingSubIndicators(true);
      setTitleValue('');
      getSubIndicatorsByIndicator(selectedIndicatorId)
        .then((result) => {
          if (result.success && result.data) {
            setSubIndicators(result.data);
          } else {
            setSubIndicators([]);
          }
          setIsLoadingSubIndicators(false);
        })
        .catch(() => {
          setIsLoadingSubIndicators(false);
          setSubIndicators([]);
        });
    } else {
      setSubIndicators([]);
      setTitleValue('');
    }
  }, [selectedIndicatorId]);

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(() => {
      createEvidence(formData)
        .then(async (result) => {
          if (!result.success) {
            setError(result.error || 'เกิดข้อผิดพลาด');
            await Swal.fire({
              icon: 'error',
              title: 'บันทึกไม่สำเร็จ',
              text: result.error || 'เกิดข้อผิดพลาดในการบันทึกหลักฐาน',
              confirmButtonText: 'ตกลง',
            });
            return;
          }

          await Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'สร้างหลักฐานเรียบร้อยแล้ว',
            confirmButtonText: 'ตกลง',
          });

          // ถ้าสำเร็จ redirect ไปหน้าที่กำหนด
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        })
        .catch(async (error) => {
          const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
          setError(message);
          await Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกหลักฐาน',
            confirmButtonText: 'ตกลง',
          });
        });
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        {/* School Selection */}
        <input type="hidden" name="schoolId" value={selectedSchoolId} />
        <div className="space-y-2">
          <label className="text-sm font-medium">โรงเรียน</label>
          {schools.length <= 1 ? (
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
              {selectedSchool?.name || '-'}
            </div>
          ) : (
            <select
              id="schoolId"
              required
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">เลือกโรงเรียน</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Level Selection */}
        <div className="space-y-2">
          <label htmlFor="levelId" className="text-sm font-medium">
            ระดับการศึกษา <span className="text-destructive">*</span>
          </label>
          <select
            id="levelId"
            name="levelId"
            required
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(Number(e.target.value) || '')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">เลือกระดับการศึกษา</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.nameTh}
              </option>
            ))}
          </select>
        </div>

        {/* Standard Selection */}
        <div className="space-y-2">
          <label htmlFor="standardId" className="text-sm font-medium">
            มาตรฐาน <span className="text-destructive">*</span>
          </label>
          <select
            id="standardId"
            name="standardId"
            required
            disabled={!selectedLevelId || isLoadingStandards}
            value={selectedStandardId}
            onChange={(e) => setSelectedStandardId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">
              {isLoadingStandards ? 'กำลังโหลด...' : 'เลือกมาตรฐาน'}
            </option>
            {standards.map((standard) => (
              <option key={standard.id.toString()} value={standard.id.toString()}>
                {standard.code} - {standard.nameTh}
              </option>
            ))}
          </select>
        </div>

        {/* Indicator Selection */}
        <div className="space-y-2">
          <label htmlFor="indicatorId" className="text-sm font-medium">
            ตัวชี้วัด <span className="text-destructive">*</span>
          </label>
          <select
            id="indicatorId"
            name="indicatorId"
            required
            disabled={!selectedStandardId || isLoadingIndicators}
            value={selectedIndicatorId}
            onChange={(e) => setSelectedIndicatorId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">
              {isLoadingIndicators ? 'กำลังโหลด...' : 'เลือกตัวชี้วัด'}
            </option>
            {indicators.map((indicator) => (
              <option key={indicator.id.toString()} value={indicator.id.toString()}>
                {indicator.code} - {indicator.nameTh}
              </option>
            ))}
          </select>
        </div>

        {/* Fiscal Year */}
        <div className="space-y-2">
          <label htmlFor="fiscalYear" className="text-sm font-medium">
            ปีงบประมาณ <span className="text-destructive">*</span>
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

        {/* Academic Year */}
        <div className="space-y-2">
          <label htmlFor="academicYear" className="text-sm font-medium">
            ปีการศึกษา <span className="text-destructive">*</span>
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

        {/* Evidence Code */}
        <div className="space-y-2">
          <label htmlFor="evidenceCode" className="text-sm font-medium">
            รหัสหลักฐาน
          </label>
          <input
            type="text"
            id="evidenceCode"
            name="evidenceCode"
            readOnly
            value={evidenceCode || (isLoadingCode ? 'กำลังสร้างรหัส...' : '')}
            placeholder="รหัสจะถูกสร้างอัตโนมัติ"
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            รหัสจะถูกสร้างอัตโนมัติเมื่อเลือกตัวชี้วัด
          </p>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            ชื่อหลักฐาน <span className="text-destructive">*</span>
          </label>
          {selectedIndicatorId && !isLoadingSubIndicators && subIndicators.length === 0 ? (
            <>
              <input
                type="text"
                id="title"
                name="title"
                required
                maxLength={255}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="ระบุชื่อหลักฐาน"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                ไม่พบรายการตัวชี้วัดย่อยสำหรับตัวชี้วัดนี้ กรุณาพิมพ์ชื่อหลักฐานด้วยตนเอง
              </p>
            </>
          ) : (
            <select
              id="title"
              name="title"
              required
              disabled={!selectedIndicatorId || isLoadingSubIndicators}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">
                {isLoadingSubIndicators
                  ? 'กำลังโหลด...'
                  : subIndicators.length > 0
                    ? 'เลือกชื่อหลักฐาน'
                    : 'เลือกรายการตัวชี้วัดก่อน'}
              </option>
              {subIndicators.map((sub) => (
                <option key={sub.id} value={sub.textTh}>
                  {sub.itemNo}. {sub.textTh}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            รายละเอียด
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="ระบุรายละเอียดเพิ่มเติม"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Owner */}
        <div className="space-y-2">
          <label htmlFor="ownerUserId" className="text-sm font-medium">
            เจ้าของหลักฐาน
          </label>
          <input
            type="hidden"
            name="ownerUserId"
            value={currentUserId}
          />
          <input
            type="text"
            readOnly
            value={selectedSchool?.name || userRoles[0]?.schoolName || 'ผู้ใช้ปัจจุบัน'}
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background cursor-not-allowed"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            สถานะ
          </label>
          <select
            id="status"
            name="status"
            defaultValue="PENDING"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
          <option value="PENDING">{getEvidenceStatusLabel('PENDING')}</option>
          <option value="READY">{getEvidenceStatusLabel('READY')}</option>
          </select>
        </div>

        {/* Privacy Level */}
        <div className="space-y-2">
          <label htmlFor="privacyLevel" className="text-sm font-medium">
            ระดับความลับ
          </label>
          <select
            id="privacyLevel"
            name="privacyLevel"
            defaultValue="INTERNAL"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="PUBLIC">PUBLIC</option>
            <option value="INTERNAL">INTERNAL</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={isPending || !selectedIndicatorId}
            className="flex-1"
          >
            {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
          <Button
            type="submit"
            name="action"
            value="save-and-add-files"
            variant="outline"
            disabled={isPending || !selectedIndicatorId}
            className="flex-1"
          >
            {isPending ? 'กำลังบันทึก...' : 'บันทึกและเพิ่มไฟล์'}
          </Button>
          <Link href="/evidence">
            <Button type="button" variant="outline">
              ยกเลิก
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

