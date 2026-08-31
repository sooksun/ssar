import path from 'path';

/**
 * โฟลเดอร์ root สำหรับอัปโหลด (evidence, lesson-plans, teaching-media ฯลฯ)
 * - ถ้ามี UPLOAD_DIR หรือ PUBLIC_UPLOAD_DIR ใน env ใช้ค่านั้น (เหมาะกับ Docker)
 * - ไม่มีจะใช้ process.cwd() + 'public/uploads'
 */
export function getUploadBaseDir(): string {
  const fromEnv = process.env.UPLOAD_DIR ?? process.env.PUBLIC_UPLOAD_DIR;
  if (fromEnv && fromEnv.trim()) {
    return path.resolve(fromEnv.trim());
  }
  return path.resolve(process.cwd(), 'public', 'uploads');
}

/**
 * แปลง segment ของ path → absolute path ที่การันตีว่าอยู่ "ใต้" baseDir จริง
 * คืน null ถ้าหลุดออกนอก baseDir (directory traversal) หรือ segment มีอักขระต้องห้าม
 *
 * หมายเหตุ: ต้องเทียบด้วย `baseDir + path.sep` ไม่ใช่ `startsWith(baseDir)` เฉย ๆ
 * มิฉะนั้น `/app/uploads-secret/x` จะผ่านเพราะขึ้นต้นด้วย `/app/uploads`
 */
export function resolveWithinUploadDir(segments: string[], baseDir: string): string | null {
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') return null;
    if (segment.includes('\\') || segment.includes('/') || segment.includes('\0')) return null;
  }
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, path.join(...segments));
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  return resolved;
}
