import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getUploadBaseDir } from '@/lib/uploads-path';
import { z } from 'zod';
import { bigIntIdSchema, parseUnknown } from '@/lib/validations/api';

const projectFileFormSchema = z.object({
  fileType: z.enum(['PROJECT_REPORT', 'EXECUTION_SUMMARY']).default('PROJECT_REPORT'),
  signed: z.boolean().default(false),
});

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

function isPdf(name: string, type: string): boolean {
  if (type && type.toLowerCase() === 'application/pdf') return true;
  return name.toLowerCase().endsWith('.pdf');
}

/**
 * POST /api/projects/[id]/files
 * อัปโหลดไฟล์ PDF: รายงานโครงการ (PROJECT_REPORT) หรือ สรุปการดำเนินโครงการ (EXECUTION_SUMMARY)
 * รองรับลายเซ็นอิเล็กทรอนิกส์: ส่ง signed=1 จะบันทึก signedAt และ signedBy เป็นผู้ใช้นั้น
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const parsedId = parseUnknown(bigIntIdSchema, id);
    if (!parsedId.success) {
      return NextResponse.json({ success: false, error: parsedId.error }, { status: 400 });
    }
    const projectId = parsedId.data;
    const userId = BigInt(session.user.id);

    const project = await prisma.project.findFirst({
      where: { id: projectId, del: false },
      select: { schoolId: true },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: 'ไม่พบโครงการ' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(userId, project.schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์อัปโหลดไฟล์' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถอ่านข้อมูลไฟล์ได้' },
        { status: 400 }
      );
    }

    const parsedForm = parseUnknown(projectFileFormSchema, {
      fileType:
        formData.get('fileType') === 'EXECUTION_SUMMARY' ? 'EXECUTION_SUMMARY' : 'PROJECT_REPORT',
      signed: formData.get('signed') === '1' || formData.get('signed') === 'true',
    });
    if (!parsedForm.success) {
      return NextResponse.json({ success: false, error: parsedForm.error }, { status: 400 });
    }
    const { fileType, signed } = parsedForm.data;

    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File) || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกไฟล์ PDF' },
        { status: 400 }
      );
    }

    if (!isPdf(file.name, file.type)) {
      return NextResponse.json(
        { success: false, error: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ขนาดไฟล์ไม่เกิน 10 MB' },
        { status: 400 }
      );
    }

    const baseDir = getUploadBaseDir();
    const projectDir = path.join(baseDir, 'projects', id);
    await mkdir(projectDir, { recursive: true });

    const safeName = `${fileType}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(projectDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const storagePath = `/uploads/projects/${id}/${safeName}`;

    await prisma.projectFile.create({
      data: {
        projectId,
        schoolId: project.schoolId,
        fileType,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size,
        storagePath,
        signedAt: signed ? new Date() : null,
        signedBy: signed ? userId : null,
        uploadedBy: userId,
      },
    });

    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');

    return NextResponse.json({
      success: true,
      message: 'อัปโหลดไฟล์เรียบร้อย',
    });
  } catch (err) {
    console.error('[api/projects/files]', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' },
      { status: 500 }
    );
  }
}
