import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// execFile ไม่ผ่าน shell — argument ถูกส่งเป็น array ตรงเข้าโปรเซส
// ห้ามเปลี่ยนกลับไปใช้ exec: ชื่อไฟล์วิดีโอมาจากผู้ใช้ ถ้าต่อเป็น shell string
// อักขระอย่าง " ; $( ) จะกลายเป็นคำสั่งเชลล์
const execFileAsync = promisify(execFile);

/** ตรวจว่ามี ffmpeg/ffprobe ให้ใช้หรือไม่ */
async function hasBinary(bin: 'ffmpeg' | 'ffprobe'): Promise<boolean> {
  try {
    await execFileAsync(bin, ['-version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * สร้าง thumbnail จากวิดีโอโดยใช้ ffmpeg
 * Capture frame ที่วินาทีที่ 10 (หรือ frame ที่ใกล้เคียง)
 *
 * @param videoPath - Absolute path to video file
 * @param outputPath - Absolute path to output thumbnail image
 * @param frameTime - Time in seconds to capture (default: 10)
 * @returns Promise<boolean> - true if thumbnail was generated successfully
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputPath: string,
  frameTime: number = 10
): Promise<boolean> {
  try {
    // ตรวจสอบว่า video file มีอยู่จริง
    if (!existsSync(videoPath)) {
      console.error('[video-thumbnail] Video file not found:', videoPath);
      return false;
    }

    if (!(await hasBinary('ffmpeg'))) {
      console.warn('[video-thumbnail] ffmpeg not found, skipping thumbnail generation');
      return false;
    }

    // สร้าง directory ถ้ายังไม่มี
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // ใช้ ffmpeg สร้าง thumbnail
    // -ss: เริ่มที่วินาทีที่ระบุ (ต้องอยู่ก่อน -i สำหรับการ seek ที่เร็วขึ้น)
    // -i: input file
    // -vframes 1: capture เพียง 1 frame
    // -q:v 2: quality (2 = high quality, scale 1-31, ต่ำกว่า = คุณภาพดีกว่า)
    // -y: overwrite output file
    const seconds = Number.isFinite(frameTime) && frameTime >= 0 ? frameTime : 10;
    await execFileAsync(
      'ffmpeg',
      [
        '-ss',
        String(seconds),
        '-i',
        videoPath,
        '-vframes',
        '1',
        '-q:v',
        '2',
        '-y',
        outputPath,
      ],
      { timeout: 30000 } // 30 seconds timeout
    );

    // ตรวจสอบว่า thumbnail ถูกสร้างแล้ว
    if (existsSync(outputPath)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[video-thumbnail] Error generating thumbnail:', error);
    return false;
  }
}

/**
 * ตรวจสอบว่าวิดีโอมีความยาวมากกว่าวินาทีที่ระบุหรือไม่
 */
export async function getVideoDuration(videoPath: string): Promise<number | null> {
  try {
    if (!(await hasBinary('ffprobe'))) {
      return null;
    }

    // ใช้ ffprobe เพื่อดึงข้อมูลวิดีโอ
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      { timeout: 30000 }
    );
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? null : duration;
  } catch (error) {
    console.error('[video-thumbnail] Error getting video duration:', error);
    return null;
  }
}
