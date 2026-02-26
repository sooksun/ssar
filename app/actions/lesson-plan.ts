'use server';

import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { logAction } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import {
  createLessonPlanSchema,
  updateLessonPlanSchema,
  updateLessonPlanFileSchema,
  lessonPlanFileSchema,
} from '@/lib/validations/lesson-plan';
import type {
  EvidenceStorageType,
  LessonPlanFileType,
  LessonPlanStatus,
  Prisma,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

type LessonPlanUpdateData = {
  title?: string;
  description?: string | null;
  teacherName?: string;
  subject?: string | null;
  grade?: string | null;
  planDate?: Date | null;
  submittedAt?: Date | null;
  reflection?: string | null;
  status?: LessonPlanStatus;
  updatedBy?: bigint;
};

const LESSON_PLAN_STATUS_SET = new Set<LessonPlanStatus>([
  'DRAFT',
  'SUBMITTED',
  'REVIEWED',
  'APPROVED',
  'REJECTED',
]);

const isLessonPlanStatus = (value: string): value is LessonPlanStatus =>
  LESSON_PLAN_STATUS_SET.has(value as LessonPlanStatus);

/**
 * สร้างแผนการสอนใหม่
 */
export async function createLessonPlan(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const rawData = {
      schoolId: formData.get('schoolId') as string,
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
      subject: formData.get('subject') as string | null,
      grade: formData.get('grade') as string | null,
      planDate: formData.get('planDate') as string | null,
      submittedAt: formData.get('submittedAt') as string | null,
      reflection: formData.get('reflection') as string | null,
      status: (formData.get('status') as string) || 'DRAFT',
    };

    const validated = createLessonPlanSchema.parse(rawData);

    // ตรวจสอบสิทธิ์เข้าถึงโรงเรียน
    const hasAccess = await canAccessSchool(BigInt(user.id), BigInt(validated.schoolId));
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
    }

    const schoolId = BigInt(validated.schoolId);
    const status: LessonPlanStatus = validated.status;

    // สร้างแผนการสอน
    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        schoolId,
        academicYear: validated.academicYear,
        fiscalYear: validated.fiscalYear,
        title: validated.title,
        description: validated.description || null,
        teacherName: validated.teacherName,
        teacherId: validated.teacherId ? BigInt(validated.teacherId) : null,
        subject: validated.subject || null,
        grade: validated.grade || null,
        planDate: validated.planDate ? new Date(validated.planDate) : null,
        submittedAt: validated.submittedAt ? new Date(validated.submittedAt) : null,
        reflection: validated.reflection || null,
        status,
        createdBy: BigInt(user.id),
      },
    });

    // Log action
    await logAction(
      BigInt(user.id),
      'CREATE_LESSON_PLAN',
      'lessonplan',
      lessonPlan.id,
      schoolId,
      { title: validated.title }
    );

    revalidatePath('/lesson-plans');
    return { success: true, data: { id: lessonPlan.id.toString() } };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error creating lesson plan:', error);
    return { success: false, error: 'ไม่สามารถสร้างแผนการสอนได้' };
  }
}

/**
 * อัปเดตแผนการสอน
 */
export async function updateLessonPlan(formData: FormData) {
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
      subject: formData.get('subject') as string | null,
      grade: formData.get('grade') as string | null,
      planDate: formData.get('planDate') as string | null,
      submittedAt: formData.get('submittedAt') as string | null,
      reflection: formData.get('reflection') as string | null,
      status: formData.get('status') as string | null,
    };

    const validated = updateLessonPlanSchema.parse(raw);

    const existing = await prisma.lessonPlan.findUnique({
      where: { id: BigInt(validated.id) },
      select: { schoolId: true },
    });

    if (!existing) {
      return { success: false, error: 'ไม่พบแผนการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    const updateData: LessonPlanUpdateData = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.teacherName) updateData.teacherName = validated.teacherName;
    if (validated.subject !== undefined) updateData.subject = validated.subject;
    if (validated.grade !== undefined) updateData.grade = validated.grade;
    if (validated.planDate) updateData.planDate = new Date(validated.planDate);
    if (validated.submittedAt) updateData.submittedAt = new Date(validated.submittedAt);
    if (validated.reflection !== undefined) updateData.reflection = validated.reflection;
    if (validated.status) updateData.status = validated.status;
    updateData.updatedBy = BigInt(user.id);

    const updated = await prisma.lessonPlan.update({
      where: { id: BigInt(validated.id) },
      data: updateData,
    });

    await logAction(
      BigInt(user.id),
      'UPDATE_LESSON_PLAN',
      'lessonplan',
      updated.id,
      existing.schoolId
    );

    revalidatePath('/lesson-plans');
    revalidatePath(`/lesson-plans/${validated.id}`);
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error updating lesson plan:', error);
    return { success: false, error: 'ไม่สามารถอัปเดตแผนการสอนได้' };
  }
}

