import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { getUploadBaseDir } from '@/lib/uploads-path';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';
import path from 'path';
import { writeUploadedFile } from '@/lib/file-stream';
import { mkdir, writeFile } from 'fs/promises';
import {
  isImageFile,
  isVideoFile,
  isPdfFile,
  isAllowedFileType,
  describeAllowedFileTypes,
} from '@/lib/file-types';
import { generateVideoThumbnail } from '@/lib/video-thumbnail';

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
    const lpId = BigInt(id);
    const user = session.user;

    // ตรวจสอบสิทธิ์
    const lp = await prisma.lessonPlan.findUnique({
      where: { id: lpId },
      select: { schoolId: true },
    });
    if (!lp) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), lp.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เพิ่มไฟล์' }, { status: 403 });
    }

    // ตรวจสอบ Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      console.error('[api/lesson-plans/files] Invalid Content-Type:', contentType);
      return NextResponse.json(
        { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('[api/lesson-plans/files] FormData parse error:', error);
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
    const fileTypeEntry = formData.get('fileType');
    const fileType: 'PLAN' | 'REFLECTION' | 'OTHER' =
      fileTypeEntry === 'REFLECTION' || fileTypeEntry === 'OTHER'
        ? fileTypeEntry
        : 'PLAN';

    const raw = {
      lessonPlanId: id,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: (formData.get('isPrimary') as string) === 'on',
      description: (formData.get('description') as string) || undefined,
      storageType,
      fileName: inputFileName || undefined,
      driveFileId: (formData.get('driveFileId') as string) || undefined,
      fileType,
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
        if (videoSizeMB > 1000) {
          return NextResponse.json(
            { success: false, error: 'ขนาดวิดีโอต้องไม่เกิน 1000 MB' },
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

      // แยก folder ตามประเภทไฟล์
      let folderName: string;
      if (imageFiles.length > 0) {
        folderName = 'images';
      } else if (videoFiles.length > 0) {
        folderName = 'videos';
      } else if (pdfFiles.length > 0) {
        folderName = 'files';
      } else {
        folderName = 'files';
      }

      const uploadDir = path.join(
        getUploadBaseDir(),
        'lesson-plans',
        lpId.toString(),
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

      // กรณีรูปภาพ: เก็บหลายไฟล์เป็น array JSON ใน record เดียว
      if (imageFiles.length > 0) {
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

          const urlPath = `/uploads/lesson-plans/${lpId.toString()}/${folderName}/${safeName}`;
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

        // สร้าง LessonPlanFile record เดียวสำหรับกลุ่มรูปภาพ
        const created = await prisma.lessonPlanFile.create({
          data: {
            lessonPlanId: lpId,
            schoolId: lp.schoolId,
            fileName: finalName,
            storageType: 'URL',
            externalUrl: thumbnailUrl,
            thumbnailUrl: thumbnailUrl,
            fileUrls: fileUrlsArray,
            mimeType: imageFiles[0].type || undefined,
            fileSize: imageFiles.reduce((sum, f) => sum + (typeof f.size === 'number' ? f.size : 0), 0),
            fileType: raw.fileType,
            isPrimary: false,
            description: raw.description || null,
            uploadedBy: BigInt(user.id),
          },
        });

        await logAction(
          BigInt(user.id),
          AUDIT_ACTIONS.UPLOAD_LESSON_PLAN_FILE,
          'lessonplanfile',
          created.id,
          lp.schoolId
        );

        revalidatePath(`/lesson-plans/${lpId.toString()}/files`);
        revalidatePath(`/lesson-plans/${lpId.toString()}`);

        return NextResponse.json({
          success: true,
          redirectTo: `/lesson-plans/${lpId.toString()}/files`,
        });
      }

      // กรณีวิดีโอหรือไฟล์อื่น: เก็บทีละไฟล์
      for (let index = 0; index < filesToProcess.length; index += 1) {
        const f = filesToProcess[index];
        const timestamp = Date.now() + index;
        const safeName = `${timestamp}-${f.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(uploadDir, safeName);
        // เขียนแบบ stream — ไฟล์วิดีโอขนาดใหญ่ไม่ถูกโหลดเข้า heap ทั้งก้อน
        await writeUploadedFile(f, filePath);

        const urlPath = `/uploads/lesson-plans/${lpId.toString()}/${folderName}/${safeName}`;
        const baseName = raw.fileName
          ? filesToProcess.length > 1
            ? `${raw.fileName}-${index + 1}`
            : raw.fileName
          : path.parse(f.name).name;
        const finalName = baseName.trim();

        // สร้าง thumbnail สำหรับวิดีโอ
        let thumbnailUrl: string | undefined;
        if (isVideoFile(f.name, f.type)) {
          const thumbnailName = `${timestamp}-thumbnail.jpg`;
          const thumbnailPath = path.join(uploadDir, thumbnailName);
          const thumbnailGenerated = await generateVideoThumbnail(filePath, thumbnailPath, 10);
          if (thumbnailGenerated) {
            thumbnailUrl = `/uploads/lesson-plans/${lpId.toString()}/${folderName}/${thumbnailName}`;
          } else {
            console.warn(`[lesson-plans] Failed to generate thumbnail for video: ${filePath}`);
          }
        }

        const created = await prisma.lessonPlanFile.create({
          data: {
            lessonPlanId: lpId,
            schoolId: lp.schoolId,
            fileName: finalName,
            storageType: 'URL',
            externalUrl: urlPath,
            thumbnailUrl: thumbnailUrl || undefined,
            mimeType: f.type || undefined,
            fileSize: typeof f.size === 'number' ? Math.round(f.size) : undefined,
            fileType: raw.fileType,
            isPrimary: false,
            description: raw.description || null,
            uploadedBy: BigInt(user.id),
          },
        });

        await logAction(
          BigInt(user.id),
          AUDIT_ACTIONS.UPLOAD_LESSON_PLAN_FILE,
          'lessonplanfile',
          created.id,
          lp.schoolId
        );
      }

      revalidatePath(`/lesson-plans/${lpId.toString()}/files`);
      revalidatePath(`/lesson-plans/${lpId.toString()}`);

      return NextResponse.json({
        success: true,
        redirectTo: `/lesson-plans/${lpId.toString()}/files`,
      });
    }

    // Handle other storage types (YOUTUBE, GDRIVE, CANVA, LINK) - reuse from server action
    return NextResponse.json(
      { success: false, error: 'กรุณาใช้ server action สำหรับประเภทไฟล์อื่น' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[api/lesson-plans/files] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' },
      { status: 500 }
    );
  }
}

