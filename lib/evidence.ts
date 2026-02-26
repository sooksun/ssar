import { prisma } from './db';

/**
 * Evidence helpers — PQA องค์ประกอบที่ 1 (หลักฐาน)
 * หลักฐานเป็น "ฐานร่วม": ชิ้นเดียวกันใช้รองรับได้ทั้ง QA (ตัวชี้วัดระดับองค์กร) และ PA (การประเมินผลการปฏิบัติงาน)
 * @see docs/PQA_FRAMEWORK.md
 */

/**
 * คำนวณปีการศึกษาไทย (พ.ค.→เม.ย. ของปีถัดไป)
 * พ.ค.–ธ.ค. = ปีค.ศ. + 543
 * ม.ค.–เม.ย. = ปีค.ศ. + 542
 */
export function thaiAcademicYear(d: Date = new Date()): number {
  const m = d.getMonth() + 1; // 1-12
  const y = d.getFullYear();
  return m >= 5 ? y + 543 : y + 542;
}

/**
 * คำนวณปีงบประมาณไทย (ต.ค.→ก.ย. ของปีถัดไป)
 * ต.ค.–ธ.ค. = ปีค.ศ. + 543
 * ม.ค.–ก.ย. = ปีค.ศ. + 542
 */
export function thaiFiscalYear(d: Date = new Date()): number {
  const m = d.getMonth() + 1; // 1-12
  const y = d.getFullYear();
  return m >= 10 ? y + 543 : y + 542;
}

/**
 * สร้างรหัสหลักฐานอัตโนมัติ: ${indicator.code}-${running2digits}
 * ตัวอย่าง: 2.3-01, 2.3-02, ...
 */
export async function nextEvidenceCode(
  indicatorId: bigint,
  academicYear: number
): Promise<string> {
  const indicator = await prisma.qAIndicator.findUnique({
    where: { id: indicatorId },
    select: { code: true },
  });

  if (!indicator) {
    throw new Error(`Indicator ${indicatorId} not found`);
  }

  const existingCount = await prisma.evidence.count({
    where: {
      indicatorId,
      fiscalYear: academicYear, // ใช้ academicYear แต่เก็บใน field fiscalYear (เพื่อความเข้ากันได้กับฐานข้อมูล)
      del: false,
    },
  });

  const nextNumber = existingCount + 1;
  const runningCode = String(nextNumber).padStart(2, '0');

  return `${indicator.code}-${runningCode}`;
}

/**
 * ดึง QAIndicator ตัวแรกของระดับ BASIC สำหรับใช้เป็น default เมื่อสร้างหลักฐานจากหน้า "เก็บงาน"
 * (ก่อนให้ AI แนะนำตัวชี้วัดจริง)
 */
export async function getDefaultQAIndicatorId(): Promise<bigint> {
  const indicator = await prisma.qAIndicator.findFirst({
    where: { standard: { level: { code: 'BASIC' } } },
    orderBy: [{ standard: { sortNo: 'asc' } }, { sortNo: 'asc' }],
    select: { id: true },
  });
  if (!indicator) throw new Error('ไม่พบตัวชี้วัด QA ระดับ BASIC สำหรับใช้เป็นค่าเริ่มต้น');
  return indicator.id;
}