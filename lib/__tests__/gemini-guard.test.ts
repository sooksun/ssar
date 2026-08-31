import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

const mockStatSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    statSync: mockStatSync,
    readFileSync: vi.fn(() => Buffer.from('x')),
    existsSync: vi.fn(() => true),
  },
  statSync: mockStatSync,
  readFileSync: vi.fn(() => Buffer.from('x')),
  existsSync: vi.fn(() => true),
}));

// mock SDK เพื่อไม่ให้ต้องมี GEMINI_API_KEY ตอนรัน test
// (indicator-mapping ไม่ต้อง mock — เป็นข้อมูลคงที่ ไม่มี side effect ตอน import)
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

let assertFileAnalyzable: typeof import('../ai/gemini').assertFileAnalyzable;
let MAX_INLINE_FILE_BYTES: number;

beforeAll(async () => {
  const mod = await import('../ai/gemini');
  assertFileAnalyzable = mod.assertFileAnalyzable;
  MAX_INLINE_FILE_BYTES = mod.MAX_INLINE_FILE_BYTES;
});

describe('assertFileAnalyzable', () => {
  beforeEach(() => {
    mockStatSync.mockReset();
  });

  it('ควรผ่านสำหรับรูปภาพขนาดปกติ', () => {
    mockStatSync.mockReturnValue({ size: 2 * 1024 * 1024 });
    expect(() => assertFileAnalyzable('/tmp/a.png', 'image/png')).not.toThrow();
  });

  it('ควรผ่านสำหรับ PDF ขนาดปกติ', () => {
    mockStatSync.mockReturnValue({ size: 1024 });
    expect(() => assertFileAnalyzable('/tmp/a.pdf', 'application/pdf')).not.toThrow();
  });

  it('ควรปฏิเสธไฟล์ที่ใหญ่เกินเพดาน', () => {
    mockStatSync.mockReturnValue({ size: MAX_INLINE_FILE_BYTES + 1 });
    expect(() => assertFileAnalyzable('/tmp/big.png', 'image/png')).toThrow(/ใหญ่เกิน/);
  });

  it('ควรปฏิเสธวิดีโอซึ่งไม่รองรับการส่งแบบ inline', () => {
    mockStatSync.mockReturnValue({ size: 1024 });
    expect(() => assertFileAnalyzable('/tmp/v.mp4', 'video/mp4')).toThrow(/ไม่รองรับ/);
  });

  it('ควรปฏิเสธเมื่ออ่านขนาดไฟล์ไม่ได้', () => {
    mockStatSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(() => assertFileAnalyzable('/tmp/missing.png', 'image/png')).toThrow(/ไม่พบไฟล์/);
  });

  it('เพดานต้องไม่เกิน 20MB ซึ่งเป็นขีดจำกัดของ Gemini inline data', () => {
    expect(MAX_INLINE_FILE_BYTES).toBeLessThanOrEqual(20 * 1024 * 1024);
  });
});
