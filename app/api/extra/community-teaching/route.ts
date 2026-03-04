import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool, canManageTeacherPaInSchool, isUserInSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { isAllowedFileType, describeAllowedFileTypes } from '@/lib/file-types';

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

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');

    if (!schoolId || !academicYear || !semester) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ schoolId, academicYear และ semester' },
        { status: 400 }
      );
    }

    const schoolIdBigInt = BigInt(schoolId);
    const year = parseInt(academicYear, 10);
    const sem = parseInt(semester, 10);
    if (Number.isNaN(year) || (sem !== 1 && sem !== 2)) {
      return NextResponse.json({ success: false, error: 'ปีการศึกษาหรือภาคเรียนไม่ถูกต้อง' }, { status: 400 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolIdBigInt);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    const forUserIdParam = searchParams.get('forUserId');
    if (forUserIdParam) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolIdBigInt);
      if (canManage) {
        const targetId = BigInt(forUserIdParam);
        const inSchool = await isUserInSchool(targetId, schoolIdBigInt);
        if (inSchool) userId = targetId;
      }
    }

    const record = await prisma.communityTeachingRecord.findUnique({
      where: {
        schoolId_academicYear_semester_userId: {
          schoolId: schoolIdBigInt,
          academicYear: year,
          semester: sem,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true, data: serializeForJson(record) });
  } catch (e: unknown) {
    console.error('[api/extra/community-teaching] GET error:', e);
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message ?? 'ไม่สามารถโหลดข้อมูลได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let body: Record<string, unknown> = {};
    let formData: FormData | null = null;

    if (isMultipart) {
      formData = await request.formData();
      body = {
        schoolId: formData.get('schoolId') as string,
        academicYear: formData.get('academicYear') as string,
        semester: formData.get('semester') as string,
        forUserId: (formData.get('forUserId') as string)?.trim() || undefined,
        title: (formData.get('title') as string)?.trim() || undefined,
        activityDate: (formData.get('activityDate') as string)?.trim() || undefined,
        location: (formData.get('location') as string)?.trim() || undefined,
        summary: (formData.get('summary') as string)?.trim() || undefined,
      };
    } else {
      body = await request.json();
    }

    const schoolId = BigInt(body.schoolId as string);
    const year = typeof body.academicYear === 'number'
      ? body.academicYear
      : parseInt(String(body.academicYear), 10);
    const semester = typeof body.semester === 'number'
      ? body.semester
      : parseInt(String(body.semester), 10);

    if (Number.isNaN(year) || (semester !== 1 && semester !== 2)) {
      return NextResponse.json({ success: false, error: 'ปีการศึกษาหรือภาคเรียนไม่ถูกต้อง' }, { status: 400 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
    }

    let userId = BigInt(session.user.id);
    const forUserIdRaw = (body.forUserId as string)?.trim();
    if (forUserIdRaw) {
      const canManage = await canManageTeacherPaInSchool(BigInt(session.user.id), schoolId);
      if (canManage) {
        const targetId = BigInt(forUserIdRaw);
        const inSchool = await isUserInSchool(targetId, schoolId);
        if (inSchool) userId = targetId;
      }
    }

    const uploadedBy = BigInt(session.user.id);
    const title = (body.title as string)?.trim() || null;
    const activityDateStr = (body.activityDate as string)?.trim();
    const activityDate = activityDateStr ? new Date(activityDateStr) : null;
    const location = (body.location as string)?.trim() || null;
    const summary = (body.summary as string)?.trim() || null;
    const templateData = body.templateData != null ? body.templateData : null;

    // ถ้าส่งไฟล์มา (multipart)
    if (formData) {
      const storagePath = (formData.get('storagePath') as string)?.trim();
      const storageType = ((formData.get('storageType') as string) || 'URL').trim();

      if (storageType === 'GDRIVE' && storagePath) {
        const doc = await prisma.communityTeachingRecord.upsert({
          where: {
            schoolId_academicYear_semester_userId: { schoolId, academicYear: year, semester, userId },
          },
          create: {
            schoolId,
            userId,
            academicYear: year,
            semester,
            title,
            activityDate,
            location,
            summary,
            templateData: templateData ?? undefined,
            fileName: 'บันทึกการสอนชุมชน (ลิงก์)',
            storageType: 'GDRIVE',
            storagePath,
            externalUrl: storagePath,
            uploadedBy,
          },
          update: {
            title,
            activityDate,
            location,
            summary,
            templateData: templateData ?? undefined,
            fileName: 'บันทึกการสอนชุมชน (ลิงก์)',
            storageType: 'GDRIVE',
            storagePath,
            externalUrl: storagePath,
            uploadedBy,
          },
        });
        revalidatePath('/extra-programs/community-teaching');
        revalidatePath('/extra-programs');
        return NextResponse.json({ success: true, data: serializeForJson(doc) });
      }

      const files = formData.getAll('files') as File[];
      const file = files[0];
      if (file && file instanceof File && typeof file.arrayBuffer === 'function') {
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
          'community-teaching',
          schoolId.toString(),
          year.toString(),
          semester.toString(),
          userId.toString()
        );
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch (dirErr: unknown) {
          const msg = dirErr instanceof Error ? dirErr.message : String(dirErr);
          return NextResponse.json({ success: false, error: `ไม่สามารถสร้างโฟลเดอร์ได้: ${msg}` }, { status: 500 });
        }
        const timestamp = Date.now();
        const safeName = `record-${timestamp}-${file.name}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(uploadDir, safeName);
        const arrayBuffer = await file.arrayBuffer();
        try {
          await writeFile(filePath, Buffer.from(arrayBuffer));
        } catch (writeErr: unknown) {
          const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
          return NextResponse.json({ success: false, error: `ไม่สามารถเขียนไฟล์ได้: ${msg}` }, { status: 500 });
        }
        const urlPath = `/uploads/community-teaching/${schoolId.toString()}/${year}/${semester}/${userId.toString()}/${safeName}`;
        const doc = await prisma.communityTeachingRecord.upsert({
          where: {
            schoolId_academicYear_semester_userId: { schoolId, academicYear: year, semester, userId },
          },
          create: {
            schoolId,
            userId,
            academicYear: year,
            semester,
            title,
            activityDate,
            location,
            summary,
            templateData: templateData ?? undefined,
            fileName: file.name,
            storageType: 'URL',
            storagePath: urlPath,
            externalUrl: urlPath,
            fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
            mimeType: file.type || null,
            uploadedBy,
          },
          update: {
            title,
            activityDate,
            location,
            summary,
            templateData: templateData ?? undefined,
            fileName: file.name,
            storageType: 'URL',
            storagePath: urlPath,
            externalUrl: urlPath,
            fileSize: typeof file.size === 'number' ? Math.round(file.size) : null,
            mimeType: file.type || null,
            uploadedBy,
          },
        });
        revalidatePath('/extra-programs/community-teaching');
        revalidatePath('/extra-programs');
        return NextResponse.json({ success: true, data: serializeForJson(doc) });
      }
    }

    // บันทึกเฉพาะข้อมูล (ไม่มีไฟล์)
    const doc = await prisma.communityTeachingRecord.upsert({
      where: {
        schoolId_academicYear_semester_userId: { schoolId, academicYear: year, semester, userId },
      },
      create: {
        schoolId,
        userId,
        academicYear: year,
        semester,
        title,
        activityDate,
        location,
        summary,
        templateData: templateData ?? undefined,
        fileName: null,
        storageType: 'URL',
        uploadedBy,
      },
      update: {
        title,
        activityDate,
        location,
        summary,
        templateData: templateData ?? undefined,
        uploadedBy,
      },
    });
    revalidatePath('/extra-programs/community-teaching');
    revalidatePath('/extra-programs');
    return NextResponse.json({ success: true, data: serializeForJson(doc) });
  } catch (e: unknown) {
    console.error('[api/extra/community-teaching] POST error:', e);
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message ?? 'ไม่สามารถบันทึกได้' },
      { status: 500 }
    );
  }
}
