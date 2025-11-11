import { z } from 'zod';

export const createEvidenceSchema = z.object({
  schoolId: z.string().transform((val) => BigInt(val)),
  indicatorId: z.string().transform((val) => BigInt(val)),
  fiscalYear: z.number().int().positive(),
  title: z.string().min(1, 'กรุณาระบุชื่อหลักฐาน').max(255),
  description: z.string().optional(),
  ownerUserId: z.string().transform((val) => BigInt(val)).optional(),
  status: z.enum(['MISSING', 'PENDING', 'READY', 'APPROVED', 'REJECTED']).default('PENDING'),
  privacyLevel: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).default('INTERNAL'),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;

export const updateEvidenceSchema = z.object({
  id: z.string().transform((val) => BigInt(val)),
  title: z.string().min(1, 'กรุณาระบุชื่อหลักฐาน').max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['MISSING', 'PENDING', 'READY', 'APPROVED', 'REJECTED']).optional(),
  privacyLevel: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).optional(),
  ownerUserId: z.string().transform((val) => BigInt(val)).optional(),
});

export const evidenceFileSchema = z.object({
  evidenceId: z.string().transform((val) => BigInt(val)),
  fileName: z.string().min(1, 'กรุณาระบุชื่อไฟล์'),
  storageType: z.enum(['YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK']),
  storagePath: z.string().optional(),
  driveFileId: z.string().optional(),
  externalUrl: z.string().url('URL ไม่ถูกต้อง').optional(),
  isPrimary: z.coerce.boolean().optional(),
  note: z.string().optional(),
});

export const updateEvidenceFileSchema = z.object({
  evidenceId: z.string().transform((val) => BigInt(val)),
  fileId: z.string().transform((val) => BigInt(val)),
  fileName: z.string().min(1, 'กรุณาระบุชื่อไฟล์').optional(),
  storagePath: z.string().optional(),
  driveFileId: z.string().optional(),
  externalUrl: z.string().url('URL ไม่ถูกต้อง').optional(),
  isPrimary: z.coerce.boolean().optional(),
  note: z.string().optional(),
});

export const createReviewSchema = z.object({
  evidenceId: z.string().transform((val) => BigInt(val)),
  evidenceFileId: z
    .string()
    .trim()
    .transform((val) => (val ? BigInt(val) : undefined))
    .optional(),
  reviewStatus: z.enum(['NEED_MORE', 'ACCEPTED', 'REJECTED']),
  score: z
    .union([z.coerce.number().min(0).max(100), z.nan()])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  comment: z.string().optional(),
});

export const updateReviewSchema = createReviewSchema.extend({
  reviewId: z.string().transform((val) => BigInt(val)),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

