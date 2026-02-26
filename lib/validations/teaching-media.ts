import { z } from 'zod';

export const createTeachingMediaSchema = z.object({
  schoolId: z.string().min(1, 'กรุณาเลือกโรงเรียน'),
  indicatorId: z.string().min(1, 'กรุณาเลือกตัวชี้วัด'),
  academicYear: z.coerce.number().int().positive(),
  fiscalYear: z.coerce.number().int().positive(),
  title: z.string().min(1, 'กรุณากรอกชื่อสื่อ'),
  description: z.string().optional().nullable(),
  teacherName: z.string().min(1, 'กรุณากรอกชื่อครูผู้ผลิตสื่อ'),
  teacherId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).default('DRAFT'),
});

export const updateTeachingMediaSchema = createTeachingMediaSchema.partial().extend({
  id: z.string().min(1),
});

export const teachingMediaFileSchema = z
  .object({
    fileName: z.string().min(1, 'กรุณากรอกชื่อไฟล์'),
    mimeType: z.string().optional().nullable(),
    fileSize: z.number().int().positive().optional().nullable(),
    storageType: z.enum(['YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK']).default('URL'),
    storagePath: z.string().optional().nullable(),
    driveFileId: z.string().optional().nullable(),
    externalUrl: z.string().optional().nullable(),
    thumbnailUrl: z.string().optional().nullable(),
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

export const updateTeachingMediaFileSchema = z.object({
  teachingMediaId: z.string().min(1),
  fileId: z.string().min(1),
  fileName: z.string().min(1).optional(),
  storagePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  isPrimary: z.boolean().optional(),
  description: z.string().optional(),
});

export type CreateTeachingMediaInput = z.infer<typeof createTeachingMediaSchema>;
export type UpdateTeachingMediaInput = z.infer<typeof updateTeachingMediaSchema>;
export type TeachingMediaFileInput = z.infer<typeof teachingMediaFileSchema>;
export type UpdateTeachingMediaFileInput = z.infer<typeof updateTeachingMediaFileSchema>;

