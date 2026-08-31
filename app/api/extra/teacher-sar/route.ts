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

const sarQuerySchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  forUserId: bigIntIdSchema.optional(),
});

const sarFormSchema = z.object({
  schoolId: bigIntIdSchema,
  academicYear: thaiYearSchema,
  storageType: z.string().max(20).default('URL'),
  storagePath: z.string().max(2000).optional(),
  forUserId: bigIntIdSchema.optional(),
});


export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const query = parseSearchParams(request.url, sarQuerySchema);
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
        const targetId = BigInt(forUserIdParam);
        const inSchool = await isUserInSchool(targetId, schoolIdBigInt);
        if (inSchool) userId = targetId;
      }
    }

    const doc = await prisma.teacherSarDocument.findUnique({
      where: {
        schoolId_academicYear_userId: { schoolId: schoolIdBigInt, academicYear: year, userId },
      },
    });

    return NextResponse.json({ success: true, data: serializeForJson(doc) });
  } catch (e: unknown) {
    console.error('[api/extra/teacher-sar] GET error:', e);
    const err = e as { message?: string; code?: string };
    const message = err?.message ?? 'ไม่สามารถโหลดข้อมูลได้';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    const parsed = parseUnknown(sarFormSchema, {
      schoolId: formData.get('schoolId'),
      academicYear: formData.get('academicYear'),
      storageType: ((formData.get('storageType') as string) || 'URL').trim(),
      storagePath: (formData.get('storagePath') as string)?.trim() || undefined,
      forUserId: (formData.get('forUserId') as string)?.trim() || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const { storageType, storagePath } = parsed.data;
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
      const doc = await prisma.teacherSarDocument.upsert({
        where: {
          schoolId_academicYear_userId: { schoolId, academicYear: year, userId },
        },
        create: {
          schoolId,
          userId,
          academicYear: year,
          fileName: 'SAR ครู (ลิงก์)',
          storageType: 'GDRIVE',
          storagePath,
          externalUrl: storagePath,
          uploadedBy,
        },
        update: {
          fileName: 'SAR ครู (ลิงก์)',
          storageType: 'GDRIVE',
          storagePath,
          externalUrl: storagePath,
          uploadedBy,
        },
      });
      revalidatePath('/extra-programs/teacher');
      revalidatePath('/extra-programs');
      return NextResponse.json({ success: true, data: serializeForJson(doc) });
    }

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
      'teacher-sar',
      schoolId.toString(),
      year.toString(),
      userId.toString()
    );
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (dirErr: unknown) {
      const msg = dirErr instanceof Error ? dirErr.message : String(dirErr);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถสร้างโฟลเดอร์ได้: ${msg}` },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const safeName = `SAR-${timestamp}-${file.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, safeName);
    const arrayBuffer = await file.arrayBuffer();
    try {
      await writeFile(filePath, Buffer.from(arrayBuffer));
    } catch (writeErr: unknown) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถเขียนไฟล์ได้: ${msg}` },
        { status: 500 }
      );
    }

    const urlPath = `/uploads/teacher-sar/${schoolId.toString()}/${year}/${userId.toString()}/${safeName}`;
    const doc = await prisma.teacherSarDocument.upsert({
      where: {
        schoolId_academicYear_userId: { schoolId, academicYear: year, userId },
      },
      create: {
        schoolId,
        userId,
        academicYear: year,
        fileName: file.name,
        storageType: 'URL',
        storagePath: urlPath,
        externalUrl: urlPath,
        fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
        mimeType: file.type || null,
        uploadedBy,
      },
      update: {
        fileName: file.name,
        storageType: 'URL',
        storagePath: urlPath,
        externalUrl: urlPath,
        fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
        mimeType: file.type || null,
        uploadedBy,
      },
    });

    revalidatePath('/extra-programs/teacher');
    revalidatePath('/extra-programs');
    return NextResponse.json({ success: true, data: serializeForJson(doc) });
  } catch (e: unknown) {
    console.error('[api/extra/teacher-sar] POST error:', e);
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message ?? 'ไม่สามารถอัปโหลดได้' },
      { status: 500 }
    );
  }
}
