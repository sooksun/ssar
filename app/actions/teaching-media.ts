'use server';

import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { logAction } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import {
  createTeachingMediaSchema,
  updateTeachingMediaSchema,
  updateTeachingMediaFileSchema,
  teachingMediaFileSchema,
} from '@/lib/validations/teaching-media';
import type {
  EvidenceStorageType,
  Prisma,
  TeachingMediaStatus,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

type TeachingMediaUpdateData = {
  title?: string;
  description?: string | null;
  teacherName?: string;
  status?: TeachingMediaStatus;
  updatedBy?: bigint;
};

/**
 * สร้างสื่อการสอนใหม่
 */
export async function createTeachingMedia(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const rawData = {
      schoolId: formData.get('schoolId') as string,
      indicatorId: formData.get('indicatorId') as string,
      academicYear: formData.get('academicYear')
        ? (formData.get('academicYear') as string)
        : thaiAcademicYear().toString(),
      fiscalYear: formData.get('fiscalYear')
        ? (formData.get('fiscalYear') as string)
        : thaiFiscalYear().toString(),
      title: formData.get('title') as string,
      description: formData.get('description') as string | null,
      teacherName: formData.get('teacherName') as string,
      teacherId: formData.get('teacherId') as string | null,
      status: (formData.get('status') as string) || 'DRAFT',
    };

    const validated = createTeachingMediaSchema.parse(rawData);

    // ตรวจสอบสิทธิ์เข้าถึงโรงเรียน
    const hasAccess = await canAccessSchool(BigInt(user.id), BigInt(validated.schoolId));
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
    }

    const schoolId = BigInt(validated.schoolId);
    const indicatorId = BigInt(validated.indicatorId);
    const status: TeachingMediaStatus = validated.status;

    // สร้างสื่อการสอน
    const teachingMedia = await prisma.teachingMedia.create({
      data: {
        schoolId,
        indicatorId,
        academicYear: validated.academicYear,
        fiscalYear: validated.fiscalYear,
        title: validated.title,
        description: validated.description || null,
        teacherName: validated.teacherName,
        teacherId: validated.teacherId ? BigInt(validated.teacherId) : null,
        status,
        createdBy: BigInt(user.id),
      },
    });

    // Log action
    await logAction(
      BigInt(user.id),
      'CREATE_TEACHING_MEDIA',
      'teachingmedia',
      teachingMedia.id,
      schoolId,
      { title: validated.title }
    );

    revalidatePath('/teaching-media');
    return { success: true, data: { id: teachingMedia.id.toString() } };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error creating teaching media:', error);
    return { success: false, error: 'ไม่สามารถสร้างสื่อการสอนได้' };
  }
}

/**
 * อัปเดตสื่อการสอน
 */