/**
 * ดึงข้อมูลแผนการสอน
 */
export async function getLessonPlanById(id: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: BigInt(id), del: false },
      include: {
        school: {
          select: { sc_id: true, name: true },
        },
        files: {
          where: { del: false },
          orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
        },
      },
    });

    if (!lessonPlan) {
      return { success: false, error: 'ไม่พบแผนการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), lessonPlan.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    return { success: true, data: lessonPlan };
  } catch (error) {
    console.error('Error fetching lesson plan:', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลแผนการสอนได้' };
  }
}

/**
 * ดึงรายการแผนการสอน
 */
export async function getLessonPlanList(options: {
  schoolId?: string;
  academicYear?: number;
  status?: string;
}) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;
  const roles = user.roles ?? [];
  const accessibleSchoolIds = new Set<string>(roles.map((role) => role.schoolId));

  try {
    const where: Prisma.LessonPlanWhereInput = {
      del: false,
    };

    if (options.schoolId) {
      if (!accessibleSchoolIds.has(options.schoolId)) {
        return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' };
      }
      where.schoolId = BigInt(options.schoolId);
    } else {
      where.schoolId = { in: Array.from(accessibleSchoolIds).map((id) => BigInt(id)) };
    }

    if (options.academicYear) {
      where.academicYear = options.academicYear;
    }

    if (options.status) {
      if (!isLessonPlanStatus(options.status)) {
        return { success: false, error: 'สถานะไม่ถูกต้อง' };
      }
      where.status = options.status;
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        school: {
          select: { sc_id: true, name: true },
        },
        files: {
          where: { del: false },
          orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: lessonPlans };
  } catch (error) {
    console.error('Error fetching lesson plan list:', error);
    return { success: false, error: 'ไม่สามารถดึงรายการแผนการสอนได้' };
  }
}

/**
 * เพิ่มไฟล์ให้แผนการสอน
 */
export async function addLessonPlanFile(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const raw = {
      lessonPlanId: formData.get('lessonPlanId') as string,
      fileName: formData.get('fileName') as string | null,
      storageType: formData.get('storageType') as string,
      storagePath: formData.get('storagePath') as string | null,
      driveFileId: formData.get('driveFileId') as string | null,
      externalUrl: formData.get('externalUrl') as string | null,
      fileType: formData.get('fileType') as string,
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

    const validated = lessonPlanFileSchema.parse(raw);

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: BigInt(raw.lessonPlanId) },
      select: { schoolId: true },
    });

    if (!lessonPlan) {
      return { success: false, error: 'ไม่พบแผนการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), lessonPlan.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    // ถ้า set เป็น primary ให้ reset ไฟล์อื่น
    if (validated.isPrimary) {
      await prisma.lessonPlanFile.updateMany({
        where: {
          lessonPlanId: BigInt(raw.lessonPlanId),
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const storageType: EvidenceStorageType = validated.storageType;
    const fileType: LessonPlanFileType = validated.fileType;
    const mimeTypeValue = formData.get('mimeType');
    const mimeType = typeof mimeTypeValue === 'string' ? mimeTypeValue : null;
    const fileSizeValue = formData.get('fileSize');
    const parsedFileSize =
      typeof fileSizeValue === 'string' && fileSizeValue.trim().length > 0
        ? Number.parseInt(fileSizeValue, 10)
        : null;
    const fileSize = parsedFileSize !== null && Number.isNaN(parsedFileSize) ? null : parsedFileSize;

    const file = await prisma.lessonPlanFile.create({
      data: {
        lessonPlanId: BigInt(raw.lessonPlanId),
        schoolId: lessonPlan.schoolId,
        fileName: validated.fileName,
        mimeType,
        fileSize,
        storageType,
        storagePath: validated.storagePath || null,
        driveFileId: validated.driveFileId || null,
        externalUrl: validated.externalUrl || null,
        fileType,
        description: validated.description || null,
        isPrimary: validated.isPrimary,
        uploadedBy: BigInt(user.id),
      },
    });

    await logAction(
      BigInt(user.id),
      'UPLOAD_LESSON_PLAN_FILE',
      'lessonplanfile',
      file.id,
      lessonPlan.schoolId
    );

    revalidatePath(`/lesson-plans/${raw.lessonPlanId}`);
    return { success: true, data: file };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error adding lesson plan file:', error);
    return { success: false, error: 'ไม่สามารถเพิ่มไฟล์ได้' };
  }
}

/**
 * ลบแผนการสอน
 */
export async function deleteLessonPlan(id: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const existing = await prisma.lessonPlan.findUnique({
      where: { id: BigInt(id) },
      select: { schoolId: true },
    });

    if (!existing) {
      return { success: false, error: 'ไม่พบแผนการสอน' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' };
    }

    await prisma.lessonPlan.update({
      where: { id: BigInt(id) },
      data: { del: true, updatedBy: BigInt(user.id) },
    });

    await logAction(
      BigInt(user.id),
      'DELETE_LESSON_PLAN',
      'lessonplan',
      BigInt(id),
      existing.schoolId
    );

    revalidatePath('/lesson-plans');
    return { success: true };
  } catch (error) {
    console.error('Error deleting lesson plan:', error);
    return { success: false, error: 'ไม่สามารถลบแผนการสอนได้' };
  }
}

/**
 * อัปเดตไฟล์แผนการสอน
 */
export async function updateLessonPlanFile(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  const user = session.user;

  try {
    const hasIsPrimary = formData.has('isPrimary');
    const isPrimaryValue = formData.get('isPrimary') === 'on';

    const raw = {
      lessonPlanId: formData.get('lessonPlanId') as string,
      fileId: formData.get('fileId') as string,
      fileName: (formData.get('fileName') as string) || undefined,
      storagePath: (formData.get('storagePath') as string) || undefined,
      externalUrl: (formData.get('externalUrl') as string) || undefined,
      isPrimary: hasIsPrimary ? isPrimaryValue : undefined,
      description: (formData.get('description') as string) || undefined,
    };

    const data = updateLessonPlanFileSchema.parse(raw);

    const existing = await prisma.lessonPlanFile.findUnique({
      where: { id: BigInt(data.fileId) },
      include: {
        lessonPlan: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!existing || existing.del || existing.lessonPlanId.toString() !== data.lessonPlanId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(user.id), existing.lessonPlan.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    // ถ้า set เป็น primary ให้ reset ไฟล์อื่น
    if (data.isPrimary === true) {
      await prisma.lessonPlanFile.updateMany({
        where: {
          lessonPlanId: BigInt(data.lessonPlanId),
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    await prisma.lessonPlanFile.update({
      where: { id: BigInt(data.fileId) },
      data: {
        ...(data.fileName && { fileName: data.fileName }),
        ...(data.storagePath !== undefined && { storagePath: data.storagePath || null }),
        ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl || null }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
    });

    revalidatePath(`/lesson-plans/${data.lessonPlanId}/files`);
    revalidatePath(`/lesson-plans/${data.lessonPlanId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('Error updating lesson plan file:', error);
    return { success: false, error: 'ไม่สามารถอัปเดตไฟล์ได้' };
  }
}

/**
 * ตั้งเป็นไฟล์หลัก
 */
export async function setPrimaryLessonPlanFile(lessonPlanId: string, fileId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  try {
    const lpId = BigInt(lessonPlanId);
    const fId = BigInt(fileId);

    const target = await prisma.lessonPlanFile.findUnique({
      where: { id: fId },
      include: {
        lessonPlan: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!target || target.del || target.lessonPlanId !== lpId) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.lessonPlan.schoolId);
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
      prisma.lessonPlanFile.updateMany({
        where: { lessonPlanId: lpId },
        data: { isPrimary: false },
      }),
      prisma.lessonPlanFile.update({
        where: { id: fId },
        data: { isPrimary: true },
      }),
    ]);

    revalidatePath(`/lesson-plans/${lessonPlanId}/files`);
    revalidatePath(`/lesson-plans/${lessonPlanId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ตั้งไฟล์หลักไม่สำเร็จ';
    return { success: false, error: message };
  }
}

/**
 * ลบไฟล์แผนการสอน
 */
export async function deleteLessonPlanFile(lessonPlanId: string, fileId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }

  try {
    const target = await prisma.lessonPlanFile.findUnique({
      where: { id: BigInt(fileId) },
      include: {
        lessonPlan: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!target || target.lessonPlanId.toString() !== lessonPlanId || target.del) {
      return { success: false, error: 'ไม่พบไฟล์' };
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), target.lessonPlan.schoolId);
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์จัดการไฟล์นี้' };
    }

    await prisma.lessonPlanFile.update({
      where: { id: target.id },
      data: { del: true },
    });

    revalidatePath(`/lesson-plans/${lessonPlanId}/files`);
    revalidatePath(`/lesson-plans/${lessonPlanId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ลบไฟล์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

