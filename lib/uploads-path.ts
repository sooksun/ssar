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
