import { z } from 'zod';

/**
 * Zod primitives ที่ใช้ร่วมกันใน API route handlers
 * เป้าหมาย: input ที่ผิดรูปต้องได้ 400 พร้อมข้อความ ไม่ใช่ 500 จาก `BigInt(undefined)` throw
 */

/** id แบบ BigInt ที่ส่งมาเป็น string (รับ number ด้วยเผื่อ client ส่งเป็นตัวเลข) */
export const bigIntIdSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+$/.test(v), { message: 'รหัสต้องเป็นตัวเลขจำนวนเต็มบวก' })
  .transform((v) => BigInt(v));

/** ปี พ.ศ. (ปีงบประมาณ / ปีการศึกษา) */
export const thaiYearSchema = z.coerce
  .number()
  .int()
  .min(2500, { message: 'ปีต้องเป็น พ.ศ.' })
  .max(2700, { message: 'ปีต้องเป็น พ.ศ.' });

/** วันที่แบบ string ที่ parse ได้จริง */
export const dateStringSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'รูปแบบวันที่ไม่ถูกต้อง' })
  .transform((v) => new Date(v));

export const semesterSchema = z.coerce.number().int().min(1).max(3);

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** อ่าน JSON body แล้ว validate — คืน error message ภาษาไทยแทนการ throw */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON)' };
  }
  return parseUnknown(schema, raw);
}

/** validate ค่าที่ประกอบเองแล้ว (เช่นจาก searchParams หรือ FormData) */
export function parseUnknown<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): ParseResult<z.infer<T>> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join('.');
    return {
      success: false,
      error: path ? `${path}: ${first.message}` : (first?.message ?? 'ข้อมูลไม่ถูกต้อง'),
    };
  }
  return { success: true, data: parsed.data };
}

/** อ่าน query string ตาม schema */
export function parseSearchParams<T extends z.ZodTypeAny>(
  url: string,
  schema: T
): ParseResult<z.infer<T>> {
  const params = new URL(url).searchParams;
  return parseUnknown(schema, Object.fromEntries(params.entries()));
}
