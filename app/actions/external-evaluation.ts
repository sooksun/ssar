'use server';

import { auth } from '@/lib/auth/nextauth';
import { prisma } from '@/lib/db';
import { externalEvaluationSchema } from '@/lib/validations/external-evaluation';
import { revalidatePath } from 'next/cache';
import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

const ATTACHMENT_BASE_DIR = path.join(process.cwd(), 'public', 'uploads', 'external-evaluations');
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

async function saveAttachmentFile(options: {
  evidenceId: bigint;
  file: File;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const { evidenceId, file } = options;
  if (!file || file.size === 0) {
    return { success: false, error: 'ไม่พบไฟล์แนบ' };
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { success: false, error: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB' };
  }
  const mime = file.type?.toLowerCase() || '';
  const originalName = file.name || 'attachment.pdf';
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const isPdf =
    mime === 'application/pdf' ||
    ext === '.pdf';
  if (!isPdf) {
    return { success: false, error: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' };
  }

  const evidenceFolder = evidenceId.toString();
  const targetDir = path.join(ATTACHMENT_BASE_DIR, evidenceFolder);
  await mkdir(targetDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const absolutePath = path.join(targetDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const publicUrl = `/uploads/external-evaluations/${evidenceFolder}/${fileName}`;
  return { success: true, url: publicUrl };
}

async function deleteAttachmentFile(publicUrl?: string | null) {
  if (!publicUrl) return;
  const relativePath = publicUrl.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  try {
    await unlink(absolutePath);
  } catch {
    /* ignore missing file */
  }
}

function parseExternalEvaluationForm(formData: FormData) {
  return {
    id: (formData.get('id') as string) || undefined,
    evidenceId: formData.get('evidenceId') as string,
    evaluatorName: ((formData.get('evaluatorName') as string) || '').trim(),
    evaluatorOrg: (formData.get('evaluatorOrg') as string) || undefined,
    evaluationDate: formData.get('evaluationDate') as string,
    score: formData.get('score') as string,
    strengths: (formData.get('strengths') as string) || undefined,
    weaknesses: (formData.get('weaknesses') as string) || undefined,
    recommendations: (formData.get('recommendations') as string) || undefined,
    attachmentUrl: (formData.get('attachmentUrl') as string) || undefined,
    externalAssessmentId: (formData.get('externalAssessmentId') as string) || undefined,
  };
}

export async function listExternalEvaluations(evidenceId: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }
  const evId = BigInt(evidenceId);

  try {
    const items = await prisma.externalEvaluation.findMany({
      where: { evidenceId: evId },
      orderBy: { evaluationDate: 'desc' },
    });

    return {
      success: true,
      data: items.map((item) => ({
        ...item,
        id: item.id.toString(),
        evidenceId: item.evidenceId.toString(),
        schoolId: item.schoolId.toString(),
        externalAssessmentId: item.externalAssessmentId
          ? item.externalAssessmentId.toString()
          : undefined,
      })),
    };
  } catch (error) {
    console.error('List external evaluation error', error);
    return { success: false, error: 'ไม่สามารถดึงข้อมูลการประเมินภายในได้' };
  }
}

export async function createExternalEvaluation(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }
  const user = session.user;
  const roles = user.roles ?? [];

  try {
    const parsed = externalEvaluationSchema.parse(parseExternalEvaluationForm(formData));
    const attachmentFile = formData.get('attachmentFile');
    const evidence = await prisma.evidence.findUnique({
      where: { id: BigInt(parsed.evidenceId) },
      select: { id: true, schoolId: true },
    });
    if (!evidence) {
      return { success: false, error: 'ไม่พบหลักฐาน' };
    }
    const hasAccess = roles.some((role) => role.schoolId === evidence.schoolId.toString());
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์บันทึกการประเมินภายใน' };
    }

    const evaluationDate = parsed.evaluationDate
      ? new Date(parsed.evaluationDate)
      : new Date();
    const scoreValue = typeof parsed.score === 'number' ? parsed.score : undefined;
    let attachmentUrl: string | undefined = undefined;

    if (attachmentFile instanceof File && attachmentFile.size > 0) {
      const saved = await saveAttachmentFile({
        evidenceId: evidence.id,
        file: attachmentFile,
      });
      if (!saved.success) {
        return { success: false, error: saved.error || 'ไม่สามารถบันทึกไฟล์ข้อเสนอแนะได้' };
      }
      attachmentUrl = saved.url;
    }
    const evaluationCount = await prisma.externalEvaluation.count({
      where: { evidenceId: evidence.id },
    });
    if (evaluationCount >= 3) {
      return {
        success: false,
        error: 'หลักฐานนี้มีการประเมินภายในครบ 3 รายการแล้ว',
      };
    }

    const duplicateEvaluator = await prisma.externalEvaluation.findFirst({
      where: {
        evidenceId: evidence.id,
        evaluatorName: parsed.evaluatorName,
      },
    });
    if (duplicateEvaluator) {
      return {
        success: false,
        error: 'ผู้ประเมินคนนี้ได้ประเมินหลักฐานนี้แล้ว',
      };
    }

    await prisma.externalEvaluation.create({
      data: {
        evidenceId: evidence.id,
        schoolId: evidence.schoolId,
        externalAssessmentId: parsed.externalAssessmentId
          ? BigInt(parsed.externalAssessmentId)
          : undefined,
        evaluatorName: parsed.evaluatorName,
        evaluatorOrg: parsed.evaluatorOrg,
        evaluationDate,
        score: scoreValue,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendations: parsed.recommendations,
        attachmentUrl,
        createdBy: BigInt(user.id),
      },
    });

    revalidatePath(`/evidence/${parsed.evidenceId}`);
    return { success: true };
  } catch (error) {
    console.error('Create external evaluation error', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง' };
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return {
        success: false,
        error: 'ผู้ประเมินคนนี้ได้ประเมินหลักฐานนี้แล้ว',
      };
    }
    const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการประเมินภายในได้';
    return { success: false, error: message };
  }
}

export async function updateExternalEvaluation(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }
  const user = session.user;
  const roles = user.roles ?? [];

  try {
    const parsed = externalEvaluationSchema.parse(parseExternalEvaluationForm(formData));
    const attachmentFile = formData.get('attachmentFile');
    if (!parsed.id) {
      return { success: false, error: 'ไม่พบรหัสการประเมิน' };
    }

    const existing = await prisma.externalEvaluation.findUnique({
      where: { id: BigInt(parsed.id) },
      select: { id: true, evidenceId: true, schoolId: true, attachmentUrl: true },
    });
    if (!existing) {
      return { success: false, error: 'ไม่พบการประเมินภายใน' };
    }
    const hasAccess = roles.some((role) => role.schoolId === existing.schoolId.toString());
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์แก้ไขการประเมินภายใน' };
    }

    const evaluationDate = parsed.evaluationDate
      ? new Date(parsed.evaluationDate)
      : new Date();
    const scoreValue = typeof parsed.score === 'number' ? parsed.score : undefined;
    let attachmentUrl = existing.attachmentUrl;

    if (attachmentFile instanceof File && attachmentFile.size > 0) {
      const saved = await saveAttachmentFile({
        evidenceId: existing.evidenceId,
        file: attachmentFile,
      });
      if (!saved.success || !saved.url) {
        return { success: false, error: saved.error || 'ไม่สามารถบันทึกไฟล์ข้อเสนอแนะได้' };
      }
      await deleteAttachmentFile(existing.attachmentUrl);
      attachmentUrl = saved.url;
    }

    await prisma.externalEvaluation.update({
      where: { id: BigInt(parsed.id) },
      data: {
        evaluatorName: parsed.evaluatorName,
        evaluatorOrg: parsed.evaluatorOrg,
        evaluationDate,
        score: scoreValue,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendations: parsed.recommendations,
        attachmentUrl: attachmentUrl ?? undefined,
        externalAssessmentId: parsed.externalAssessmentId
          ? BigInt(parsed.externalAssessmentId)
          : null,
      },
    });

    revalidatePath(`/evidence/${existing.evidenceId.toString()}`);
    return { success: true };
  } catch (error) {
    console.error('Update external evaluation error', error);
    if (error instanceof ZodError) {
      return { success: false, error: error.errors?.[0]?.message || 'ข้อมูลไม่ถูกต้อง' };
    }
    const message = error instanceof Error ? error.message : 'ไม่สามารถแก้ไขการประเมินภายในได้';
    return { success: false, error: message };
  }
}

export async function deleteExternalEvaluation(id: string) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
  }
  const user = session.user;
  const roles = user.roles ?? [];

  try {
    const existing = await prisma.externalEvaluation.findUnique({
      where: { id: BigInt(id) },
      select: { evidenceId: true, schoolId: true, attachmentUrl: true },
    });
    if (!existing) {
      return { success: false, error: 'ไม่พบการประเมินภายใน' };
    }
    const hasAccess = roles.some((role) => role.schoolId === existing.schoolId.toString());
    if (!hasAccess) {
      return { success: false, error: 'ไม่มีสิทธิ์ลบการประเมินภายใน' };
    }

    await prisma.externalEvaluation.delete({ where: { id: BigInt(id) } });
    await deleteAttachmentFile(existing.attachmentUrl);
    revalidatePath(`/evidence/${existing.evidenceId.toString()}`);
    return { success: true };
  } catch (error) {
    console.error('Delete external evaluation error', error);
    const message = error instanceof Error ? error.message : 'ไม่สามารถลบการประเมินภายในได้';
    return { success: false, error: message };
  }
}

