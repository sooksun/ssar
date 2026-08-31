import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool, canManageTeacherPaInSchool, isUserInSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { bigIntIdSchema, parseSearchParams, parseUnknown, thaiYearSchema } from '@/lib/validations/api';
import { getUploadBaseDir } from '@/lib/uploads-path';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { isAllowedFileType, describeAllowedFileTypes } from '@/lib/file-types';

const docQuerySchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  forUserId: bigIntIdSchema.optional(),
});

const docFormSchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  documentType: z.string().min(1).max(50),
  storageType: z.string().max(20).default('URL'),
  storagePath: z.string().max(2000).optional(),
  fileName: z.string().max(500).optional(),
  forUserId: bigIntIdSchema.optional(),
});


export const runtime = 'nodejs';
export const maxDuration = 60;

const DOC_TYPES = ['PA1', 'PA2', 'PA3'] as const;
type DocType = (typeof DOC_TYPES)[number];

function isDocType(s: string): s is DocType {
  return DOC_TYPES.includes(s as DocType);
}

/** แปลง BigInt เป็น string เพื่อให้ JSON.stringify ไม่ error */
function serializeForJson<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return String(obj) as T;
  if (Array.isArray(obj)) return obj.map(serializeForJson) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeForJson(v);
    }
    return out as T;
  }
  return obj;
}

/** GET: ดึงรายการ PA 1/ส, PA 2/ส, PA 3/ส ตามโรงเรียนและปีการศึกษา */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const query = parseSearchParams(request.url, docQuerySchema);
    if (!query.success) {
      return NextResponse.json({ success: false, error: query.error }, { status: 400 });
    }
    const schoolIdBigInt = query.data.schoolId;
    const year = query.data.academicYear;

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolIdBigInt);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    const forUserIdParam = query.data.forUserId;
    if (forUserIdParam) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolIdBigInt);
      if (canManage) {
        const targetId = forUserIdParam;
        const inSchool = await isUserInSchool(targetId, schoolIdBigInt);
        if (inSchool) userId = targetId;
      }
    }

    const docs = await prisma.pATeacherDocument.findMany({
      where: { schoolId: schoolIdBigInt, academicYear: year, userId },
      orderBy: { documentType: 'asc' },
    });

    const byType: Record<DocType, (typeof docs)[0] | null> = {
      PA1: docs.find((d) => d.documentType === 'PA1') ?? null,
      PA2: docs.find((d) => d.documentType === 'PA2') ?? null,
      PA3: docs.find((d) => d.documentType === 'PA3') ?? null,
    };

    return NextResponse.json({ success: true, data: serializeForJson(byType) });
  } catch (e: unknown) {
    console.error('[api/pa/teacher-documents] GET error:', e);
    const err = e as { message?: string; code?: string };
    let message = 'ไม่สามารถโหลดข้อมูลได้';
    if (err?.message?.includes('userId') || err?.message?.includes('pateacherdocument') || err?.code === 'P2021') {
      message = 'ฐานข้อมูล: ตารางหรือคอลัมน์ userId ไม่ครบ — รัน docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql';
    } else if (err?.message) {
      message = err.message;
    }
    return NextResponse.json(
      { success: false, error: message },
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
    const parsed = parseUnknown(docFormSchema, {
      schoolId: formData.get('schoolId'),
      academicYear: formData.get('academicYear'),
      documentType: (formData.get('documentType') as string)?.trim(),
      storageType: ((formData.get('storageType') as string) || 'URL').trim(),
      storagePath: (formData.get('storagePath') as string)?.trim() || undefined,
      fileName: (formData.get('fileName') as string)?.trim() || undefined,
      forUserId: (formData.get('forUserId') as string)?.trim() || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const { documentType, storageType, storagePath, fileName } = parsed.data;
    if (!isDocType(documentType)) {
      return NextResponse.json(
        { success: false, error: 'documentType ต้องเป็น PA1, PA2 หรือ PA3' },
        { status: 400 }
      );
    }
    const forUserIdRaw = parsed.data.forUserId;
    const schoolId = parsed.data.schoolId;
    const year = parsed.data.academicYear;

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    if (forUserIdRaw) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolId);
      if (canManage) {
        const targetId = forUserIdRaw;
        const inSchool = await isUserInSchool(targetId, schoolId);
        if (inSchool) userId = targetId;
      }
    }

    const uploadedBy = BigInt(session.user.id);

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
          uploadedBy,
        },
        update: {
          fileName: fileName || 'ลิงก์ Google Drive',
          storageType: 'GDRIVE',
          storagePath,
          externalUrl: storagePath,
          uploadedBy,
        },
      });
      revalidatePath('/pa');
      return NextResponse.json({ success: true, data: serializeForJson(doc) });
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
      getUploadBaseDir(),
      'pa-teacher-docs',
      schoolId.toString(),
      year.toString(),
      userId.toString()
    );
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (dirErr: unknown) {
      const msg = dirErr instanceof Error ? dirErr.message : String(dirErr);
      console.error('[api/pa/teacher-documents] mkdir error:', dirErr);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถสร้างโฟลเดอร์ได้: ${msg}. ตรวจสอบสิทธิ์ public/uploads` },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const safeName = `${documentType}-${timestamp}-${file.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, safeName);
    const arrayBuffer = await file.arrayBuffer();
    try {
      await writeFile(filePath, Buffer.from(arrayBuffer));
    } catch (writeErr: unknown) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      console.error('[api/pa/teacher-documents] writeFile error:', writeErr);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถเขียนไฟล์ได้: ${msg}. ตรวจสอบสิทธิ์โฟลเดอร์` },
        { status: 500 }
      );
    }

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
        uploadedBy,
      },
      update: {
        fileName: finalFileName,
        storageType: 'URL',
        storagePath: urlPath,
        externalUrl: urlPath,
        fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
        mimeType: file.type || null,
        uploadedBy,
      },
    });

    revalidatePath('/pa');
    return NextResponse.json({ success: true, data: serializeForJson(doc) });
  } catch (e: unknown) {
    console.error('[api/pa/teacher-documents] POST error:', e);
    const err = e as { message?: string; code?: string };
    let message = 'ไม่สามารถอัปโหลดได้';
    if (err?.message) {
      if (err.message.includes('userId') || err.message.includes('pateacherdocument') || (err as { code?: string }).code === 'P2021') {
        message = 'ฐานข้อมูล: ตารางหรือคอลัมน์ userId ไม่ครบ — รัน docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql บนเซิร์ฟเวอร์';
      } else {
        message = err.message;
      }
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
