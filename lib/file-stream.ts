import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

/**
 * เขียนไฟล์อัปโหลดลงดิสก์แบบ stream
 *
 * เหตุผล: `Buffer.from(await file.arrayBuffer())` ดึงไฟล์ทั้งก้อนเข้า heap
 * วิดีโอ 1000MB (เพดานที่ระบบอนุญาต) จึงกิน heap เต็มจำนวนต่อ 1 request
 * และอัปพร้อมกัน 2 คนก็พอทำให้ container OOM
 *
 * ถ้าเขียนไม่สำเร็จจะลบไฟล์ที่เขียนค้างไว้ก่อนโยน error ต่อ (ไม่ทิ้งไฟล์เสียไว้บนดิสก์)
 */
export async function writeUploadedFile(file: File, destPath: string): Promise<void> {
  const webStream = file.stream();
  try {
    await pipeline(
      Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(destPath)
    );
  } catch (error) {
    await unlink(destPath).catch(() => {
      /* ไฟล์อาจยังไม่ถูกสร้าง */
    });
    throw error;
  }
}
