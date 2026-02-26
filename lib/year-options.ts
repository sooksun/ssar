import { thaiAcademicYear, thaiFiscalYear } from './evidence';

/**
 * สร้างรายการปีการศึกษา (academicYear) สำหรับ dropdown
 * @param startYear ปีเริ่มต้น (default: 2566)
 * @param endYear ปีสิ้นสุด (default: ปีปัจจุบัน)
 * @returns Array ของปีการศึกษา
 */
export function getAcademicYearOptions(startYear: number = 2566, endYear?: number): number[] {
  const currentYear = thaiAcademicYear();
  const maxYear = endYear || currentYear;
  const years: number[] = [];
  for (let year = startYear; year <= maxYear; year++) {
    years.push(year);
  }
  return years.reverse(); // เรียงจากใหม่ไปเก่า
}

/**
 * สร้างรายการปีงบประมาณ (fiscalYear) สำหรับ dropdown
 * @param startYear ปีเริ่มต้น (default: 2566)
 * @param endYear ปีสิ้นสุด (default: ปีปัจจุบัน)
 * @returns Array ของปีงบประมาณ
 */
export function getFiscalYearOptions(startYear: number = 2566, endYear?: number): number[] {
  const currentYear = thaiFiscalYear();
  const maxYear = endYear || currentYear;
  const years: number[] = [];
  for (let year = startYear; year <= maxYear; year++) {
    years.push(year);
  }
  return years.reverse(); // เรียงจากใหม่ไปเก่า
}

