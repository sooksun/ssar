'use server';

/**
 * Evidence actions — PQA: หลักฐานเป็นฐานร่วม ใช้ได้ทั้ง QA (ตัวชี้วัด) และ PA (ข้อตกลง)
 * @see docs/PQA_FRAMEWORK.md
 */

import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';
import { prisma } from '@/lib/db';
import {
  thaiAcademicYear,
  thaiFiscalYear,
  nextEvidenceCode,
  getDefaultQAIndicatorId,
} from '@/lib/evidence';
import {
  createEvidenceSchema,
  updateEvidenceSchema,
  evidenceFileSchema,
  updateEvidenceFileSchema,
  createReviewSchema,
  updateReviewSchema,
} from '@/lib/validations/evidence';
import { revalidatePath } from 'next/cache';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getUploadBaseDir } from '@/lib/uploads-path';
import {
  describeAllowedFileTypes,
  isAllowedFileType,
  isImageFile,
  isVideoFile,
} from '@/lib/file-types';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';
import { ZodError } from 'zod';

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v') || undefined;
    }
    const match = parsed.pathname.match(/\/embed\/([^/?]+)/);
    if (match) return match[1];
  } catch {
    return undefined;
  }
  return undefined;
}

function extractDriveId(url: string) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/d\/([^/]+)/);
    if (match) return match[1];
    if (parsed.searchParams.get('id')) {
      return parsed.searchParams.get('id') || undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * ดึงมาตรฐานตามระดับการศึกษา
 */
export async function getStandardsByLevel(levelId: number) {
  try {
    const standards = await prisma.qAStandard.findMany({
      where: {
        levelId,
      },
      orderBy: {
        sortNo: 'asc',
      },
      select: {
        id: true,
        code: true,
        nameTh: true,
        sortNo: true,
      },
    });

    return { success: true, data: standards };
  } catch (error) {
    console.error('Error fetching standards:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลมาตรฐานได้' };
  }
}

/**
 * อัปเดตหลักฐาน
 */
export async function updateEvidence(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const raw = {
      id: formData.get('id') as string,
      title: (formData.get('title') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      status: (formData.get('status') as string) || undefined,
      privacyLevel: (formData.get('privacyLevel') as string) || undefined,
      ownerUserId: (formData.get('ownerUserId') as string) || undefined,
    };

    const data = updateEvidenceSchema.parse(raw);

    // ตรวจสอบสิทธิ์จากรายการหลักฐาน
    const ev = await prisma.evidence.findUnique({
      where: { id: data.id },
      select: { schoolId: true, status: true },
    });
    if (!ev) {
      return { success: false, error: 'ไม่พบหลักฐาน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), ev.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์แก้ไขหลักฐานนี้' };
    }

    const previousStatus = ev.status;

    await prisma.evidence.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        privacyLevel: data.privacyLevel,
        ownerUserId: data.ownerUserId,
        updatedBy: BigInt(user.id),
      },
    });

    if (data.status && data.status !== previousStatus) {
      await logAction(
        user.id,
        AUDIT_ACTIONS.UPDATE_EVIDENCE_STATUS,
        'Evidence',
        data.id,
        ev.schoolId,
        {
          from: previousStatus,
          to: data.status,
        }
      );
    }

    revalidatePath(`/evidence/${data.id.toString()}`);
    revalidatePath('/evidence');

    return {
      success: true,
      redirectTo: `/evidence/${data.id.toString()}`,
    };
  } catch (error) {
    console.error('Update evidence error:', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดต';
    return { success: false, error: message };
  }
}

/**
 * เพิ่มไฟล์หลักฐาน
 */
