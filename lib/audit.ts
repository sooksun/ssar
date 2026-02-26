import type { Prisma } from '@prisma/client';
import { prisma } from './db';

export const AUDIT_ACTIONS = {
  CREATE_EVIDENCE: 'CREATE_EVIDENCE',
  UPDATE_EVIDENCE_STATUS: 'UPDATE_EVIDENCE_STATUS',
  UPLOAD_FILE: 'UPLOAD_FILE',
  CREATE_REVIEW: 'CREATE_REVIEW',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_LEVEL: 'CREATE_LEVEL',
  UPDATE_LEVEL: 'UPDATE_LEVEL',
  DELETE_LEVEL: 'DELETE_LEVEL',
  CREATE_STANDARD: 'CREATE_STANDARD',
  UPDATE_STANDARD: 'UPDATE_STANDARD',
  DELETE_STANDARD: 'DELETE_STANDARD',
  CREATE_INDICATOR: 'CREATE_INDICATOR',
  UPDATE_INDICATOR: 'UPDATE_INDICATOR',
  DELETE_INDICATOR: 'DELETE_INDICATOR',
  CREATE_SUB_INDICATOR: 'CREATE_SUB_INDICATOR',
  UPDATE_SUB_INDICATOR: 'UPDATE_SUB_INDICATOR',
  DELETE_SUB_INDICATOR: 'DELETE_SUB_INDICATOR',
  CREATE_ROLE: 'CREATE_ROLE',
  UPDATE_ROLE: 'UPDATE_ROLE',
  DELETE_ROLE: 'DELETE_ROLE',
  CREATE_SCHOOL: 'CREATE_SCHOOL',
  UPDATE_SCHOOL: 'UPDATE_SCHOOL',
  DELETE_SCHOOL: 'DELETE_SCHOOL',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  ASSIGN_USER_ROLE: 'ASSIGN_USER_ROLE',
  REMOVE_USER_ROLE: 'REMOVE_USER_ROLE',
  CREATE_TEACHING_MEDIA: 'CREATE_TEACHING_MEDIA',
  UPDATE_TEACHING_MEDIA: 'UPDATE_TEACHING_MEDIA',
  DELETE_TEACHING_MEDIA: 'DELETE_TEACHING_MEDIA',
  UPLOAD_TEACHING_MEDIA_FILE: 'UPLOAD_TEACHING_MEDIA_FILE',
  CREATE_LESSON_PLAN: 'CREATE_LESSON_PLAN',
  UPDATE_LESSON_PLAN: 'UPDATE_LESSON_PLAN',
  DELETE_LESSON_PLAN: 'DELETE_LESSON_PLAN',
  UPLOAD_LESSON_PLAN_FILE: 'UPLOAD_LESSON_PLAN_FILE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type BigIntLike = bigint | number | string | null | undefined;

function normalizeBigInt(value: BigIntLike): bigint | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(value);
  }
  const trimmed = value.toString().trim();
  if (!trimmed) {
    return undefined;
  }
  return BigInt(trimmed);
}

export async function logAction(
  actorId: BigIntLike,
  action: AuditAction | string,
  targetTable: string,
  targetId?: BigIntLike,
  schoolId?: BigIntLike,
  payload?: Record<string, unknown> | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: normalizeBigInt(actorId),
        action,
        targetTable,
        targetId: normalizeBigInt(targetId),
        schoolId: normalizeBigInt(schoolId),
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    console.error('[audit] บันทึกเหตุการณ์ไม่สำเร็จ:', error);
  }
}


