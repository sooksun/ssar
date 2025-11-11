import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

const mockEvidenceFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    evidence: {
      findMany: mockEvidenceFindMany,
    },
  },
}));

let getPrimaryFiles: typeof import('../queries/files').getPrimaryFiles;

beforeAll(async () => {
  const queriesModule = await import('../queries/files');
  getPrimaryFiles = queriesModule.getPrimaryFiles;
});

describe('getPrimaryFiles', () => {
  beforeEach(() => {
    mockEvidenceFindMany.mockReset();
  });

  it('ควรคืนค่า array ว่างเมื่อไม่มี schoolIds', async () => {
    const result = await getPrimaryFiles({ schoolIds: [] });
    expect(result).toEqual([]);
    expect(mockEvidenceFindMany).not.toHaveBeenCalled();
  });

  it('ควรส่งต่อพารามิเตอร์และแปลงผลลัพธ์ได้ถูกต้อง', async () => {
    const schoolIds = [BigInt(10001)];
    const fiscalYear = 2568;
    const uploadedAt = new Date('2024-10-10T12:00:00.000Z');

    mockEvidenceFindMany.mockResolvedValue([
      {
        id: BigInt(42),
        evidenceCode: '2.3-01',
        title: 'ตัวอย่างหลักฐาน',
        fiscalYear,
        school: {
          sc_id: BigInt(10001),
          name: 'โรงเรียนตัวอย่าง',
        },
        indicator: {
          code: '2.3',
          nameTh: 'ผู้บริหารมีภาวะผู้นำ',
        },
        files: [
          {
            uploadedAt,
            storageType: 'URL',
            storagePath: '/uploads/file.pdf',
            driveFileId: null,
            externalUrl: null,
          },
        ],
      },
    ]);

    const result = await getPrimaryFiles({ schoolIds, fiscalYear });

    expect(mockEvidenceFindMany).toHaveBeenCalledWith({
      where: {
        schoolId: { in: schoolIds },
        del: false,
        fiscalYear,
        files: {
          some: {
            isPrimary: true,
            del: false,
          },
        },
      },
      select: expect.any(Object),
      orderBy: [{ fiscalYear: 'desc' }, { evidenceCode: 'asc' }],
    });

    expect(result).toEqual([
      {
        evidenceId: '42',
        evidenceCode: '2.3-01',
        title: 'ตัวอย่างหลักฐาน',
        fiscalYear,
        schoolId: '10001',
        schoolName: 'โรงเรียนตัวอย่าง',
        indicatorCode: '2.3',
        indicatorName: 'ผู้บริหารมีภาวะผู้นำ',
        uploadedAt,
        storageType: 'URL',
        storagePath: '/uploads/file.pdf',
        driveFileId: null,
        externalUrl: null,
      },
    ]);
  });

  it('ควรข้ามรายการที่ไม่มีไฟล์ primary', async () => {
    mockEvidenceFindMany.mockResolvedValue([
      {
        id: BigInt(1),
        evidenceCode: '1.1-01',
        title: 'ไม่มีไฟล์',
        fiscalYear: 2568,
        school: { sc_id: BigInt(10001), name: 'Demo School' },
        indicator: { code: '1.1', nameTh: 'ตัวชี้วัด' },
        files: [],
      },
    ]);

    const result = await getPrimaryFiles({ schoolIds: [BigInt(10001)] });
    expect(result).toEqual([]);
  });
});


