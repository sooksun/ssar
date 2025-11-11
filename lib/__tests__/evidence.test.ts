import { describe, it, expect, beforeEach, vi } from 'vitest';
import { thaiFiscalYear } from '../evidence';

// Mock Prisma Client สำหรับ nextEvidenceCode
const mockFindUnique = vi.fn();
const mockCount = vi.fn();

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({
      qAIndicator: {
        findUnique: mockFindUnique,
      },
      evidence: {
        count: mockCount,
      },
    })),
  };
});

// Dynamic import สำหรับ nextEvidenceCode หลัง mock
let nextEvidenceCode: (
  indicatorId: bigint,
  fiscalYear: number
) => Promise<string>;

beforeAll(async () => {
  const evidenceModule = await import('../evidence');
  nextEvidenceCode = evidenceModule.nextEvidenceCode;
});

describe('thaiFiscalYear', () => {
  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนตุลาคม (ต.ค.)', () => {
    // 15 ต.ค. 2567 → ปีงบประมาณ 2568
    const date = new Date(2024, 9, 15); // เดือน 9 = ต.ค.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2024 + 544
  });

  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนธันวาคม (ธ.ค.)', () => {
    // 31 ธ.ค. 2567 → ปีงบประมาณ 2568
    const date = new Date(2024, 11, 31); // เดือน 11 = ธ.ค.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2024 + 544
  });

  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนมกราคม (ม.ค.)', () => {
    // 15 ม.ค. 2568 → ปีงบประมาณ 2568
    const date = new Date(2025, 0, 15); // เดือน 0 = ม.ค.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2025 + 543
  });

  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนกันยายน (ก.ย.)', () => {
    // 30 ก.ย. 2568 → ปีงบประมาณ 2568
    const date = new Date(2025, 8, 30); // เดือน 8 = ก.ย.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2025 + 543
  });

  it('ควรใช้วันที่ปัจจุบันเป็น default parameter', () => {
    const result = thaiFiscalYear();
    const now = new Date();
    const expected = now.getMonth() + 1 >= 10
      ? now.getFullYear() + 544
      : now.getFullYear() + 543;
    expect(result).toBe(expected);
  });

  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนพฤศจิกายน (พ.ย.)', () => {
    // 15 พ.ย. 2567 → ปีงบประมาณ 2568
    const date = new Date(2024, 10, 15); // เดือน 10 = พ.ย.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2024 + 544
  });

  it('ควรคำนวณปีงบประมาณถูกต้องสำหรับเดือนกุมภาพันธ์ (ก.พ.)', () => {
    // 15 ก.พ. 2568 → ปีงบประมาณ 2568
    const date = new Date(2025, 1, 15); // เดือน 1 = ก.พ.
    const result = thaiFiscalYear(date);
    expect(result).toBe(2568); // 2025 + 543
  });
});

describe('nextEvidenceCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควรสร้างรหัสหลักฐานแรกสำหรับ indicator ที่ไม่มีหลักฐาน', async () => {
    const indicatorId = BigInt(1);
    const fiscalYear = 2568;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '2.3',
    });

    // Mock count (ไม่มีหลักฐาน)
    mockCount.mockResolvedValue(0);

    const result = await nextEvidenceCode(indicatorId, fiscalYear);

    expect(result).toBe('2.3-01');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: indicatorId },
      select: { code: true },
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        indicatorId,
        fiscalYear,
        del: false,
      },
    });
  });

  it('ควรสร้างรหัสหลักฐานลำดับถัดไปเมื่อมีหลักฐานอยู่แล้ว', async () => {
    const indicatorId = BigInt(1);
    const fiscalYear = 2568;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '2.3',
    });

    // Mock count (มีหลักฐาน 2 รายการ)
    mockCount.mockResolvedValue(2);

    const result = await nextEvidenceCode(indicatorId, fiscalYear);

    expect(result).toBe('2.3-03'); // 2 + 1 = 3 → 03
  });

  it('ควรสร้างรหัสหลักฐานสำหรับ indicator อื่น', async () => {
    const indicatorId = BigInt(5);
    const fiscalYear = 2568;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '1.1',
    });

    // Mock count (มีหลักฐาน 5 รายการ)
    mockCount.mockResolvedValue(5);

    const result = await nextEvidenceCode(indicatorId, fiscalYear);

    expect(result).toBe('1.1-06'); // 5 + 1 = 6 → 06
  });

  it('ควร throw error เมื่อไม่พบ indicator', async () => {
    const indicatorId = BigInt(999);
    const fiscalYear = 2568;

    // Mock indicator ไม่พบ
    mockFindUnique.mockResolvedValue(null);

    await expect(nextEvidenceCode(indicatorId, fiscalYear)).rejects.toThrow(
      'Indicator 999 not found'
    );
  });

  it('ควรใช้ปีงบประมาณที่ถูกต้องในการนับหลักฐาน', async () => {
    const indicatorId = BigInt(1);
    const fiscalYear = 2567;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '2.3',
    });

    // Mock count
    mockCount.mockResolvedValue(0);

    await nextEvidenceCode(indicatorId, fiscalYear);

    expect(mockCount).toHaveBeenCalledWith({
      where: {
        indicatorId,
        fiscalYear: 2567,
        del: false,
      },
    });
  });

  it('ควร pad รหัสให้เป็น 2 หลักเสมอ', async () => {
    const indicatorId = BigInt(1);
    const fiscalYear = 2568;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '1.1',
    });

    // Mock count (มีหลักฐาน 9 รายการ)
    mockCount.mockResolvedValue(9);

    const result = await nextEvidenceCode(indicatorId, fiscalYear);

    expect(result).toBe('1.1-10'); // 9 + 1 = 10 → 10 (ไม่ต้อง pad)
  });

  it('ควร pad รหัสให้เป็น 2 หลักเมื่อน้อยกว่า 10', async () => {
    const indicatorId = BigInt(1);
    const fiscalYear = 2568;

    // Mock indicator
    mockFindUnique.mockResolvedValue({
      code: '3.2',
    });

    // Mock count (มีหลักฐาน 0 รายการ)
    mockCount.mockResolvedValue(0);

    const result = await nextEvidenceCode(indicatorId, fiscalYear);

    expect(result).toBe('3.2-01'); // 0 + 1 = 1 → 01 (pad เป็น 2 หลัก)
  });
});
