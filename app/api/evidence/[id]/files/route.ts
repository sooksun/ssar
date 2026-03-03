import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';
import path from 'path';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { getUploadBaseDir } from '@/lib/uploads-path';
import {
  isImageFile,
  isVideoFile,
  isPdfFile,
  isAllowedFileType,
  describeAllowedFileTypes,
  extensionMatchesMime,
  MAX_FILE_SIZE_BYTES,
  VIDEO_MAX_SIZE_MB,
} from '@/lib/file-types';
import { processImage } from '@/lib/image-process';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large file uploads

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const evId = BigInt(id);
    const user = session.user;

    // ตรวจสอบสิทธิ์
    const ev = await prisma.evidence.findUnique({
      where: { id: evId },
      select: { schoolId: true },
    });
    if (!ev) {
      return NextResponse.json({ success: false, error: 'ไม่พบหลักฐาน' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), ev.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เพิ่มไฟล์' }, { status: 403 });
    }

    // ตรวจสอบ Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      console.error('[api/evidence/files] Invalid Content-Type:', contentType);
      return NextResponse.json(
        { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Parse FormData
    // หมายเหตุ: API route นี้ถูก exclude จาก middleware แล้ว ดังนั้น body ควรจะยังไม่ถูกอ่าน
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('[api/evidence/files] FormData parse error:', error);
      console.error('[api/evidence/files] Content-Type:', contentType);
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถอ่านข้อมูลไฟล์ได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 400 }
      );
    }
    const storageTypeEntry = formData.get('storageType');
    const storageType: 'URL' | 'YOUTUBE' | 'GDRIVE' | 'CANVA' | 'LINK' =
      storageTypeEntry === 'YOUTUBE' ||
      storageTypeEntry === 'GDRIVE' ||
      storageTypeEntry === 'CANVA' ||
      storageTypeEntry === 'LINK'
        ? storageTypeEntry
        : 'URL';

    const inputFileName = ((formData.get('fileName') as string) || '').trim();
    const raw = {
      evidenceId: id,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: (formData.get('isPrimary') as string) === 'on',
      note: (formData.get('note') as string) || undefined,
      storageType,
      fileName: inputFileName || undefined,
      driveFileId: (formData.get('driveFileId') as string) || undefined,
    };

    // กรณี storageType = URL และแนบไฟล์ (multi-upload)
    const uploadedFiles = formData.getAll('files') as File[];
    const firstUploadedFile = uploadedFiles[0];
    const isFilesUpload =
      raw.storageType === 'URL' &&
      uploadedFiles.length > 0 &&
      firstUploadedFile instanceof File &&
      typeof firstUploadedFile.arrayBuffer === 'function';

    if (isFilesUpload) {
      const uploadList = Array.from(uploadedFiles);

      // ตรวจสอบประเภทไฟล์
      const imageFiles = uploadList.filter((file) => isImageFile(file.name, file.type));
      const videoFiles = uploadList.filter((file) => isVideoFile(file.name, file.type));
      const pdfFiles = uploadList.filter((file) => isPdfFile(file.name, file.type));
      const otherFiles = uploadList.filter(
        (file) => !isImageFile(file.name, file.type) && !isVideoFile(file.name, file.type) && !isPdfFile(file.name, file.type)
      );

      // ไม่สามารถอัปโหลดรูปภาพและวิดีโอพร้อมกันได้
      if (imageFiles.length > 0 && videoFiles.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'ไม่สามารถอัปโหลดรูปภาพและวิดีโอพร้อมกันได้ กรุณาเลือกประเภทไฟล์อย่างใดอย่างหนึ่ง',
          },
          { status: 400 }
        );
      }

      // ตรวจสอบรูปภาพ: มากสุด 20 รูป
      if (imageFiles.length > 20) {
        return NextResponse.json(
          { success: false, error: 'สามารถอัปโหลดรูปภาพได้มากสุด 20 รูป' },
          { status: 400 }
        );
      }

      // ตรวจสอบวิดีโอ: มากสุด 1 ไฟล์, ขนาดไม่เกิน 1000MB
      if (videoFiles.length > 1) {
        return NextResponse.json(
          { success: false, error: 'สามารถอัปโหลดวิดีโอได้เพียง 1 ไฟล์' },
          { status: 400 }
        );
      }

      if (videoFiles.length === 1) {
        const videoFile = videoFiles[0];
        const videoSizeMB = videoFile.size / (1024 * 1024);
        if (videoSizeMB > VIDEO_MAX_SIZE_MB) {
          return NextResponse.json(
            { success: false, error: `ขนาดวิดีโอต้องไม่เกิน ${VIDEO_MAX_SIZE_MB} MB` },
            { status: 400 }
          );
        }
      }

      // ตรวจสอบไฟล์ประเภทอื่น
      const invalidFile = otherFiles.find((file) => !isAllowedFileType(file.name, file.type));
      if (invalidFile) {
        return NextResponse.json(
          { success: false, error: `ไฟล์ต้องเป็น ${describeAllowedFileTypes()}` },
          { status: 400 }
        );
      }

      // PRD: ตรวจนามสกุลให้ตรงกับ MIME
      const allFiles = [...imageFiles, ...videoFiles, ...pdfFiles, ...otherFiles];
      const mimeMismatch = allFiles.find((file) => !extensionMatchesMime(file.name, file.type));
      if (mimeMismatch) {
        return NextResponse.json(
          {
            success: false,
            error: `นามสกุลไฟล์ไม่ตรงกับประเภทไฟล์: ${mimeMismatch.name}`,
          },
          { status: 400 }
        );
      }

      // PRD: ขนาดสูงสุด 10 MB สำหรับไฟล์ทั่วไป (วิดีโอใช้เกณฑ์แยก)
      const nonVideoFiles = [...imageFiles, ...pdfFiles, ...otherFiles];
      const oversize = nonVideoFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
      if (oversize) {
        return NextResponse.json(
          {
            success: false,
            error: `ขนาดไฟล์ต้องไม่เกิน 10 MB: ${oversize.name}`,
          },
          { status: 400 }
        );
      }

      // แยก folder ตามประเภทไฟล์
      let folderName: string;
      if (imageFiles.length > 0) {
        folderName = 'images';
      } else if (videoFiles.length > 0) {
        folderName = 'videos';
      } else if (pdfFiles.length > 0) {
        // PDF เก็บใน folder 'files'
        folderName = 'files';
      } else {
        // ไฟล์อื่นๆ เก็บใน folder 'files'
        folderName = 'files';
      }

      const uploadDir = path.join(
        getUploadBaseDir(),
        'evidence',
        evId.toString(),
        folderName
      );
      await mkdir(uploadDir, { recursive: true });

      const filesToProcess = imageFiles.length > 0 
        ? imageFiles 
        : videoFiles.length > 0 
          ? videoFiles 
          : pdfFiles.length > 0 
            ? pdfFiles 
            : otherFiles;

      // กรณีรูปภาพ: เก็บหลายไฟล์เป็น array JSON ใน record เดียว (PRD: ชื่อมาตรฐาน UUID, resize 1028px + บีบอัด)
      if (imageFiles.length > 0) {
        const fileUrlsArray: Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }> = [];
        let thumbnailUrl: string | undefined;

        for (let index = 0; index < imageFiles.length; index += 1) {
          const f = imageFiles[index];
          const arrayBuffer = await f.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = getExtension(f.name) || 'jpg';
          const standardName = `${randomUUID()}.${ext}`;
          const filePath = path.join(uploadDir, standardName);

          const processed = await processImage(buffer, f.type || 'image/jpeg');
          if (processed) {
            await writeFile(filePath, processed.buffer);
            fileUrlsArray.push({
              url: `/uploads/evidence/${evId.toString()}/${folderName}/${standardName}`,
              fileName: f.name,
              mimeType: processed.mimeType,
              fileSize: processed.buffer.length,
            });
          } else {
            await writeFile(filePath, buffer);
            fileUrlsArray.push({
              url: `/uploads/evidence/${evId.toString()}/${folderName}/${standardName}`,
              fileName: f.name,
              mimeType: f.type || undefined,
              fileSize: typeof f.size === 'number' ? Math.round(f.size) : undefined,
            });
          }

          if (index === 0) {
            thumbnailUrl = `/uploads/evidence/${evId.toString()}/${folderName}/${standardName}`;
          }
        }

        // ตั้งชื่อไฟล์
        const baseName = raw.fileName || (imageFiles.length > 1 ? `รูปภาพ ${imageFiles.length} ไฟล์` : path.parse(imageFiles[0].name).name);
        const finalName = baseName.trim();

        // สำหรับรูปภาพหลายรูป: ใช้รูปแรกเป็น thumbnail ของกลุ่มเท่านั้น
        // ไม่ตั้ง isPrimary อัตโนมัติ (ให้ user เป็นผู้กำหนดเอง)
        // ยกเลิก primary ของรูปอื่นทั้งหมด (ถ้ามีการตั้ง primary ใหม่)
        // หมายเหตุ: ไม่ต้องยกเลิก primary ของรูปอื่น เพราะเราไม่ตั้ง primary อัตโนมัติ

        const totalStoredSize = fileUrlsArray.reduce((sum, u) => sum + (u.fileSize ?? 0), 0);
        const created = await prisma.evidenceFile.create({
          data: {
            evidenceId: evId,
            schoolId: ev.schoolId,
            fileName: finalName,
            storageType: 'URL',
            externalUrl: thumbnailUrl,
            thumbnailUrl: thumbnailUrl,
            fileUrls: fileUrlsArray,
            mimeType: fileUrlsArray[0]?.mimeType ?? imageFiles[0].type ?? undefined,
            fileSize: totalStoredSize,
            isPrimary: false, // ไม่ตั้ง primary อัตโนมัติ ให้ user เป็นผู้กำหนดเอง
            note: raw.note,
            uploadedBy: BigInt(user.id),
          },
        });

        await logAction(
          user.id,
          AUDIT_ACTIONS.UPLOAD_FILE,
          'EvidenceFile',
          created.id,
          ev.schoolId,
          {
            evidenceId: evId.toString(),
            fileName: finalName,
            storageType: 'URL',
            isPrimary: false, // ไม่ตั้ง primary อัตโนมัติ
            fileCount: imageFiles.length,
            fileType: 'image',
          }
        );

        revalidatePath(`/evidence/${evId.toString()}/files`);
        revalidatePath(`/evidence/${evId.toString()}`);

        return NextResponse.json({
          success: true,
          redirectTo: `/evidence/${evId.toString()}/files`,
        });
      }

      // กรณีวิดีโอหรือไฟล์อื่น: เก็บทีละไฟล์ (PRD: ชื่อมาตรฐาน UUID + extension)
      for (let index = 0; index < filesToProcess.length; index += 1) {
        const f = filesToProcess[index];
        const arrayBuffer = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = getExtension(f.name) || 'bin';
        const standardName = `${randomUUID()}.${ext}`;
        const filePath = path.join(uploadDir, standardName);
        await writeFile(filePath, buffer);

        const urlPath = `/uploads/evidence/${evId.toString()}/${folderName}/${standardName}`;
        const baseName = raw.fileName
          ? filesToProcess.length > 1
            ? `${raw.fileName}-${index + 1}`
            : raw.fileName
          : path.parse(f.name).name;
        const finalName = baseName.trim();

        let thumbnailUrl: string | undefined;
        if (isVideoFile(f.name, f.type)) {
          const thumbnailName = `${randomUUID()}-thumbnail.jpg`;
          const thumbnailPath = path.join(uploadDir, thumbnailName);
          const thumbnailGenerated = await generateVideoThumbnail(filePath, thumbnailPath, 10);
          if (thumbnailGenerated) {
            thumbnailUrl = `/uploads/evidence/${evId.toString()}/${folderName}/${thumbnailName}`;
          } else {
            console.warn(`[evidence] Failed to generate thumbnail for video: ${filePath}`);
          }
        }

        const created = await prisma.evidenceFile.create({
          data: {
            evidenceId: evId,
            schoolId: ev.schoolId,
            fileName: finalName,
            storageType: 'URL',
            externalUrl: urlPath,
            thumbnailUrl: thumbnailUrl || undefined,
            mimeType: f.type || undefined,
            fileSize: typeof f.size === 'number' ? Math.round(f.size) : undefined,
            isPrimary: false,
            note: raw.note,
            uploadedBy: BigInt(user.id),
          },
        });

        await logAction(
          user.id,
          AUDIT_ACTIONS.UPLOAD_FILE,
          'EvidenceFile',
          created.id,
          ev.schoolId,
          {
            evidenceId: evId.toString(),
            fileName: finalName,
            storageType: 'URL',
            isPrimary: false,
            mimeType: f.type || undefined,
            fileType: isVideoFile(f.name, f.type) ? 'video' : 'other',
          }
        );
      }

      revalidatePath(`/evidence/${evId.toString()}/files`);
      revalidatePath(`/evidence/${evId.toString()}`);

      return NextResponse.json({
        success: true,
        redirectTo: `/evidence/${evId.toString()}/files`,
      });
    }

    // Handle other storage types (YOUTUBE, GDRIVE, CANVA, LINK) - reuse from server action
    // For now, return error for non-file uploads
    return NextResponse.json(
      { success: false, error: 'กรุณาใช้ server action สำหรับประเภทไฟล์อื่น' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[api/evidence/files] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' },
      { status: 500 }
    );
  }
}

