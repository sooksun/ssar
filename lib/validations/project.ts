import { z } from 'zod';

const projectStatusSet = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

export const createProjectSchema = z.object({
  schoolId: z.string().min(1, 'กรุณาเลือกโรงเรียน'),
  code: z.string().min(1, 'กรุณาระบุรหัสโครงการ'),
  academicYear: z.coerce.number().int().min(2560).max(2580),
  fiscalYear: z.coerce.number().int().min(2560).max(2580),
  responsibleUserId: z.string().optional().nullable(),
  obePolicyId: z.string().optional().nullable(),
  qaIndicatorId: z.string().optional().nullable(),
  paIndicatorId: z.string().optional().nullable(),
  title: z.string().min(1, 'กรุณาระบุชื่อโครงการ'),
  description: z.string().optional().nullable(),
  status: z.enum(projectStatusSet).default('DRAFT'),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
