import { z } from 'zod';

export const externalEvaluationSchema = z.object({
  id: z.string().optional(),
  evidenceId: z.string().min(1),
  evaluatorName: z.string().min(1, 'กรุณาระบุชื่อผู้ประเมิน'),
  evaluatorOrg: z.string().optional(),
  evaluationDate: z.coerce.date().optional(),
  score: z
    .union([
      z.coerce.number().min(0).max(5),
      z.literal('').transform(() => undefined),
    ])
    .optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  recommendations: z.string().optional(),
  attachmentUrl: z
    .union([z.string().min(1), z.literal('')])
    .optional()
    .transform((val) => {
      if (val === '' || val === undefined) return undefined;
      return val;
    }),
  externalAssessmentId: z.string().optional(),
});

export type ExternalEvaluationInput = z.infer<typeof externalEvaluationSchema>;

