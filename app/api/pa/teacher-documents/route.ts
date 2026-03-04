import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { isAllowedFileType, describeAllowedFileTypes } from '@/lib/file-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DOC_TYPES = ['PA1', 'PA2', 'PA3'] as const;
type DocType = (typeof DOC_TYPES)[number];

function isDocType(s: string): s is DocType {
  return DOC_TYPES.includes(s as DocType);
}

/** GET: ดึงรายการ PA 1/ส, PA 2/ส, PA 3/ส ตามโรงเรียนและปีการศึกษา */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const academicYear = searchParams.get('academicYear');

    if (!schoolId || !academicYear) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ schoolId และ academicYear' },
        { status: 400 }
      );
    }

    const schoolIdBigInt = BigInt(schoolId);
    const year = parseInt(academicYear, 10);
    if (Number.isNaN(year)) {
      return NextResponse.json({ success: false, error: 'ปีการศึกษาไม่ถูกต้อง' }, { status: 400 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolIdBigInt);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const userId = BigInt(session.user.id);

    const docs = await prisma.pATeacherDocument.findMany({
      where: { schoolId: schoolIdBigInt, academicYear: year, userId },
      orderBy: { documentType: 'asc' },
    });

    const byType: Record<DocType, (typeof docs)[0] | null> = {
      PA1: docs.find((d) => d.documentType === 'PA1') ?? null,
      PA2: docs.find((d) => d.documentType === 'PA2') ?? null,
      PA3: docs.find((d) => d.documentType === 'PA3') ?? null,
    };

    return NextResponse.json({ success: true, data: byType });
  } catch (e) {
    console.error('[api/pa/teacher-documents] GET error:', e);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถโหลดข้อมูลได้' },
      { status: 500 }
    );
  }
}

/** POST: อัปโหลดหรือแทนที่ไฟล์ PA 1/ส, PA 2/ส หรือ PA 3/ส */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const schoolIdRaw = formData.get('schoolId') as string;
    const academicYearRaw = formData.get('academicYear') as string;
    const documentType = (formData.get('documentType') as string)?.trim();
    const storageType = ((formData.get('storageType') as string) || 'URL').trim();
    const storagePath = (formData.get('storagePath') as string)?.trim();
    const fileName = (formData.get('fileName') as string)?.trim();

    if (!schoolIdRaw || !academicYearRaw || !documentType || !isDocType(documentType)) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ schoolId, academicYear และ documentType (PA1, PA2 หรือ PA3)' },
        { status: 400 }
      );
    }

    const schoolId = BigInt(schoolIdRaw);
    const year = parseInt(academicYearRaw, 10);
    if (Number.isNaN(year)) {
      return NextResponse.json({ success: false, error: 'ปีการศึกษาไม่ถูกต้อง' }, { status: 400 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
    }

    const userId = BigInt(session.user.id);

    if (storageType === 'GDRIVE') {
      if (!storagePath) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุลิงก์ Google Drive' },
          { status: 400 }
        );
      }
      const doc = await prisma.pATeacherDocument.upsert({
        where: {
          schoolId_academicYear_documentType_userId: {
            schoolId,
            academicYear: year,
            documentType,
            userId,
          },
        },
        create: {
          schoolId,
          userId,
          academicYear: year,
          documentType,
          fileName: fileName || 'ลิงก์ Google Drive',
          storageType: 'GDRIVE',
          storagePath,
          externalUrl: storagePath,
          uploadedBy: userId,
        },
        update: {
          fileName: fileName || 'ลิงก์ Google Drive',
          storageType: 'GDRIVE',
          storagePath,
          externalUrl: storagePath,
          uploadedBy: userId,
        },
      });
      revalidatePath('/pa');
      return NextResponse.json({ success: true, data: doc });
    }

    // URL = อัปโหลดไฟล์
    const files = formData.getAll('files') as File[];
    const file = files[0];
    if (!file || !(file instanceof File) || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกไฟล์แนบ (หรือระบุลิงก์ Google Drive)' },
        { status: 400 }
      );
    }

    if (!isAllowedFileType(file.name, file.type)) {
      return NextResponse.json(
        { success: false, error: `ประเภทไฟล์ต้องเป็น ${describeAllowedFileTypes()}` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'pa-teacher-docs',
      schoolId.toString(),
      year.toString(),
      userId.toString()
    );
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${documentType}-${timestamp}-${file.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, safeName);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const urlPath = `/uploads/pa-teacher-docs/${schoolId.toString()}/${year}/${userId.toString()}/${safeName}`;
    const finalFileName = fileName || file.name;

    const doc = await prisma.pATeacherDocument.upsert({
      where: {
        schoolId_academicYear_documentType_userId: {
          schoolId,
          academicYear: year,
          documentType,
          userId,
        },
      },
      create: {
        schoolId,
        userId,
        academicYear: year,
        documentType,
        fileName: finalFileName,
        storageType: 'URL',
        storagePath: urlPath,
        externalUrl: urlPath,
        fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
        mimeType: file.type || null,
        uploadedBy: userId,
      },
      update: {
        fileName: finalFileName,
        storageType: 'URL',
        storagePath: urlPath,
        externalUrl: urlPath,
        fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
        mimeType: file.type || null,
        uploadedBy: userId,
      },
    });

    revalidatePath('/pa');
    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    console.error('[api/pa/teacher-documents] POST error:', e);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถอัปโหลดได้' },
      { status: 500 }
    );
  }
}
