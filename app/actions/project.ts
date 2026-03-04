'use server';

import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { thaiAcademicYear, thaiFiscalYear } from '@/lib/evidence';
import { createProjectSchema } from '@/lib/validations/project';
import type { ProjectStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * รายการโครงการ (ตาม school, ปีการศึกษา ที่ user มีสิทธิ์)
 */
export async function getProjectList(params: {
  schoolId?: string;
  academicYear?: number;
  fiscalYear?: number;
  status?: string;
}) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ', data: null };
  }

  const { getUserSchools } = await import('@/lib/auth/scoping');
  const schoolIds = await getUserSchools(session.user.id);
  if (schoolIds.length === 0) {
    return { success: true, data: [] };
  }

  const academicYear = params.academicYear ?? thaiAcademicYear();
  const where: {
    schoolId: { in: bigint[] };
    academicYear?: number;
    fiscalYear?: number;
    status?: ProjectStatus;
    del: boolean;
  } = {
    schoolId: { in: schoolIds },
    del: false,
  };
  if (params.schoolId && schoolIds.includes(BigInt(params.schoolId))) {
    where.schoolId = { in: [BigInt(params.schoolId)] };
  }
  where.academicYear = academicYear;
  if (params.fiscalYear) where.fiscalYear = params.fiscalYear;
  if (params.status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(params.status)) {
    where.status = params.status as ProjectStatus;
  }

  const list = await prisma.project.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      school: { select: { sc_id: true, name: true } },
      responsibleUser: { select: { id: true, fullName: true, email: true } },
      obePolicy: { select: { id: true, code: true, nameTh: true } },
      qaIndicator: { select: { id: true, code: true, nameTh: true, standard: { select: { code: true } } } },
      paIndicator: { select: { id: true, code: true, nameTh: true } },
      files: {
        where: { del: false },
        select: { id: true, fileType: true, fileName: true, uploadedAt: true, signedAt: true },
      },
    },
  });

  return {
    success: true,
    data: list.map((p) => ({
      id: p.id.toString(),
      code: p.code,
      academicYear: p.academicYear,
      fiscalYear: p.fiscalYear,
      title: p.title,
      description: p.description,
      status: p.status,
      schoolId: p.schoolId.toString(),
      schoolName: p.school.name,
      responsibleUserId: p.responsibleUserId?.toString() ?? null,
      responsibleUserName: p.responsibleUser?.fullName ?? null,
      obePolicyId: p.obePolicyId?.toString() ?? null,
      obePolicyName: p.obePolicy ? `${p.obePolicy.code} ${p.obePolicy.nameTh}` : null,
      qaIndicatorId: p.qaIndicatorId?.toString() ?? null,
      qaIndicatorName: p.qaIndicator ? `${p.qaIndicator.standard?.code ?? ''}-${p.qaIndicator.code} ${p.qaIndicator.nameTh}` : null,
      paIndicatorId: p.paIndicatorId?.toString() ?? null,
      paIndicatorName: p.paIndicator ? `${p.paIndicator.code} ${p.paIndicator.nameTh}` : null,
      files: p.files,
    })),
  };
}

/**
 * สร้างโครงการใหม่
 */
export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ', data: null };
  }

  try {
    const raw = {
      schoolId: formData.get('schoolId') as string,
      code: (formData.get('code') as string)?.trim() || '',
      academicYear: formData.get('academicYear') || thaiAcademicYear().toString(),
      fiscalYear: formData.get('fiscalYear') || thaiFiscalYear().toString(),
      responsibleUserId: (formData.get('responsibleUserId') as string) || null,
      obePolicyId: (formData.get('obePolicyId') as string) || null,
      qaIndicatorId: (formData.get('qaIndicatorId') as string) || null,
      paIndicatorId: (formData.get('paIndicatorId') as string) || null,
      title: (formData.get('title') as string)?.trim() || '',
      description: (formData.get('description') as string) || null,
      status: (formData.get('status') as string) || 'DRAFT',
    };
    const validated = createProjectSchema.parse(raw);

    const hasAccess = await canAccessSchool(BigInt(session.user.id), BigInt(validated.schoolId));
    if (!hasAccess) {
      return { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงโรงเรียนนี้', data: null };
    }

    const project = await prisma.project.create({
      data: {
        schoolId: BigInt(validated.schoolId),
        code: validated.code,
        academicYear: validated.academicYear,
        fiscalYear: validated.fiscalYear,
        responsibleUserId: validated.responsibleUserId ? BigInt(validated.responsibleUserId) : null,
        obePolicyId: validated.obePolicyId ? BigInt(validated.obePolicyId) : null,
        qaIndicatorId: validated.qaIndicatorId ? BigInt(validated.qaIndicatorId) : null,
        paIndicatorId: validated.paIndicatorId ? BigInt(validated.paIndicatorId) : null,
        title: validated.title,
        description: validated.description ?? null,
        status: validated.status as ProjectStatus,
        createdBy: BigInt(session.user.id),
        updatedBy: BigInt(session.user.id),
      },
    });

    revalidatePath('/projects');
    revalidatePath('/extra-programs');
    return { success: true, data: { id: project.id.toString() }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกโครงการ';
    return { success: false, error: message, data: null };
  }
}

/**
 * ดึงโครงการตาม id (สำหรับหน้ารายละเอียด)
 */
export async function getProjectById(projectId: string) {
  const session = await auth();
  if (!session) return null;

  const id = BigInt(projectId);
  const project = await prisma.project.findFirst({
    where: { id, del: false },
    include: {
      school: { select: { sc_id: true, name: true } },
      responsibleUser: { select: { id: true, fullName: true, email: true } },
      obePolicy: { select: { id: true, code: true, nameTh: true, fiscalYear: true } },
      qaIndicator: { select: { id: true, code: true, nameTh: true, standard: { select: { code: true, nameTh: true } } } },
      paIndicator: { select: { id: true, code: true, nameTh: true } },
      files: {
        where: { del: false },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });

  if (!project) return null;
  const hasAccess = await canAccessSchool(BigInt(session.user.id), project.schoolId);
  if (!hasAccess) return null;

  return {
    id: project.id.toString(),
    code: project.code,
    academicYear: project.academicYear,
    fiscalYear: project.fiscalYear,
    title: project.title,
    description: project.description,
    status: project.status,
    schoolId: project.schoolId.toString(),
    schoolName: project.school.name,
    responsibleUserId: project.responsibleUserId?.toString() ?? null,
    responsibleUserName: project.responsibleUser?.fullName ?? null,
    obePolicyId: project.obePolicyId?.toString() ?? null,
    obePolicyName: project.obePolicy ? `${project.obePolicy.code} ${project.obePolicy.nameTh}` : null,
    qaIndicatorId: project.qaIndicatorId?.toString() ?? null,
    qaIndicatorName: project.qaIndicator ? `${project.qaIndicator.standard?.code ?? ''}-${project.qaIndicator.code} ${project.qaIndicator.nameTh}` : null,
    paIndicatorId: project.paIndicatorId?.toString() ?? null,
    paIndicatorName: project.paIndicator ? `${project.paIndicator.code} ${project.paIndicator.nameTh}` : null,
    files: project.files.map((f) => ({
      id: f.id.toString(),
      fileType: f.fileType,
      fileName: f.fileName,
      storagePath: f.storagePath,
      externalUrl: f.externalUrl,
      signedAt: f.signedAt?.toISOString() ?? null,
      signedBy: f.signedBy?.toString() ?? null,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
  };
}
