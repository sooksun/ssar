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

const optionalBigIntString = z
  .string()
  .transform((value) => {
    if (!value) {
      return undefined;
    }
    try {
      return BigInt(value);
    } catch {
      throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
    }
  })
  .optional();

export const createRoleSchema = z.object({
  code: z.string().min(1, 'กรุณาระบุรหัส').max(50),
  name: z.string().min(1, 'กรุณาระบุชื่อบทบาท').max(255),
});

export const updateRoleSchema = createRoleSchema.extend({
  id: bigIntString,
});

export const createSchoolSchema = z.object({
  scId: z
    .string()
    .min(1, 'กรุณาระบุรหัสโรงเรียน')
    .transform((value) => {
      try {
        return BigInt(value);
      } catch {
        throw new Error('รหัสโรงเรียนไม่ถูกต้อง');
      }
    }),
  name: z.string().min(1, 'กรุณาระบุชื่อโรงเรียน').max(255),
  areaName: z.string().optional(),
  province: z.string().optional(),
  levelType: z.string().optional(),
});

export const updateSchoolSchema = createSchoolSchema.extend({
  id: bigIntString,
});

export const createUserSchema = z.object({
  fullName: z.string().min(1, 'กรุณาระบุชื่อเต็ม').max(255),
  email: z.string().email('อีเมลไม่ถูกต้อง').max(255),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  phone: z.string().optional(),
  primarySchoolId: optionalBigIntString,
  assignedSchoolId: optionalBigIntString,
  roleId: optionalBigIntString,
});

export const updateUserSchema = z.object({
  id: bigIntString,
  fullName: z.string().min(1, 'กรุณาระบุชื่อเต็ม').max(255),
  phone: z.string().optional(),
  primarySchoolId: optionalBigIntString,
  newPassword: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional(),
});

export const assignUserRoleSchema = z.object({
  userId: bigIntString,
  schoolId: bigIntString,
  roleId: bigIntString,
});

export const removeUserRoleSchema = z.object({
  userSchoolRoleId: bigIntString,
});

export const deleteEntitySchema = z.object({
  id: bigIntString,
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignUserRoleInput = z.infer<typeof assignUserRoleSchema>;