export async function updateTeachingMedia(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const raw = {
      id: formData.get('id') as string,
      title: formData.get('title') as string | null,
      description: formData.get('description') as string | null,
      teacherName: formData.get('teacherName') as string | null,
      status: formData.get('status') as string | null,
    };

    const validated = updateTeachingMediaSchema.parse(raw);

    const existing = await prisma.teachingMedia.findUnique({
      where: { id: BigInt(validated.id) },
      select: { schoolId: true },
    });

    if (!existing) {
      return { success: false, error: 'ไม่พบสื่อการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    const updateData: TeachingMediaUpdateData = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.teacherName) updateData.teacherName = validated.teacherName;
    if (validated.status) updateData.status = validated.status;
    updateData.updatedBy = BigInt(user.id);

    const updated = await prisma.teachingMedia.update({
      where: { id: BigInt(validated.id) },
      data: updateData,
    });

    await logAction(
      BigInt(user.id),
      'UPDATE_TEACHING_MEDIA',
      'teachingmedia',
      updated.id,
      existing.schoolId
    );

    revalidatePath('/teaching-media');
    revalidatePath(`/teaching-media/${validated.id}`);
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error updating teaching media:', error);
    return { success: false, error: 'ไม่สามารถอัปเดตสื่อการสอนได้' };
  }
}

/**
 * ดึงข้อมูลสื่อการสอน
 */
export async function getTeachingMediaById(id: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const teachingMedia = await prisma.teachingMedia.findUnique({
      where: { id: BigInt(id), del: false },
      include: {
        school: {
          select: { sc_id: true, name: true },
        },
        indicator: {
          select: { id: true, code: true, nameTh: true },
        },
        files: {
          where: { del: false },
          orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
        },
      },
    });

    if (!teachingMedia) {
      return { success: false, error: 'ไม่พบสื่อการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), teachingMedia.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    return { success: true, data: teachingMedia };
  } catch (error) {
    console.error('Error fetching teaching media:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลสื่อการสอนได้' };
  }
}

/**
 * ดึงรายการสื่อการสอน
 */
export async function getTeachingMediaList(options: {
  schoolId?: string;
  academicYear?: number;
  indicatorId?: string;
}) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;
  const roles = user.roles ?? [];
  const accessibleSchoolIds = new Set<string>(roles.map((role) => role.schoolId));

  try {
    const where: Prisma.TeachingMediaWhereInput = {
      del: false,
    };

    if (options.schoolId) {
      if (!accessibleSchoolIds.has(options.schoolId)) {
        return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
      }
      where.schoolId = BigInt(options.schoolId);
    } else {
      where.schoolId = {
        in: Array.from(accessibleSchoolIds).map((id) => BigInt(id)),
      };
    }

    if (options.academicYear) {
      where.academicYear = options.academicYear;
    }

    if (options.indicatorId) {
      where.indicatorId = BigInt(options.indicatorId);
    }

    const teachingMedia = await prisma.teachingMedia.findMany({
      where,
      include: {
        school: {
          select: { sc_id: true, name: true },
        },
        indicator: {
          select: { id: true, code: true, nameTh: true },
        },
        files: {
          where: { del: false },
          orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: teachingMedia };
  } catch (error) {
    console.error('Error fetching teaching media list:', error);
    return { success: false, error: 'ไม่สามารถดึงรายการสื่อการสอนได้' };
  }
}

/**
 * เพิ่มไฟล์ให้สื่อการสอน
 */
export async function addTeachingMediaFile(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const raw = {
      teachingMediaId: formData.get('teachingMediaId') as string,
      fileName: formData.get('fileName') as string | null,
      storageType: formData.get('storageType') as string,
      storagePath: formData.get('storagePath') as string | null,
      driveFileId: formData.get('driveFileId') as string | null,
      externalUrl: formData.get('externalUrl') as string | null,
      thumbnailUrl: formData.get('thumbnailUrl') as string | null,
      description: formData.get('description') as string | null,
      isPrimary: formData.get('isPrimary') === 'true',
    };

    // สำหรับ YOUTUBE, GDRIVE, CANVA, LINK ต้องมี fileName
    if (!raw.fileName && ['YOUTUBE', 'GDRIVE', 'CANVA', 'LINK'].includes(raw.storageType || '')) {
      return { success: false, error: 'กรุณากรอกชื่อไฟล์' };
    }

    // สำหรับ YOUTUBE, GDRIVE, CANVA ต้องมี storagePath
    if (['YOUTUBE', 'GDRIVE', 'CANVA'].includes(raw.storageType || '')) {
      if (!raw.storagePath || raw.storagePath.trim().length === 0) {
        return { success: false, error: 'กรุณาระบุลิงก์' };
      }
      // ใช้ storagePath เป็น externalUrl ด้วย
      raw.externalUrl = raw.storagePath;
    }

    // สำหรับ LINK ต้องมี externalUrl
    if (raw.storageType === 'LINK') {
      if (!raw.externalUrl || raw.externalUrl.trim().length === 0) {
        return { success: false, error: 'กรุณาระบุลิงก์เว็บไซต์' };
      }
    }

    const validated = teachingMediaFileSchema.parse(raw);

    const teachingMedia = await prisma.teachingMedia.findUnique({
      where: { id: BigInt(raw.teachingMediaId) },
      select: { schoolId: true },
    });

    if (!teachingMedia) {
      return { success: false, error: 'ไม่พบสื่อการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), teachingMedia.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    // ถ้า set เป็น primary ให้ reset ไฟล์อื่น
    if (validated.isPrimary) {
      await prisma.teachingMediaFile.updateMany({
        where: {
          teachingMediaId: BigInt(raw.teachingMediaId),
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const storageType: EvidenceStorageType = validated.storageType;
    const mimeTypeValue = formData.get('mimeType');
    const mimeType = typeof mimeTypeValue === 'string' ? mimeTypeValue : null;
    const fileSizeValue = formData.get('fileSize');
    const parsedFileSize =
      typeof fileSizeValue === 'string' && fileSizeValue.trim().length > 0
        ? Number.parseInt(fileSizeValue, 10)
        : null;
    const fileSize = parsedFileSize !== null && Number.isNaN(parsedFileSize) ? null : parsedFileSize;

    const file = await prisma.teachingMediaFile.create({
      data: {
        teachingMediaId: BigInt(raw.teachingMediaId),
        schoolId: teachingMedia.schoolId,
        fileName: validated.fileName,
        mimeType,
        fileSize,
        storageType,
        storagePath: validated.storagePath || null,
        driveFileId: validated.driveFileId || null,
        externalUrl: validated.externalUrl || null,
        thumbnailUrl: validated.thumbnailUrl || null,
        description: validated.description || null,
        isPrimary: validated.isPrimary,
        uploadedBy: BigInt(user.id),
      },
    });

    await logAction(
      BigInt(user.id),
      'UPLOAD_TEACHING_MEDIA_FILE',
      'teachingmediafile',
      file.id,
      teachingMedia.schoolId
    );

    revalidatePath(`/teaching-media/${raw.teachingMediaId}`);
    return { success: true, data: file };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error adding teaching media file:', error);
    return { success: false, error: 'ไม่สามารถเพิ่มไฟล์ได้' };
  }
}

/**
 * ลบสื่อการสอน
 */
export async function deleteTeachingMedia(id: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const existing = await prisma.teachingMedia.findUnique({
      where: { id: BigInt(id) },
      select: { schoolId: true },
    });

    if (!existing) {
      return { success: false, error: 'ไม่พบสื่อการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    await prisma.teachingMedia.update({
      where: { id: BigInt(id) },
      data: { del: true, updatedBy: BigInt(user.id) },
    });

    await logAction(
      BigInt(user.id),
      'DELETE_TEACHING_MEDIA',
      'teachingmedia',
      BigInt(id),
      existing.schoolId
    );

    revalidatePath('/teaching-media');
    return { success: true };
  } catch (error) {
    console.error('Error deleting teaching media:', error);
    return { success: false, error: 'ไม่สามารถลบสื่อการสอนได้' };
  }
}

/**
 * อัปเดตไฟล์สื่อการสอน
 */
export async function updateTeachingMediaFile(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const hasIsPrimary = formData.has('isPrimary');
    const isPrimaryValue = formData.get('isPrimary') === 'on';

    const raw = {
      teachingMediaId: formData.get('teachingMediaId') as string,
      fileId: formData.get('fileId') as string,
      fileName: (formData.get('fileName') as string) || undefined,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: hasIsPrimary ? isPrimaryValue : undefined,
      description: (formData.get('description') as string) || undefined,
    };

    const data = updateTeachingMediaFileSchema.parse(raw);

    const existing = await prisma.teachingMediaFile.findUnique({
      where: { id: BigInt(data.fileId) },
      include: {
        teachingMedia: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!existing || existing.del || existing.teachingMediaId.toString() !== data.teachingMediaId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.teachingMedia.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    // ถ้า set เป็น primary ให้ reset ไฟล์อื่น
    if (data.isPrimary === true) {
      await prisma.teachingMediaFile.updateMany({
        where: {
          teachingMediaId: BigInt(data.teachingMediaId),
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    await prisma.teachingMediaFile.update({
      where: { id: BigInt(data.fileId) },
      data: {
        ...(data.fileName && { fileName: data.fileName }),
        ...(data.storagePath !== undefined && { storagePath: data.storagePath || null }),
        ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl || null }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
    });

    revalidatePath(`/teaching-media/${data.teachingMediaId}/files`);
    revalidatePath(`/teaching-media/${data.teachingMediaId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error updating teaching media file:', error);
    return { success: false, error: 'ไม่สามารถอัปเดตไฟล์ได้' };
  }
}

/**
 * ตั้งเป็นไฟล์หลัก
 */
export async function setPrimaryTeachingMediaFile(teachingMediaId: string, fileId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  try {
    const tmId = BigInt(teachingMediaId);
    const fId = BigInt(fileId);

    const target = await prisma.teachingMediaFile.findUnique({
      where: { id: fId },
      include: {
        teachingMedia: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!target || target.del || target.teachingMediaId !== tmId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.teachingMedia.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    const { isImageFile } = await import('@/lib/file-types');
    const isImage =
      isImageFile(target.fileName) ||
      isImageFile(target.externalUrl) ||
      isImageFile(target.storagePath) ||
      isImageFile(undefined, target.mimeType || undefined);

    if (!isImage) {
      return { success: false, error: 'ตั้งเป็นไฟล์หลักได้เฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG)' };
    }

    await prisma.$transaction([
      prisma.teachingMediaFile.updateMany({
        where: { teachingMediaId: tmId },
        data: { isPrimary: false },
      }),
      prisma.teachingMediaFile.update({
        where: { id: fId },
        data: { isPrimary: true },
      }),
    ]);

    revalidatePath(`/teaching-media/${teachingMediaId}/files`);
    revalidatePath(`/teaching-media/${teachingMediaId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ตั้งไฟล์หลักไม่สำเร็จ';
    return { success: false, error: message };
  }
}

/**
 * ลบไฟล์สื่อการสอน
 */
export async function deleteTeachingMediaFile(teachingMediaId: string, fileId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  try {
    const target = await prisma.teachingMediaFile.findUnique({
      where: { id: BigInt(fileId) },
      include: {
        teachingMedia: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!target || target.teachingMediaId.toString() !== teachingMediaId || target.del) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.teachingMedia.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    await prisma.teachingMediaFile.update({
      where: { id: target.id },
      data: { del: true },
    });

    revalidatePath(`/teaching-media/${teachingMediaId}/files`);
    revalidatePath(`/teaching-media/${teachingMediaId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ลบไฟล์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}