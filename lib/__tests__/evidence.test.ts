import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { thaiAcademicYear } from '../evidence';

// Mock Prisma client สำหรับ nextEvidenceCode — ใช้ vi.hoisted เพื่อให้มีค่าก่อน vi.mock ทำงาน
// mock ที่ '@/lib/db' (singleton ที่โค้ดใช้จริง) ไม่ใช่ constructor ของ '@prisma/client'
const { mockFindUnique, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    qAIndicator: {
      findUnique: mockFindUnique,
    },
    evidence: {
      findMany: mockFindMany,
    },
  },
}));

// Dynamic import สำหรับ nextEvidenceCode หลัง mock
let nextEvidenceCode: (
  indicatorId: bigint,
  fiscalYear: number
) => Promise<string>;
let createWithEvidenceCode: typeof import('../evidence').createWithEvidenceCode;

beforeAll(async () => {
  const evidenceModule = await import('../evidence');
  nextEvidenceCode = evidenceModule.nextEvidenceCode;
  createWithEvidenceCode = evidenceModule.createWithEvidenceCode;
});

/** จำลอง error ของ Prisma เมื่อชน unique index */
function uniqueViolation(target: string[]) {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target },
  });
}

describe('thaiAcademicYear', () => {
  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนพฤษภาคม (พ.ค.)', () => {
    // 15 พ.ค. 2567 → ปีการศึกษา 2567
    const date = new Date(2024, 4, 15); // เดือน 4 = พ.ค.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2024 + 543
  });

  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนธันวาคม (ธ.ค.)', () => {
    // 31 ธ.ค. 2567 → ปีการศึกษา 2567
    const date = new Date(2024, 11, 31); // เดือน 11 = ธ.ค.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2024 + 543
  });

  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนมกราคม (ม.ค.)', () => {
    // 15 ม.ค. 2568 → ปีการศึกษา 2567
    const date = new Date(2025, 0, 15); // เดือน 0 = ม.ค.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2025 + 542
  });

  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนเมษายน (เม.ย.)', () => {
    // 30 เม.ย. 2568 → ปีการศึกษา 2567
    const date = new Date(2025, 3, 30); // เดือน 3 = เม.ย.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2025 + 542
  });

  it('ควรใช้วันที่ปัจจุบันเป็น default parameter', () => {
    const result = thaiAcademicYear();
    const now = new Date();
    const expected = now.getMonth() + 1 >= 5
      ? now.getFullYear() + 543
      : now.getFullYear() + 542;
    expect(result).toBe(expected);
  });

  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนพฤศจิกายน (พ.ย.)', () => {
    // 15 พ.ย. 2567 → ปีการศึกษา 2567
    const date = new Date(2024, 10, 15); // เดือน 10 = พ.ย.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2024 + 543
  });

  it('ควรคำนวณปีการศึกษาถูกต้องสำหรับเดือนกุมภาพันธ์ (ก.พ.)', () => {
    // 10 ก.พ. 2568 → ปีการศึกษา 2567
    const date = new Date(2025, 1, 10); // เดือน 1 = ก.พ.
    const result = thaiAcademicYear(date);
    expect(result).toBe(2567); // 2025 + 542
  });
});

describe('nextEvidenceCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควรคืนรหัส -01 เมื่อยังไม่มีหลักฐานของตัวชี้วัดนี้', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-01');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      select: { code: true },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        indicatorId: BigInt(1),
        fiscalYear: 2568,
        evidenceCode: { startsWith: '2.3-' },
      },
      select: { evidenceCode: true },
    });
  });

  it('ควรนับต่อจากเลขสูงสุดที่เคยออก', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-02' },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-03');
  });

  it('ควรไม่ออกรหัสซ้ำแม้รหัสกลางช่วงจะถูกลบไปแล้ว', async () => {
    // สถานการณ์บั๊กเดิม: 01,02,03 ออกไปแล้ว ลบ 02 ทิ้ง (soft delete)
    // count-based จะได้ 2+1 = 03 ซึ่งชนกับที่ออกไปแล้ว
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-02' },
      { evidenceCode: '2.3-03' },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-04');
  });

  it('ควรข้ามรหัสที่รูปแบบไม่ตรงโดยไม่พัง', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-เก่า' },
      { evidenceCode: null },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-02');
  });

  it('ควรรองรับเลขเกิน 99 โดยไม่ตัดหลัก', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([{ evidenceCode: '2.3-99' }]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-100');
  });

  it('ควรใช้ code ของตัวชี้วัดเป็นคำนำหน้า', async () => {
    mockFindUnique.mockResolvedValue({ code: '1.1' });
    mockFindMany.mockResolvedValue([]);

    const result = await nextEvidenceCode(BigInt(5), 2567);

    expect(result).toBe('1.1-01');
  });

  it('ควรโยน error เมื่อไม่พบตัวชี้วัด', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(nextEvidenceCode(BigInt(999), 2568)).rejects.toThrow('Indicator 999 not found');
  });
});

describe('createWithEvidenceCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue({ code: '2.3' });
  });

  it('ควรส่งรหัสที่ออกให้ callback และคืนผลลัพธ์เมื่อสำเร็จครั้งแรก', async () => {
    mockFindMany.mockResolvedValue([]);
    const create = vi.fn().mockResolvedValue({ id: BigInt(1) });

    const result = await createWithEvidenceCode(BigInt(1), 2568, create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('2.3-01');
    expect(result).toEqual({ id: BigInt(1) });
  });

  it('ควรออกเลขใหม่แล้วลองซ้ำเมื่อชนรหัสที่คำขออื่นเพิ่งใช้ไป', async () => {
    // รอบแรกยังไม่เห็นแถวของอีกคำขอ → ได้ 01 แล้วชน
    // รอบสองเห็นแถวนั้นแล้ว → ได้ 02 และผ่าน
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ evidenceCode: '2.3-01' }]);
    const create = vi
      .fn()
      .mockRejectedValueOnce(uniqueViolation(['indicatorId', 'fiscalYear', 'evidenceCode']))
      .mockResolvedValueOnce({ id: BigInt(2) });

    const result = await createWithEvidenceCode(BigInt(1), 2568, create);

    expect(create).toHaveBeenNthCalledWith(1, '2.3-01');
    expect(create).toHaveBeenNthCalledWith(2, '2.3-02');
    expect(result).toEqual({ id: BigInt(2) });
  });

  it('ควรโยน error ต่อทันทีเมื่อไม่ใช่การชนรหัสหลักฐาน', async () => {
    mockFindMany.mockResolvedValue([]);
    const create = vi.fn().mockRejectedValue(new Error('DB ล่ม'));

    await expect(createWithEvidenceCode(BigInt(1), 2568, create)).rejects.toThrow('DB ล่ม');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('ควรเลิกลองแล้วโยน error เมื่อชนซ้ำจนครบจำนวนครั้ง', async () => {
    mockFindMany.mockResolvedValue([]);
    const conflict = uniqueViolation(['evidenceCode']);
    const create = vi.fn().mockRejectedValue(conflict);

    await expect(createWithEvidenceCode(BigInt(1), 2568, create, 2)).rejects.toBe(conflict);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
