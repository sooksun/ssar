import { cache } from 'react';

import { prisma } from '@/lib/db';
import { canAccessSchool } from '@/lib/auth/scoping';

/**
 * แปลง path ของไฟล์อัปโหลด → schoolId เจ้าของไฟล์ เพื่อใช้ตรวจสิทธิ์ก่อนเสิร์ฟไฟล์
 *
 * โครงสร้าง path ที่ระบบเขียนไว้ (ดู route/action ที่อัปโหลด):
 *   evidence/<evidenceId>/{images,videos,files}/<file>
 *   external-evaluations/<evidenceId>/<file>
 *   lesson-plans/<lessonPlanId>/{images,videos,files}/<file>
 *   teaching-media/<mediaId>/{images,videos,files}/<file>
 *   projects/<projectId>/<file>
 *   community-teaching/<schoolId>/<year>/<semester>/<userId>/<file>
 *   pa-teacher-docs/<schoolId>/<year>/<userId>/<file>
 *   teacher-sar/<schoolId>/<year>/<userId>/<file>
 */

function parseId(value: string | undefined): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

const evidenceSchool = cache(async (id: bigint) => {
  const row = await prisma.evidence.findUnique({ where: { id }, select: { schoolId: true } });
  return row?.schoolId ?? null;
});

const lessonPlanSchool = cache(async (id: bigint) => {
  const row = await prisma.lessonPlan.findUnique({ where: { id }, select: { schoolId: true } });
  return row?.schoolId ?? null;
});

const teachingMediaSchool = cache(async (id: bigint) => {
  const row = await prisma.teachingMedia.findUnique({ where: { id }, select: { schoolId: true } });
  return row?.schoolId ?? null;
});

const projectSchool = cache(async (id: bigint) => {
  const row = await prisma.project.findUnique({ where: { id }, select: { schoolId: true } });
  return row?.schoolId ?? null;
});

/**
 * คืน schoolId เจ้าของไฟล์ หรือ null ถ้า path ไม่ตรงรูปแบบที่รู้จัก / ไม่พบเจ้าของ
 * null = ปฏิเสธการเข้าถึง (fail closed) — ห้ามตีความว่า "ไม่มีเจ้าของ จึงเปิดให้ทุกคน"
 */
export async function resolveUploadSchoolId(segments: string[]): Promise<bigint | null> {
  const [category, second] = segments;
  if (!category || !second) return null;

  switch (category) {
    case 'evidence':
    case 'external-evaluations': {
      const id = parseId(second);
      return id === null ? null : evidenceSchool(id);
    }
    case 'lesson-plans': {
      const id = parseId(second);
      return id === null ? null : lessonPlanSchool(id);
    }
    case 'teaching-media': {
      const id = parseId(second);
      return id === null ? null : teachingMediaSchool(id);
    }
    case 'projects': {
      const id = parseId(second);
      return id === null ? null : projectSchool(id);
    }
    // กลุ่มที่ฝัง schoolId ไว้ใน path อยู่แล้ว
    case 'community-teaching':
    case 'pa-teacher-docs':
    case 'teacher-sar':
      return parseId(second);
    default:
      return null;
  }
}

/**
 * ตรวจสิทธิ์เข้าถึงไฟล์อัปโหลดตาม path — fail closed ทุกกรณีที่ระบุเจ้าของไม่ได้
 */
export async function canAccessUploadPath(
  userId: bigint,
  segments: string[]
): Promise<boolean> {
  const schoolId = await resolveUploadSchoolId(segments);
  if (schoolId === null) return false;
  return canAccessSchool(userId, schoolId);
}