export async function addEvidenceFile(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }
  const user = session.user;

  try {
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
      evidenceId: formData.get('evidenceId') as string,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: (formData.get('isPrimary') as string) === 'on',
      note: (formData.get('note') as string) || undefined,
      storageType,
      fileName: inputFileName || undefined,
      driveFileId: (formData.get('driveFileId') as string) || undefined,
    };

    // ตรวจสอบสิทธิ์
    const evId = BigInt(raw.evidenceId);
    const ev = await prisma.evidence.findUnique({
      where: { id: evId },
      select: { schoolId: true },
    });
    if (!ev) return { success: false, error: 'ไม่พบหลักฐาน' };
    const hasAccess = await canAccessSchool(BigInt(user.id), ev.schoolId);
    if (!hasAccess) return { success: false, error: 'ไม่มีสิทธิ์เพิ่มไฟล์' };

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
      const otherFiles = uploadList.filter(
        (file) => !isImageFile(file.name, file.type) && !isVideoFile(file.name, file.type)
      );

      // ไม่สามารถอัปโหลดรูปภาพและวิดีโอพร้อมกันได้
      if (imageFiles.length > 0 && videoFiles.length > 0) {
        return {
          success: false,
          error: 'ไม่สามารถอัปโหลดรูปภาพและวิดีโอพร้อมกันได้ กรุณาเลือกประเภทไฟล์อย่างใดอย่างหนึ่ง',
        };
      }

      // ตรวจสอบรูปภาพ: มากสุด 20 รูป
      if (imageFiles.length > 20) {
        return {
          success: false,
          error: 'สามารถอัปโหลดรูปภาพได้มากสุด 20 รูป',
        };
      }

      // ตรวจสอบวิดีโอ: มากสุด 1 ไฟล์, ขนาดไม่เกิน 500MB
      if (videoFiles.length > 1) {
        return {
          success: false,
          error: 'สามารถอัปโหลดวิดีโอได้เพียง 1 ไฟล์',
        };
      }

      if (videoFiles.length === 1) {
        const videoFile = videoFiles[0];
        const videoSizeMB = videoFile.size / (1024 * 1024);
        if (videoSizeMB > 500) {
          return {
            success: false,
            error: 'ขนาดวิดีโอต้องไม่เกิน 500 MB',
          };
        }
      }

      // ตรวจสอบไฟล์ประเภทอื่น (PDF)
      const invalidFile = otherFiles.find((file) => !isAllowedFileType(file.name, file.type));
      if (invalidFile) {
        return {
          success: false,
          error: `ไฟล์ต้องเป็น ${describeAllowedFileTypes()}`,
        };
      }

      // แยก folder สำหรับรูปภาพและวิดีโอ
      const isImageUpload = imageFiles.length > 0;
      const folderName = isImageUpload ? 'images' : 'videos';
      const uploadDir = path.join(
        getUploadBaseDir(),
        'evidence',
        evId.toString(),
        folderName
      );
      await mkdir(uploadDir, { recursive: true });

      const filesToProcess = isImageUpload ? imageFiles : videoFiles.length > 0 ? videoFiles : otherFiles;

      // กรณีรูปภาพ: เก็บหลายไฟล์เป็น array JSON ใน record เดียว
      if (isImageUpload && imageFiles.length > 0) {
        const timestamp = Date.now();
        const fileUrlsArray: Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }> = [];
        let thumbnailUrl: string | undefined;

        // อัปโหลดรูปภาพทั้งหมด
        for (let index = 0; index < imageFiles.length; index += 1) {
          const f = imageFiles[index];
          const arrayBuffer = await f.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const safeName = `${timestamp}-${index + 1}-${f.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(uploadDir, safeName);
          await writeFile(filePath, buffer);

          const urlPath = `/uploads/evidence/${evId.toString()}/${folderName}/${safeName}`;
          fileUrlsArray.push({
            url: urlPath,
            fileName: f.name,
            mimeType: f.type || undefined,
            fileSize: typeof f.size === 'number' ? Math.round(f.size) : undefined,
          });

          // ใช้รูปแรกเป็น thumbnail
          if (index === 0) {
            thumbnailUrl = urlPath;
          }
        }

        // ตั้งชื่อไฟล์
        const baseName = raw.fileName || (imageFiles.length > 1 ? `รูปภาพ ${imageFiles.length} ไฟล์` : path.parse(imageFiles[0].name).name);
        const finalName = baseName.trim();

        // สำหรับรูปภาพหลายรูป: ใช้รูปแรกเป็น thumbnail ของกลุ่มเท่านั้น
        // ไม่ตั้ง isPrimary อัตโนมัติ (ให้ user เป็นผู้กำหนดเอง)
        // หมายเหตุ: ไม่ต้องยกเลิก primary ของรูปอื่น เพราะเราไม่ตั้ง primary อัตโนมัติ

        // สร้าง EvidenceFile record เดียวสำหรับกลุ่มรูปภาพ
        const created = await prisma.evidenceFile.create({
          data: {
            evidenceId: evId,
            schoolId: ev.schoolId,
            fileName: finalName,
            storageType: 'URL',
            externalUrl: thumbnailUrl, // เก็บ URL ของรูปแรก
            thumbnailUrl: thumbnailUrl, // รูปแรกเป็น thumbnail ของกลุ่มรูปภาพ
            fileUrls: fileUrlsArray, // เก็บ array ของรูปภาพทั้งหมด
            mimeType: imageFiles[0].type || undefined,
            fileSize: imageFiles.reduce((sum, f) => sum + (typeof f.size === 'number' ? f.size : 0), 0),
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
        return {
          success: true,
          redirectTo: `/evidence/${evId.toString()}/files`,
        };
      }

      // กรณีวิดีโอหรือไฟล์อื่น: เก็บทีละไฟล์ (เหมือนเดิม)
      for (let index = 0; index < filesToProcess.length; index += 1) {
        const f = filesToProcess[index];
        const arrayBuffer = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const timestamp = Date.now() + index;
        const safeName = `${timestamp}-${f.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(uploadDir, safeName);
        await writeFile(filePath, buffer);

        const urlPath = `/uploads/evidence/${evId.toString()}/${folderName}/${safeName}`;
        const baseName = raw.fileName
          ? filesToProcess.length > 1
            ? `${raw.fileName}-${index + 1}`
            : raw.fileName
          : path.parse(f.name).name;
        const finalName = baseName.trim();

        // สร้าง thumbnail สำหรับวิดีโอ (capture frame ที่ 10 วินาที)
        let thumbnailUrl: string | undefined;
        if (isVideoFile(f.name, f.type)) {
          const thumbnailName = `${timestamp}-thumbnail.jpg`;
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
      return {
        success: true,
        redirectTo: `/evidence/${evId.toString()}/files`,
      };
    }

    if (raw.storageType === 'YOUTUBE') {
      const link = raw.storagePath?.toString().trim();
      if (!link) {
        return { success: false, error: 'กรุณาระบุลิงก์ YouTube' };
      }
      const videoId = extractYouTubeId(link);
      if (!videoId) {
        return { success: false, error: 'รูปแบบลิงก์ YouTube ไม่ถูกต้อง' };
      }
      if (!raw.fileName) {
        return { success: false, error: 'กรุณาระบุชื่อไฟล์สำหรับลิงก์ YouTube' };
      }
      raw.externalUrl = undefined;
      raw.driveFileId = undefined;
    } else if (raw.storageType === 'GDRIVE') {
      const link = raw.storagePath?.toString().trim() || raw.externalUrl?.toString().trim();
      if (!link) {
        return { success: false, error: 'กรุณาระบุลิงก์ Google Drive' };
      }
      const fileId = extractDriveId(link);
      if (!fileId) {
        return { success: false, error: 'รูปแบบลิงก์ Google Drive ไม่ถูกต้อง' };
      }
      raw.storagePath = link;
      if (!raw.fileName) {
        return { success: false, error: 'กรุณาระบุชื่อไฟล์สำหรับลิงก์ Google Drive' };
      }
      raw.externalUrl = undefined;
      raw.driveFileId = undefined;
    } else if (raw.storageType === 'CANVA') {
      const link = raw.storagePath?.toString().trim();
      if (!link) {
        return { success: false, error: 'กรุณาระบุลิงก์ Canva' };
      }
      // ตรวจสอบว่าเป็นลิงก์ Canva หรือไม่
      if (!link.includes('canva.com')) {
        return { success: false, error: 'รูปแบบลิงก์ Canva ไม่ถูกต้อง' };
      }
      if (!raw.fileName) {
        return { success: false, error: 'กรุณาระบุชื่อไฟล์สำหรับลิงก์ Canva' };
      }
      raw.externalUrl = undefined;
      raw.driveFileId = undefined;
    } else if (raw.storageType === 'LINK') {
      const link = raw.externalUrl?.toString().trim();
      if (!link) {
        return { success: false, error: 'กรุณาระบุลิงก์เว็บไซต์' };
      }
      // ตรวจสอบว่าเป็น URL ที่ถูกต้องหรือไม่
      try {
        new URL(link);
      } catch {
        return { success: false, error: 'รูปแบบลิงก์เว็บไซต์ไม่ถูกต้อง' };
      }
      if (!raw.fileName) {
        return { success: false, error: 'กรุณาระบุชื่อไฟล์สำหรับลิงก์เว็บไซต์' };
      }
      raw.storagePath = undefined;
      raw.driveFileId = undefined;
    } else {
      raw.storageType = 'URL';
      if (raw.fileName) {
        const extFromInput = path.extname(raw.fileName);
        if (!extFromInput) {
          const hintExt =
            (typeof raw.storagePath === 'string' && path.extname(raw.storagePath)) ||
            (typeof raw.externalUrl === 'string' && path.extname(raw.externalUrl || ''));
          if (hintExt) {
            raw.fileName += hintExt;
          }
        }
      }
      if (
        !raw.fileName &&
        typeof raw.storagePath === 'string' &&
        raw.storagePath.trim().length > 0
      ) {
        raw.fileName = path.basename(raw.storagePath.trim());
      }

      if (!raw.fileName && typeof raw.externalUrl === 'string') {
        try {
          const url = new URL(raw.externalUrl);
          const segments = url.pathname.split('/').filter(Boolean);
          raw.fileName = segments.pop() || url.hostname;
        } catch {
          const parts = raw.externalUrl.split('/').filter(Boolean);
          raw.fileName = parts.pop();
        }
      }

      if (!raw.fileName) {
        return {
          success: false,
          error: 'ระบบไม่สามารถระบุชื่อไฟล์ได้ กรุณาตรวจสอบข้อมูลไฟล์หรือ URL',
        };
      }
    }

    // ปกติ: validate metadata
    const data = evidenceFileSchema.parse(raw);

    if (data.storageType === 'URL' && !isAllowedFileType(data.fileName)) {
      const inferredExt =
        (data.externalUrl && path.extname(data.externalUrl)) ||
        (data.storagePath && path.extname(data.storagePath));
      if (!inferredExt || !isAllowedFileType(`dummy${inferredExt}`)) {
        return {
          success: false,
          error: `ไฟล์ต้องเป็น ${describeAllowedFileTypes()}`,
        };
      }
    }

    if (data.storageType === 'URL' && data.isPrimary && !isImageFile(data.fileName)) {
      const inferredExt =
        (data.externalUrl && path.extname(data.externalUrl)) ||
        (data.storagePath && path.extname(data.storagePath));
      if (!isImageFile(`dummy${inferredExt || ''}`)) {
        return {
          success: false,
          error: 'ตั้งเป็นไฟล์หลักได้เฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG)',
        };
      }
    }

    // เพิ่มไฟล์
    const created = await prisma.evidenceFile.create({
      data: {
        evidenceId: data.evidenceId,
        schoolId: ev.schoolId,
        fileName: data.fileName,
        storageType: data.storageType,
        storagePath: data.storagePath,
        externalUrl: data.externalUrl,
        isPrimary: data.storageType === 'URL' ? Boolean(data.isPrimary) : false,
        note: data.note,
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
        evidenceId: data.evidenceId.toString(),
        fileName: data.fileName,
        storageType: data.storageType,
        isPrimary: data.storageType === 'URL' ? Boolean(data.isPrimary) : false,
      }
    );

    // ถ้าเป็น primary ให้ reset ตัวอื่น
    if (data.storageType === 'URL' && data.isPrimary) {
      await prisma.evidenceFile.updateMany({
        where: { evidenceId: data.evidenceId, NOT: { id: created.id } },
        data: { isPrimary: false },
      });
    }

    revalidatePath(`/evidence/${data.evidenceId.toString()}/files`);
    revalidatePath(`/evidence/${data.evidenceId.toString()}`);
    return {
      success: true,
      redirectTo: `/evidence/${data.evidenceId.toString()}/files`,
    };
  } catch (error) {
    console.error('Add file error:', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0]?.message || 'ข้อมูลไฟล์ไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'เพิ่มไฟล์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function setPrimaryFile(evidenceId: string, fileId: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  try {
    const evId = BigInt(evidenceId);
    const fId = BigInt(fileId);

    const target = await prisma.evidenceFile.findUnique({
      where: { id: fId },
      select: {
        id: true,
        evidenceId: true,
        fileName: true,
        storageType: true,
        storagePath: true,
        externalUrl: true,
        mimeType: true,
        del: true,
        evidence: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!target || target.del || target.evidenceId !== evId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.evidence.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    const isImage =
      isImageFile(target.fileName) ||
      isImageFile(target.externalUrl) ||
      isImageFile(target.storagePath) ||
      isImageFile(undefined, target.mimeType || undefined);

    if (!isImage) {
      return { success: false, error: 'ตั้งเป็นไฟล์หลักได้เฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG)' };
    }

    await prisma.$transaction([
      prisma.evidenceFile.updateMany({
        where: { evidenceId: evId },
        data: { isPrimary: false },
      }),
      prisma.evidenceFile.update({
        where: { id: fId },
        data: { isPrimary: true },
      }),
    ]);

    revalidatePath(`/evidence/${evidenceId}/files`);
    revalidatePath(`/evidence/${evidenceId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ตั้งไฟล์หลักไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function deleteEvidenceFile(evidenceId: string, fileId: string) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  try {
    const target = await prisma.evidenceFile.findUnique({
      where: { id: BigInt(fileId) },
      select: {
        id: true,
        evidenceId: true,
        schoolId: true,
        del: true,
      },
    });

    if (!target || target.evidenceId !== BigInt(evidenceId) || target.del) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    await prisma.evidenceFile.update({
      where: { id: target.id },
      data: { del: true },
    });
    revalidatePath(`/evidence/${evidenceId}/files`);
    revalidatePath(`/evidence/${evidenceId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ลบไฟล์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function updateEvidenceFile(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  try {
    // ตรวจสอบว่ามีการส่ง isPrimary มาหรือไม่
    const hasIsPrimary = formData.has('isPrimary');
    const isPrimaryValue = formData.get('isPrimary') === 'on';
    
    const raw = {
      evidenceId: formData.get('evidenceId') as string,
      fileId: formData.get('fileId') as string,
      fileName: (formData.get('fileName') as string) || undefined,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: hasIsPrimary ? isPrimaryValue : undefined, // ส่ง undefined ถ้าไม่ส่งมาเลย
      note: (formData.get('note') as string) || undefined,
    };

    const data = updateEvidenceFileSchema.parse(raw);

    const existing = await prisma.evidenceFile.findUnique({
      where: { id: data.fileId },
      select: {
        id: true,
        evidenceId: true,
        fileName: true,
        storageType: true,
        storagePath: true,
        externalUrl: true,
        mimeType: true,
        del: true,
        evidence: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!existing || existing.del || existing.evidenceId !== data.evidenceId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), existing.evidence.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    const nextFileName = data.fileName ? data.fileName.trim() : existing.fileName;

    if (
      existing.storageType === 'URL' &&
      !(
        isAllowedFileType(nextFileName) ||
        isAllowedFileType(existing.fileName) ||
        isAllowedFileType(existing.externalUrl) ||
        isAllowedFileType(existing.storagePath) ||
        isAllowedFileType(undefined, existing.mimeType || undefined)
      )
    ) {
      return {
        success: false,
        error: `ไฟล์ต้องเป็น ${describeAllowedFileTypes()}`,
      };
    }

    if (
      existing.storageType === 'URL' &&
      data.isPrimary &&
      !(
        isImageFile(nextFileName) ||
        isImageFile(existing.fileName) ||
        isImageFile(existing.externalUrl) ||
        isImageFile(existing.storagePath) ||
        isImageFile(undefined, existing.mimeType || undefined)
      )
    ) {
      return {
        success: false,
        error: 'ตั้งเป็นไฟล์หลักได้เฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG)',
      };
    }

    // Update metadata
    await prisma.evidenceFile.update({
      where: { id: data.fileId },
      data: {
        fileName: data.fileName ? nextFileName : undefined,
        storagePath: data.storagePath,
        driveFileId: data.driveFileId,
        externalUrl: data.externalUrl,
        note: data.note,
      },
    });

    // Primary toggle: จัดการทั้งกรณีตั้ง primary และยกเลิก primary
    if (existing.storageType === 'URL' && data.isPrimary !== undefined) {
      if (data.isPrimary) {
        // ตั้งเป็น primary: ยกเลิก primary ของไฟล์อื่นทั้งหมด แล้วตั้งไฟล์นี้เป็น primary
        await prisma.$transaction([
          prisma.evidenceFile.updateMany({
            where: { evidenceId: data.evidenceId },
            data: { isPrimary: false },
          }),
          prisma.evidenceFile.update({
            where: { id: data.fileId },
            data: { isPrimary: true },
          }),
        ]);
      } else {
        // ยกเลิก primary: ตั้ง isPrimary = false สำหรับไฟล์นี้เท่านั้น
        await prisma.evidenceFile.update({
          where: { id: data.fileId },
          data: { isPrimary: false },
        });
      }
    }
    // ถ้า data.isPrimary === undefined = ไม่ส่ง isPrimary มาเลย = ไม่เปลี่ยนแปลงค่า isPrimary

    revalidatePath(`/evidence/${data.evidenceId.toString()}/files`);
    revalidatePath(`/evidence/${data.evidenceId.toString()}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'แก้ไขไฟล์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

/**
 * เพิ่มรีวิว
 */
export async function createReview(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  const user = session.user;
  const roleCodes = new Set((user.roles ?? []).map((role) => role.role));
  const allowedReviewRoles = ['ADMIN', 'QA_LEAD', 'ASSESSOR'];
  const canReview = allowedReviewRoles.some((role) => roleCodes.has(role));
  if (!canReview) {
    return { success: false, error: 'คุณไม่มีสิทธิ์สร้างรีวิว' };
  }
  try {
    const evidenceFileInput = formData.get('evidenceFileId');
    const raw = {
      evidenceId: formData.get('evidenceId') as string,
      evidenceFileId: typeof evidenceFileInput === 'string' ? evidenceFileInput : undefined,
      reviewStatus: formData.get('reviewStatus') as string,
      score: (formData.get('score') as string) || undefined,
      comment: (formData.get('comment') as string) || undefined,
    };
    const data = createReviewSchema.parse(raw);

    const evidence = await prisma.evidence.findUnique({
      where: { id: data.evidenceId },
      select: { schoolId: true },
    });

    if (!evidence) {
      return { success: false, error: 'ไม่พบหลักฐาน' };
    }

    let selectedFile:
      | {
          id: bigint;
          schoolId: bigint;
        }
      | null = null;

    if (data.evidenceFileId) {
      selectedFile = await prisma.evidenceFile.findFirst({
        where: {
          id: data.evidenceFileId,
          evidenceId: data.evidenceId,
          del: false,
        },
        select: { id: true, schoolId: true },
      });

      if (!selectedFile) {
        return { success: false, error: 'ไม่พบไฟล์หลักฐานที่เลือก' };
      }
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), evidence.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
    }

    const review = await prisma.evidenceReview.create({
      data: {
        evidenceId: data.evidenceId,
        evidenceFileId: selectedFile?.id ?? null,
        schoolId: evidence.schoolId,
        reviewerId: BigInt(user.id),
        reviewStatus: data.reviewStatus,
        score: data.score,
        comment: data.comment,
      },
    });

    await logAction(
      user.id,
      AUDIT_ACTIONS.CREATE_REVIEW,
      'EvidenceReview',
      review.id,
      evidence.schoolId,
      {
        evidenceId: data.evidenceId.toString(),
        evidenceFileId: selectedFile?.id?.toString(),
        reviewStatus: data.reviewStatus,
        score: data.score ?? undefined,
      }
    );

    revalidatePath(`/evidence/${data.evidenceId.toString()}/reviews`);
    revalidatePath(`/evidence/${data.evidenceId.toString()}`);
    return {
      success: true,
      redirectTo: `/evidence/${data.evidenceId.toString()}/reviews`,
    };
  } catch (error) {
    console.error('Create review error:', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0]?.message || 'ข้อมูลรีวิวไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'เพิ่มรีวิวไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function updateReview(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  const user = session.user;
  const roles = user.roles ?? [];

  try {
    const evidenceFileInput = formData.get('evidenceFileId');
    const hasEvidenceFileField = typeof evidenceFileInput === 'string';

    const raw = {
      reviewId: formData.get('reviewId') as string,
      evidenceId: formData.get('evidenceId') as string,
      evidenceFileId: hasEvidenceFileField ? (evidenceFileInput as string) : undefined,
      reviewStatus: formData.get('reviewStatus') as string,
      score: (formData.get('score') as string) || undefined,
      comment: (formData.get('comment') as string) || undefined,
    };
    const data = updateReviewSchema.parse(raw);

    const existing = await prisma.evidenceReview.findUnique({
      where: { id: data.reviewId },
      select: {
        id: true,
        reviewerId: true,
        evidenceId: true,
        schoolId: true,
        evidenceFileId: true,
      },
    });

    if (!existing || existing.evidenceId !== data.evidenceId) {
      return { success: false, error: 'ไม่พบรีวิว' };
    }

    const userRoleCodes = roles.map((role) => role.role);
    const isAdmin = userRoleCodes.includes('ADMIN');
    const isQaLead = userRoleCodes.includes('QA_LEAD');
    const isAssessor = userRoleCodes.includes('ASSESSOR');
    const isReviewer = existing.reviewerId.toString() === user.id;
    const hasSchoolAccess = isAdmin || (await canAccessSchool(BigInt(user.id), existing.schoolId));

    if (!hasSchoolAccess || !(isReviewer || isAdmin || isQaLead || isAssessor)) {
      return { success: false, error: 'ไม่มีสิทธิ์แก้ไขรีวิว' };
    }

    let nextEvidenceFileId: bigint | null | undefined = existing.evidenceFileId ?? null;

    if (data.evidenceFileId) {
      const fileRecord = await prisma.evidenceFile.findFirst({
        where: {
          id: data.evidenceFileId,
          evidenceId: data.evidenceId,
          del: false,
        },
        select: { id: true },
      });

      if (!fileRecord) {
        return { success: false, error: 'ไม่พบไฟล์หลักฐานที่เลือก' };
      }
      nextEvidenceFileId = fileRecord.id;
    } else if (hasEvidenceFileField) {
      // ผู้ใช้เลือก "ไม่ผูกไฟล์"
      nextEvidenceFileId = null;
    }

    await prisma.evidenceReview.update({
      where: { id: data.reviewId },
      data: {
        reviewStatus: data.reviewStatus,
        score: data.score ?? null,
        comment: data.comment,
        reviewedAt: new Date(),
        ...(hasEvidenceFileField ? { evidenceFileId: nextEvidenceFileId } : {}),
      },
    });

    revalidatePath(`/evidence/${data.evidenceId.toString()}/reviews`);
    revalidatePath(`/evidence/${data.evidenceId.toString()}`);

    return {
      success: true,
      redirectTo: `/evidence/${data.evidenceId.toString()}/reviews`,
    };
  } catch (error) {
    console.error('Update review error:', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors?.[0]?.message || 'ข้อมูลรีวิวไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'แก้ไขรีวิวไม่สำเร็จ';
    return { success: false, error: message };
  }
}
/**
 * ดึงตัวชี้วัดตามมาตรฐาน
 */
export async function getIndicatorsByStandard(standardId: string) {
  try {
    const indicators = await prisma.qAIndicator.findMany({
      where: {
        standardId: BigInt(standardId),
      },
      orderBy: {
        sortNo: 'asc',
      },
      select: {
        id: true,
        code: true,
        nameTh: true,
        descriptionTh: true,
        sortNo: true,
      },
    });

    return { success: true, data: indicators };
  } catch (error) {
    console.error('Error fetching indicators:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลตัวชี้วัดได้' };
  }
}

/**
 * ดึงตัวชี้วัดย่อยตามตัวชี้วัด
 */
export async function getSubIndicatorsByIndicator(indicatorId: string) {
  try {
    const subIndicators = await prisma.qASubIndicator.findMany({
      where: {
        indicatorId: BigInt(indicatorId),
      },
      orderBy: {
        itemNo: 'asc',
      },
      select: {
        id: true,
        itemNo: true,
        textTh: true,
      },
    });

    return {
      success: true,
      data: subIndicators.map((sub) => ({
        id: sub.id.toString(),
        itemNo: sub.itemNo,
        textTh: sub.textTh,
      })),
    };
  } catch (error) {
    console.error('Error fetching sub-indicators:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลตัวชี้วัดย่อยได้' };
  }
}

/**
 * ดึงข้อมูล indicator พร้อม standard และ level
 */
export async function getIndicatorById(indicatorId: string) {
  try {
    const indicator = await prisma.qAIndicator.findUnique({
      where: {
        id: BigInt(indicatorId),
      },
      include: {
        standard: {
          include: {
            level: true,
          },
        },
      },
    });

    if (!indicator) {
      return { success: false, error: 'ไม่พบตัวชี้วัด' };
    }

    return {
      success: true,
      data: {
        id: indicator.id.toString(),
        code: indicator.code,
        nameTh: indicator.nameTh,
        standardId: indicator.standardId.toString(),
        standardCode: indicator.standard.code,
        standardName: indicator.standard.nameTh,
        levelId: indicator.standard.levelId,
        levelCode: indicator.standard.level.code,
        levelName: indicator.standard.level.nameTh,
      },
    };
  } catch (error) {
    console.error('Error fetching indicator:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลตัวชี้วัดได้' };
  }
}

/**
 * ดึงรหัสหลักฐานถัดไป (สำหรับ preview)
 */
export async function getNextEvidenceCode(indicatorId: string, academicYear?: number) {
  try {
    const ay = academicYear || thaiAcademicYear();
    const code = await nextEvidenceCode(BigInt(indicatorId), ay);
    return { success: true, data: code };
  } catch (error) {
    console.error('Error generating evidence code:', error);
    return { success: false, error: 'ไม่สามารถสร้างรหัสหลักฐานได้' };
  }
}

/**
 * สร้างหลักฐานใหม่ (PQA: หลักฐานหนึ่งชิ้นผูกตัวชี้วัด QA ได้ และสามารถผูกกับรายการ PA ภายหลังได้)
 */
export async function createEvidence(formData: FormData) {
  const session = await auth();

  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;
  const roles = user.roles ?? [];
  const roleCodes = new Set(roles.map((role) => role.role));
  const allowedRoles = ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'];
  const hasAllowedRole = allowedRoles.some((role) => roleCodes.has(role));
  if (!hasAllowedRole) {
    return { success: false, error: 'คุณไม่มีสิทธิ์สร้างหลักฐานใหม่' };
  }

  try {
    // Parse form data
    const rawData = {
      schoolId: formData.get('schoolId') as string,
      indicatorId: formData.get('indicatorId') as string,
      fiscalYear: formData.get('fiscalYear')
        ? parseInt(formData.get('fiscalYear') as string)
        : thaiFiscalYear(),
      academicYear: formData.get('academicYear')
        ? parseInt(formData.get('academicYear') as string)
        : thaiAcademicYear(),
      title: formData.get('title') as string,
      description: formData.get('description') as string | null,
      ownerUserId: formData.get('ownerUserId') as string | null,
      status: (formData.get('status') as string) || 'PENDING',
      privacyLevel: (formData.get('privacyLevel') as string) || 'INTERNAL',
    };

    // Validate
    const validated = createEvidenceSchema.parse(rawData);

    // ตรวจสอบ school access
    const hasAccess = await canAccessSchool(BigInt(user.id), validated.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
    }

    // สร้างรหัสหลักฐานอัตโนมัติ
    const evidenceCode = await nextEvidenceCode(validated.indicatorId, validated.fiscalYear);

    // สร้างหลักฐาน
    const evidence = await prisma.evidence.create({
      data: {
        schoolId: validated.schoolId,
        indicatorId: validated.indicatorId,
        fiscalYear: validated.fiscalYear,
        academicYear: validated.academicYear,
        title: validated.title,
        description: validated.description || null,
        evidenceCode,
        status: validated.status,
        privacyLevel: validated.privacyLevel,
        ownerUserId: validated.ownerUserId || BigInt(user.id),
        createdBy: BigInt(user.id),
      },
    });

    // Audit log
    await logAction(
      user.id,
      AUDIT_ACTIONS.CREATE_EVIDENCE,
      'Evidence',
      evidence.id,
      validated.schoolId,
      {
        evidenceCode,
        title: validated.title,
        indicatorId: validated.indicatorId.toString(),
      }
    );

    revalidatePath('/evidence');
    revalidatePath('/dashboard');

    // Return result แทน redirect เพื่อให้ client component จัดการ redirect
    const action = formData.get('action') as string;
    return {
      success: true,
      evidenceId: evidence.id.toString(),
      redirectTo: action === 'save-and-add-files' 
        ? `/evidence/${evidence.id}/files`
        : `/evidence/${evidence.id}`,
    };
  } catch (error) {
    console.error('Error creating evidence:', error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง',
      };
    }
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างหลักฐาน';
    return { success: false, error: message };
  }
}

/**
 * สร้างหลักฐานจากหน้า "เก็บงาน" — ใช้ตัวชี้วัด QA default แล้วให้ AI แนะนำและเชื่อมโยงภายหลัง
 * รองรับ: รูปภาพ, วิดีโอ (upload/YouTube/Drive), เอกสาร (Canva/PDF/PPT), ข้อความอธิบาย
 */
export async function createWorkCollectionItem(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };

  const user = session.user;
  const roles = user.roles ?? [];
  const allowed = ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'].some((r) =>
    roles.some((x) => x.role === r)
  );
  if (!allowed) return { success: false, error: 'คุณไม่มีสิทธิ์เพิ่มงานเก็บงาน' };

  const schoolIdRaw = formData.get('schoolId') as string;
  const schoolId = BigInt(schoolIdRaw || '0');
  const fiscalYear = formData.get('fiscalYear')
    ? parseInt(formData.get('fiscalYear') as string, 10)
    : thaiFiscalYear();
  const academicYear = formData.get('academicYear')
    ? parseInt(formData.get('academicYear') as string, 10)
    : thaiAcademicYear();
  const title = (formData.get('title') as string)?.trim() || '';
  const description = (formData.get('description') as string)?.trim() || null;

  if (!title) return { success: false, error: 'กรุณาระบุชื่อหรือหัวข้อหลักฐาน' };

  const hasAccess = await canAccessSchool(BigInt(user.id), schoolId);
  if (!hasAccess) return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };

  try {
    const defaultIndicatorId = await getDefaultQAIndicatorId();
    const evidenceCode = await nextEvidenceCode(defaultIndicatorId, fiscalYear);

    const evidence = await prisma.evidence.create({
      data: {
        schoolId,
        indicatorId: defaultIndicatorId,
        fiscalYear,
        academicYear,
        title,
        description,
        evidenceCode,
        status: 'PENDING',
        privacyLevel: 'INTERNAL',
        ownerUserId: BigInt(user.id),
        createdBy: BigInt(user.id),
      },
    });

    await logAction(
      user.id,
      AUDIT_ACTIONS.CREATE_EVIDENCE,
      'Evidence',
      evidence.id,
      schoolId,
      { evidenceCode, title, source: 'work-collection' }
    );

    const storageType = (formData.get('storageType') as string) || 'URL';
    const externalUrl = (formData.get('externalUrl') as string)?.trim();
    const fileFileName = (formData.get('fileName') as string)?.trim();
    const uploadedFiles = formData.getAll('files') as File[];
    const hasLink = ['YOUTUBE', 'GDRIVE', 'CANVA', 'LINK'].includes(storageType) && externalUrl;
    const hasUpload = storageType === 'URL' && uploadedFiles.length > 0 && uploadedFiles[0]?.size;

    if (hasUpload) {
      const hasVideo = uploadedFiles.some((f) => f && isVideoFile(f.name, f.type));
      if (hasVideo && uploadedFiles.length > 1) {
        return { success: false, error: 'วิดีโออัปโหลดได้ครั้งละ 1 ไฟล์เท่านั้น' };
      }
      if (!hasVideo && uploadedFiles.length > 5) {
        return { success: false, error: 'รูปภาพหรือเอกสาร PDF/PPT แนบได้ครั้งละไม่เกิน 5 ไฟล์' };
      }
    }

    if (hasLink || hasUpload) {
      const fileFormData = new FormData();
      fileFormData.set('evidenceId', evidence.id.toString());
      fileFormData.set('storageType', storageType);
      if (externalUrl) {
        fileFormData.set('externalUrl', externalUrl);
        fileFormData.set('storagePath', externalUrl);
      }
      if (fileFileName) fileFormData.set('fileName', fileFileName);
      else if (hasLink)
        fileFormData.set(
          'fileName',
          storageType === 'YOUTUBE'
            ? 'วิดีโอ YouTube'
            : storageType === 'GDRIVE'
              ? 'ไฟล์ Google Drive'
              : 'ลิงก์'
        );
      uploadedFiles.forEach((f) => f && fileFormData.append('files', f));

      const addResult = await addEvidenceFile(fileFormData);
      if (!addResult.success) {
        await prisma.evidence.update({
          where: { id: evidence.id },
          data: { description: description || undefined },
        });
        return { success: true, evidenceId: evidence.id.toString(), fileError: addResult.error };
      }
    }

    revalidatePath('/work-collection');
    revalidatePath('/evidence');
    revalidatePath('/dashboard');

    return { success: true, evidenceId: evidence.id.toString() };
  } catch (error) {
    console.error('[createWorkCollectionItem]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก',
    };
  }
}

