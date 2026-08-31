import { describe, it, expect } from 'vitest';
import path from 'path';

import { resolveWithinUploadDir } from '../uploads-path';

const BASE = path.resolve('/app/uploads');

describe('resolveWithinUploadDir', () => {
  it('คืน absolute path เมื่อ path อยู่ใต้ baseDir', () => {
    const result = resolveWithinUploadDir(['evidence', '8', 'images', 'a.png'], BASE);
    expect(result).toBe(path.join(BASE, 'evidence', '8', 'images', 'a.png'));
  });

  it('ปฏิเสธ segment ".." (directory traversal)', () => {
    expect(resolveWithinUploadDir(['evidence', '..', '..', 'etc', 'passwd'], BASE)).toBeNull();
    expect(resolveWithinUploadDir(['..'], BASE)).toBeNull();
  });

  it('ปฏิเสธ segment "."', () => {
    expect(resolveWithinUploadDir(['.', 'evidence'], BASE)).toBeNull();
  });

  it('ปฏิเสธ segment ที่มี separator ฝังอยู่ (path ที่ยังไม่ถูกแตก)', () => {
    expect(resolveWithinUploadDir(['evidence/8/../../secret.png'], BASE)).toBeNull();
    expect(resolveWithinUploadDir(['evidence\\8\\x.png'], BASE)).toBeNull();
  });

  it('ปฏิเสธ null byte ใน segment', () => {
    expect(resolveWithinUploadDir(['evidence', 'a\0.png'], BASE)).toBeNull();
  });

  it('ปฏิเสธ segment ว่าง', () => {
    expect(resolveWithinUploadDir(['evidence', '', 'a.png'], BASE)).toBeNull();
    expect(resolveWithinUploadDir([], BASE)).toBeNull();
  });

  it('ไม่หลุดไปโฟลเดอร์พี่น้องที่ชื่อขึ้นต้นเหมือนกัน (prefix collision)', () => {
    // จุดที่ startsWith(baseDir) เฉย ๆ จะพลาด: /app/uploads-secret ขึ้นต้นด้วย /app/uploads
    const sibling = path.resolve('/app/uploads-secret');
    const result = resolveWithinUploadDir(['x.png'], sibling);
    expect(result).toBe(path.join(sibling, 'x.png'));
    // และ path ใต้ baseDir ต้องไม่ resolve ไปโดนโฟลเดอร์พี่น้องนั้น
    expect(resolveWithinUploadDir(['x.png'], BASE)).not.toContain('uploads-secret');
  });
});
