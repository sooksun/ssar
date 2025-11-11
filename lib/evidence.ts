import { prisma } from './db';

/**
 * คำนวณปีงบประมาณไทย (ต.ค.→ก.ย.)
 * ต.ค.–ธ.ค. = ปีค.ศ. + 544
 * ม.ค.–ก.ย. = ปีค.ศ. + 543
 */
export function thaiFiscalYear(d: Date = new Date()): number {
  const m = d.getMonth() + 1; // 1-12
  const y = d.getFullYear();
  return m >= 10 ? y + 544 : y + 543;
}

/**
 * สร้างรหัสหลักฐานอัตโนมัติ: ${indicator.code}-${running2digits}
 * ตัวอย่าง: 2.3-01, 2.3-02, ...
 */
export async function nextEvidenceCode(
  indicatorId: bigint,
  fiscalYear: number
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
      fiscalYear,
      del: false,
    },
  });

  const nextNumber = existingCount + 1;
  const runningCode = String(nextNumber).padStart(2, '0');

  return `${indicator.code}-${runningCode}`;
}