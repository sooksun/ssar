import { z } from 'zod';

const bigIntString = z
  .string()
  .min(1, 'ต้องระบุค่า')
  .transform((value) => {
    try {
      return BigInt(value);
    } catch {
      throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
    }
  });

const intString = z
  .string()
  .min(1, 'ต้องระบุค่า')
  .transform((value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      throw new Error('ค่าต้องเป็นตัวเลข');
    }
    return parsed;
  });

export const createLevelSchema = z.object({
  code: z.string().min(1, 'กรุณาระบุรหัส').max(50),
  nameTh: z.string().min(1, 'กรุณาระบุชื่อ (ภาษาไทย)').max(255),
});

export const updateLevelSchema = createLevelSchema.extend({
  id: intString,
});

export const createStandardSchema = z.object({
  levelId: intString,
  code: z.string().min(1, 'กรุณาระบุรหัส').max(50),
  nameTh: z.string().min(1, 'กรุณาระบุชื่อ (ภาษาไทย)').max(255),
  sortNo: z.coerce.number().int().positive().optional(),
});

export const updateStandardSchema = createStandardSchema.extend({
  id: bigIntString,
});

export const createIndicatorSchema = z.object({
  standardId: bigIntString,
  code: z.string().min(1, 'กรุณาระบุรหัส').max(50),
  nameTh: z.string().min(1, 'กรุณาระบุชื่อ (ภาษาไทย)').max(255),
  sortNo: z.coerce.number().int().positive().optional(),
  descriptionTh: z.string().optional(),
});

export const updateIndicatorSchema = createIndicatorSchema.extend({
  id: bigIntString,
});

export const createSubIndicatorSchema = z.object({
  indicatorId: bigIntString,
  itemNo: z.coerce.number().int().positive(),
  textTh: z.string().min(1, 'กรุณาระบุข้อความ (ภาษาไทย)'),
});

export const updateSubIndicatorSchema = createSubIndicatorSchema.extend({
  id: bigIntString,
});

export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type CreateStandardInput = z.infer<typeof createStandardSchema>;
export type UpdateStandardInput = z.infer<typeof updateStandardSchema>;
export type CreateIndicatorInput = z.infer<typeof createIndicatorSchema>;
export type UpdateIndicatorInput = z.infer<typeof updateIndicatorSchema>;
export type CreateSubIndicatorInput = z.infer<typeof createSubIndicatorSchema>;
export type UpdateSubIndicatorInput = z.infer<typeof updateSubIndicatorSchema>;


