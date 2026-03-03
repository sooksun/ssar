import { z } from 'zod';

export const createLessonPlanSchema = z.object({
  schoolId: z.string().min(1, 'กรุณาเลือกโรงเรียน'),
  code: z.string().optional().nullable(), // รหัสแผนการสอน
  academicYear: z.coerce.number().int().positive(),
  fiscalYear: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().min(1).max(2).optional().nullable(), // ภาคเรียนที่ 1 หรือ 2
  title: z.string().min(1, 'กรุณากรอกชื่อแผน'),
  planType: z.string().optional().nullable(), // แผนรายวิชา, แผนบูรณาการ
  grade: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  teacherName: z.string().min(1, 'กรุณากรอกชื่อครูผู้สอน'),
  teacherId: z.string().optional().nullable(),
  planDate: z.string().optional().nullable(),
  submittedAt: z.string().optional().nullable(),
  reflection: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED']).default('DRAFT'),
});

export const updateLessonPlanSchema = createLessonPlanSchema.partial().extend({
  id: z.string().min(1),
});

export const lessonPlanFileSchema = z
  .object({
    fileName: z.string().min(1, 'กรุณากรอกชื่อไฟล์'),
    mimeType: z.string().optional().nullable(),
    fileSize: z.number().int().positive().optional().nullable(),
    storageType: z.enum(['YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK']).default('URL'),
    storagePath: z.string().optional().nullable(),
    driveFileId: z.string().optional().nullable(),
    externalUrl: z.string().optional().nullable(),
    fileType: z.enum(['PLAN', 'REFLECTION', 'OTHER']).default('PLAN'),
    description: z.string().optional().nullable(),
    isPrimary: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // สำหรับ YOUTUBE, GDRIVE, CANVA ต้องมี storagePath
      if (['YOUTUBE', 'GDRIVE', 'CANVA'].includes(data.storageType)) {
        return data.storagePath && data.storagePath.trim().length > 0;
      }
      // สำหรับ LINK ต้องมี externalUrl
      if (data.storageType === 'LINK') {
        return data.externalUrl && data.externalUrl.trim().length > 0;
      }
      return true;
    },
    {
      message: 'กรุณาระบุลิงก์',
      path: ['storagePath'],
    }
  )
  .refine(
    (data) => {
      // สำหรับ LINK ต้องมี externalUrl ที่เป็น URL ที่ถูกต้อง
      if (data.storageType === 'LINK' && data.externalUrl) {
        try {
          new URL(data.externalUrl);
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },
    {
      message: 'กรุณาระบุลิงก์ที่ถูกต้อง',
      path: ['externalUrl'],
    }
  );

export const updateLessonPlanFileSchema = z.object({
  lessonPlanId: z.string().min(1),
  fileId: z.string().min(1),
  fileName: z.string().min(1).optional(),
  storagePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  isPrimary: z.boolean().optional(),
  description: z.string().optional(),
});

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>;
export type LessonPlanFileInput = z.infer<typeof lessonPlanFileSchema>;
export type UpdateLessonPlanFileInput = z.infer<typeof updateLessonPlanFileSchema>;

