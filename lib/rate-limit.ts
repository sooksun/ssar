/**
 * Rate limiter แบบ fixed-window เก็บ state ใน memory ของ process
 *
 * ข้อจำกัดที่ต้องรู้: state อยู่ใน process เดียว — ถ้าสเกลเป็นหลาย instance
 * แต่ละ instance จะนับแยกกัน (limit จริง = limit x จำนวน instance)
 * ปัจจุบัน deploy เป็น container เดียว (docker-compose.yml) จึงเพียงพอ
 * ถ้าเพิ่ม replica เมื่อไร ให้ย้าย backend ไป Redis
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** ล้าง bucket ที่หมดอายุ เพื่อไม่ให้ Map โตไม่จำกัด */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** วินาทีที่ต้องรอก่อนลองใหม่ (สำหรับ Retry-After) */
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** เฉพาะการทดสอบ — ล้าง state ทั้งหมด */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}

/**
 * ระบุตัวตนผู้เรียกจาก header ของ reverse proxy
 * NPM/nginx ส่ง x-forwarded-for มาให้ — ใช้ IP แรก (client จริง)
 */
export function clientKeyFrom(headers: Headers, prefix: string): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown';
  return `${prefix}:${ip}`;
}
