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

/** escape อักขระพิเศษ regex — รหัสตัวชี้วัดมีจุด เช่น "2.3" */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * สร้างรหัสหลักฐานอัตโนมัติ: ${indicator.code}-${running2digits}
 * ตัวอย่าง: 2.3-01, 2.3-02, ...
 *
 * นับต่อจาก "เลขสูงสุดที่เคยออก" ไม่ใช่จำนวนแถวที่เหลืออยู่
 * เพราะการ soft delete จะทำให้จำนวนลดลงและรหัสถัดไปชนกับรหัสที่ออกไปแล้ว
 * — จึงต้องนับรวมแถวที่ del = true ด้วย
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

  const prefix = `${indicator.code}-`;

  const existing = await prisma.evidence.findMany({
    where: {
      indicatorId,
      fiscalYear: academicYear, // ใช้ academicYear แต่เก็บใน field fiscalYear (เพื่อความเข้ากันได้กับฐานข้อมูล)
      evidenceCode: { startsWith: prefix },
    },
    select: { evidenceCode: true },
  });

  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
  let maxNumber = 0;
  for (const row of existing) {
    const matched = row.evidenceCode ? pattern.exec(row.evidenceCode) : null;
    if (!matched) continue;
    const parsed = Number.parseInt(matched[1], 10);
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }

  const runningCode = String(maxNumber + 1).padStart(2, '0');

  return `${prefix}${runningCode}`;
}

/** true เมื่อ error คือการชน unique index ของรหัสหลักฐาน (P2002 บน evidenceCode) */
function isEvidenceCodeConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, meta } = error as { code?: string; meta?: { target?: unknown } };
  if (code !== 'P2002') return false;
  const target = meta?.target;
  const asText = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return asText.includes('evidenceCode');
}

/**
 * ออกรหัสหลักฐานแล้วสร้างแถว โดยลองใหม่เมื่อชนรหัสที่ผู้ใช้อื่นเพิ่งใช้ไป
 *
 * การอ่านเลขสูงสุดกับการ insert ไม่ได้อยู่ใน transaction เดียวกัน — สองคำขอที่มาพร้อมกัน
 * จึงอาจได้เลขเดียวกัน unique index ที่ฐานข้อมูลจะกันไว้ให้ แต่ฝั่งผู้ใช้ต้องไม่เห็น error
 * ของ Prisma ดิบ ๆ จึงออกเลขใหม่แล้วลองซ้ำ
 */
export async function createWithEvidenceCode<T>(
  indicatorId: bigint,
  academicYear: number,
  create: (evidenceCode: string) => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const evidenceCode = await nextEvidenceCode(indicatorId, academicYear);
    try {
      return await create(evidenceCode);
    } catch (error) {
      if (!isEvidenceCodeConflict(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
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