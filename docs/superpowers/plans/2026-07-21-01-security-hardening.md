# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปิดช่องโหว่ที่เปิดอยู่จริง 3 จุด — ไฟล์หลักฐานที่ใครก็ดึงได้, หน้า admin/setup ที่พึ่ง middleware อย่างเดียว, และ CVE ระดับ critical ใน Next.js

**Architecture:** แยกตรรกะ authorization ของไฟล์อัปโหลดออกมาเป็นโมดูล pure ที่ unit test ได้ (`lib/uploads-authz.ts`) แล้วให้ route handler เรียกใช้ ส่วนหน้า admin/setup ใช้ Route Group layout เป็นด่านเดียวแทนการแก้ 8 หน้า (DRY) และอัป Next.js เป็น patch ล่าสุดของ 15.5.x ซึ่งปิด CVE โดยไม่มี breaking change

**Tech Stack:** Next.js 15.5 App Router (Route Handlers, `next/navigation`), Prisma 6.19, Node `fs.createReadStream` + `stream.Readable.toWeb`, Vitest 2.1

## Global Constraints

- ต้องรันแผน `2026-07-21-05-infra-test-hygiene.md` ให้จบก่อน — แผนนี้ใช้ baseline `vitest` = 2 files / 17 tests
- ห้ามอัป Next.js ข้าม major ในแผนนี้ — เป้าหมายคือ **15.5.20** เท่านั้น (16.x เป็นงานแยกที่มี breaking change)
- ทุก response ที่ปฏิเสธสิทธิ์ต้องไม่บอกว่าไฟล์มีอยู่จริงหรือไม่ — ใช้ `404` สำหรับทั้งกรณี "ไม่พบ" และ "ไม่มีสิทธิ์" ยกเว้นกรณีไม่ได้ล็อกอินให้ใช้ `401`
- ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย ตามที่ codebase ใช้อยู่
- ห้ามใช้ `console.log` — ถ้าต้อง log ใช้ `console.error` ตามแบบที่ repo ใช้

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/uploads-authz.ts` (create) | ตรรกะเดียวที่ตัดสินว่า path ใต้ `uploads/` อยู่ในขอบเขต base dir ไหม และเป็นของโรงเรียนไหน — pure/testable |
| `lib/__tests__/uploads-authz.test.ts` (create) | test ของโมดูลข้างบน |
| `app/api/serve-upload/[...path]/route.ts` (rewrite) | บังคับ auth + scoping ก่อนเสิร์ฟ, stream ไฟล์ + รองรับ HTTP Range |
| `middleware.ts` (modify) | เอา `/uploads` ออกจาก public prefixes |
| `lib/auth/guards.ts` (create) | `requireRoles()` — guard ที่หน้า RSC เรียกได้ |
| `app/admin/layout.tsx` (create) | ด่าน ADMIN ครอบทุกหน้าใต้ `/admin` |
| `app/setup/layout.tsx` (create) | ด่าน ADMIN/QA_LEAD ครอบทุกหน้าใต้ `/setup` |
| `package.json` / `package-lock.json` (modify) | Next.js 15.5.20 + audit fix |

---

### Task 1: บังคับสิทธิ์และ stream ไฟล์ที่เสิร์ฟจาก uploads

**Files:**
- Create: `lib/uploads-authz.ts`
- Create: `lib/__tests__/uploads-authz.test.ts`
- Rewrite: `app/api/serve-upload/[...path]/route.ts` (ทั้งไฟล์ 54 บรรทัด)
- Modify: `middleware.ts:17`

**Interfaces:**
- Consumes: `getUploadBaseDir()` จาก [lib/uploads-path.ts](../../../lib/uploads-path.ts), `canAccessSchool(userId, schoolId)` จาก [lib/auth/scoping.ts](../../../lib/auth/scoping.ts), `auth()` จาก [lib/auth/nextauth.ts](../../../lib/auth/nextauth.ts)
- Produces:
  - `isPathInsideBase(baseDir: string, resolvedPath: string): boolean`
  - `resolveSchoolIdForUploadPath(segments: string[]): Promise<bigint | null>` — คืน `null` เมื่อ map ไม่ได้ (ต้องถือว่า "ห้ามเข้า")

**บริบทที่ต้องรู้:** โครงสร้าง path ใต้ `uploads/` มี 2 แบบ (ยืนยันจาก `grep '/uploads/'` ใน `app/api` + `app/actions`)

| prefix | segment ที่ 2 คือ | ต้อง lookup |
|---|---|---|
| `evidence` | `Evidence.id` | ใช่ |
| `external-evaluations` | `Evidence.id` | ใช่ |
| `lesson-plans` | `LessonPlan.id` | ใช่ |
| `teaching-media` | `TeachingMedia.id` | ใช่ |
| `projects` | `Project.id` | ใช่ |
| `community-teaching` | `School.sc_id` | ไม่ต้อง |
| `pa-teacher-docs` | `School.sc_id` | ไม่ต้อง |
| `teacher-sar` | `School.sc_id` | ไม่ต้อง |

- [ ] **Step 1: เขียน test ที่ต้องล้มก่อน**

สร้าง `lib/__tests__/uploads-authz.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import path from 'path';

const mockEvidenceFindUnique = vi.fn();
const mockLessonPlanFindUnique = vi.fn();
const mockTeachingMediaFindUnique = vi.fn();
const mockProjectFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    evidence: { findUnique: mockEvidenceFindUnique },
    lessonPlan: { findUnique: mockLessonPlanFindUnique },
    teachingMedia: { findUnique: mockTeachingMediaFindUnique },
    project: { findUnique: mockProjectFindUnique },
  },
}));

let isPathInsideBase: typeof import('../uploads-authz').isPathInsideBase;
let resolveSchoolIdForUploadPath: typeof import('../uploads-authz').resolveSchoolIdForUploadPath;

beforeAll(async () => {
  const mod = await import('../uploads-authz');
  isPathInsideBase = mod.isPathInsideBase;
  resolveSchoolIdForUploadPath = mod.resolveSchoolIdForUploadPath;
});

describe('isPathInsideBase', () => {
  const base = path.resolve('/srv/app/public/uploads');

  it('ควรอนุญาตไฟล์ที่อยู่ใต้ base dir', () => {
    expect(isPathInsideBase(base, path.join(base, 'evidence', '8', 'a.png'))).toBe(true);
  });

  it('ควรอนุญาตตัว base dir เอง', () => {
    expect(isPathInsideBase(base, base)).toBe(true);
  });

  it('ควรปฏิเสธโฟลเดอร์พี่น้องที่ชื่อขึ้นต้นเหมือนกัน (prefix escape)', () => {
    const sibling = path.resolve('/srv/app/public/uploadsX/secret.pdf');
    expect(isPathInsideBase(base, sibling)).toBe(false);
  });

  it('ควรปฏิเสธ path ที่ไต่ออกนอก base ด้วย ..', () => {
    const outside = path.resolve(base, '..', '..', '.env');
    expect(isPathInsideBase(base, outside)).toBe(false);
  });
});

describe('resolveSchoolIdForUploadPath', () => {
  beforeEach(() => {
    mockEvidenceFindUnique.mockReset();
    mockLessonPlanFindUnique.mockReset();
    mockTeachingMediaFindUnique.mockReset();
    mockProjectFindUnique.mockReset();
  });

  it('ควร lookup schoolId จาก Evidence เมื่อ prefix เป็น evidence', async () => {
    mockEvidenceFindUnique.mockResolvedValue({ schoolId: BigInt(10001) });

    const result = await resolveSchoolIdForUploadPath(['evidence', '8', 'images', 'a.png']);

    expect(result).toBe(BigInt(10001));
    expect(mockEvidenceFindUnique).toHaveBeenCalledWith({
      where: { id: BigInt(8) },
      select: { schoolId: true },
    });
  });

  it('ควร lookup schoolId จาก Evidence เมื่อ prefix เป็น external-evaluations', async () => {
    mockEvidenceFindUnique.mockResolvedValue({ schoolId: BigInt(10002) });

    const result = await resolveSchoolIdForUploadPath(['external-evaluations', '15', 'doc.pdf']);

    expect(result).toBe(BigInt(10002));
  });

  it('ควรอ่าน schoolId ตรงจาก path สำหรับ teacher-sar โดยไม่ query DB', async () => {
    const result = await resolveSchoolIdForUploadPath(['teacher-sar', '10003', '2568', '7', 'sar.pdf']);

    expect(result).toBe(BigInt(10003));
    expect(mockEvidenceFindUnique).not.toHaveBeenCalled();
  });

  it('ควรคืน null เมื่อ prefix ไม่รู้จัก', async () => {
    const result = await resolveSchoolIdForUploadPath(['unknown-folder', '1', 'x.png']);
    expect(result).toBeNull();
  });

  it('ควรคืน null เมื่อ segment ที่ 2 ไม่ใช่ตัวเลข', async () => {
    const result = await resolveSchoolIdForUploadPath(['evidence', 'abc', 'x.png']);
    expect(result).toBeNull();
    expect(mockEvidenceFindUnique).not.toHaveBeenCalled();
  });

  it('ควรคืน null เมื่อหา record ไม่เจอ', async () => {
    mockEvidenceFindUnique.mockResolvedValue(null);
    const result = await resolveSchoolIdForUploadPath(['evidence', '999', 'x.png']);
    expect(result).toBeNull();
  });

  it('ควรคืน null เมื่อ segment น้อยกว่า 2 ชิ้น', async () => {
    expect(await resolveSchoolIdForUploadPath(['evidence'])).toBeNull();
    expect(await resolveSchoolIdForUploadPath([])).toBeNull();
  });
});
```

- [ ] **Step 2: รัน test ยืนยันว่าล้ม**

```bash
npx vitest run lib/__tests__/uploads-authz.test.ts
```

Expected: FAIL — `Failed to load url ../uploads-authz` หรือ `Cannot find module`

- [ ] **Step 3: เขียน lib/uploads-authz.ts**

```ts
import path from 'path';
import { prisma } from '@/lib/db';

/**
 * ตรวจว่า resolvedPath อยู่ใต้ baseDir จริงหรือไม่
 * ใช้การเทียบแบบมี separator เพื่อกันโฟลเดอร์พี่น้องที่ขึ้นต้นเหมือนกัน
 * (เช่น base=/x/uploads แล้ว /x/uploadsX ต้องไม่ผ่าน)
 */
export function isPathInsideBase(baseDir: string, resolvedPath: string): boolean {
  const base = path.resolve(baseDir);
  const target = path.resolve(resolvedPath);
  if (target === base) return true;
  return target.startsWith(base + path.sep);
}

/** โฟลเดอร์ที่ segment ที่ 2 คือ sc_id ของโรงเรียนโดยตรง */
const SCHOOL_ID_PREFIXES = new Set(['community-teaching', 'pa-teacher-docs', 'teacher-sar']);

/** โฟลเดอร์ที่ segment ที่ 2 คือ id ของ record ที่ต้อง lookup หา schoolId */
const RECORD_LOOKUPS: Record<string, (id: bigint) => Promise<{ schoolId: bigint } | null>> = {
  evidence: (id) => prisma.evidence.findUnique({ where: { id }, select: { schoolId: true } }),
  'external-evaluations': (id) =>
    prisma.evidence.findUnique({ where: { id }, select: { schoolId: true } }),
  'lesson-plans': (id) => prisma.lessonPlan.findUnique({ where: { id }, select: { schoolId: true } }),
  'teaching-media': (id) =>
    prisma.teachingMedia.findUnique({ where: { id }, select: { schoolId: true } }),
  projects: (id) => prisma.project.findUnique({ where: { id }, select: { schoolId: true } }),
};

function parseBigInt(value: string): bigint | null {
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * แปลง path segments ใต้ uploads/ เป็น schoolId เจ้าของไฟล์
 * คืน null เมื่อระบุเจ้าของไม่ได้ — ผู้เรียกต้องถือว่า "ห้ามเข้า" (fail closed)
 */
export async function resolveSchoolIdForUploadPath(segments: string[]): Promise<bigint | null> {
  if (segments.length < 2) return null;

  const [prefix, second] = segments;
  const id = parseBigInt(second);
  if (id === null) return null;

  if (SCHOOL_ID_PREFIXES.has(prefix)) {
    return id;
  }

  const lookup = RECORD_LOOKUPS[prefix];
  if (!lookup) return null;

  const record = await lookup(id);
  return record?.schoolId ?? null;
}
```

- [ ] **Step 4: รัน test ยืนยันว่าผ่าน**

```bash
npx vitest run lib/__tests__/uploads-authz.test.ts
```

Expected: PASS — `Tests 11 passed (11)`

- [ ] **Step 5: เขียน route handler ใหม่ทั้งไฟล์**

แทนที่เนื้อหาทั้งหมดของ `app/api/serve-upload/[...path]/route.ts` ด้วย:

```ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { getUploadBaseDir } from '@/lib/uploads-path';
import { isPathInsideBase, resolveSchoolIdForUploadPath } from '@/lib/uploads-authz';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

/** แปลง "bytes=0-1023" เป็นช่วงจริง — คืน null เมื่อ header ไม่ถูกต้องหรือไม่มี */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;

  // suffix range: bytes=-500 = 500 ไบต์สุดท้าย
  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Number(rawEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    // รองรับทั้ง ['evidence','8','x.png'] และ ['evidence/8/x.png'] (จาก rewrite ใน next.config.js)
    const segments =
      pathSegments.length === 1 && pathSegments[0].includes('/')
        ? pathSegments[0].split('/').filter(Boolean)
        : pathSegments;

    const baseDir = getUploadBaseDir();
    const resolved = path.resolve(baseDir, ...segments);
    if (!isPathInsideBase(baseDir, resolved)) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    // ระบุเจ้าของไฟล์แล้วตรวจสิทธิ์ — ระบุไม่ได้ = ไม่ให้เข้า
    const schoolId = await resolveSchoolIdForUploadPath(segments);
    if (schoolId === null) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    let fileStat;
    try {
      fileStat = await stat(resolved);
    } catch {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const commonHeaders = {
      'Content-Type': contentType,
      // ไฟล์ต้องใช้สิทธิ์ — ห้าม cache ที่ shared proxy
      'Cache-Control': 'private, max-age=3600',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    };

    const range = parseRange(request.headers.get('range'), fileStat.size);

    if (range) {
      const stream = createReadStream(resolved, { start: range.start, end: range.end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes ${range.start}-${range.end}/${fileStat.size}`,
          'Content-Length': String(range.end - range.start + 1),
        },
      });
    }

    const stream = createReadStream(resolved);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Length': String(fileStat.size),
      },
    });
  } catch (error) {
    console.error('[api/serve-upload] error:', error);
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
  }
}
```

- [ ] **Step 6: เอา /uploads ออกจาก public paths ใน middleware**

ใน `middleware.ts` แก้ `PUBLIC_PATH_PREFIXES` (บรรทัด 11-20) โดยลบ `'/uploads',` ออก เหลือ:

```ts
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/public',
  '/manifest.json',
  '/icon.png',
];
```

**หมายเหตุ:** `matcher` (บรรทัด 147) ยัง exclude `uploads` อยู่ ไม่ต้องแก้ — การตรวจสิทธิ์ตอนนี้อยู่ใน route handler แล้ว ซึ่งแข็งแรงกว่า เพราะไม่ถูก middleware-bypass CVE กระทบ

- [ ] **Step 7: ตรวจ build + typecheck ผ่าน**

```bash
npx tsc --noEmit
npm run build
```

Expected: ทั้งคู่ exit 0 — ถ้า `Readable.toWeb` ฟ้อง type ให้ตรวจว่า `@types/node` ถูก resolve (มีอยู่แล้วเวอร์ชัน 22.19.0)

- [ ] **Step 8: ทดสอบด้วยมือว่าไม่ล็อกอินแล้วเข้าไม่ได้**

รัน `npm run dev` แล้วในอีก terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uploads/evidence/1/images/anything.png
```

Expected: `401` (เดิมได้ `200` หรือ `404` โดยไม่ถามสิทธิ์เลย)

- [ ] **Step 9: ทดสอบด้วยมือว่า Range ทำงาน**

ล็อกอินผ่านเบราว์เซอร์ คัดลอก cookie `authjs.session-token` แล้ว:

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
  -H "Range: bytes=0-99" \
  -H "Cookie: authjs.session-token=<ค่าที่คัดลอกมา>" \
  http://localhost:3000/uploads/evidence/<id ที่มีจริง>/<โฟลเดอร์>/<ไฟล์>
```

Expected: `206 100`

- [ ] **Step 10: Commit**

```bash
git add lib/uploads-authz.ts lib/__tests__/uploads-authz.test.ts app/api/serve-upload middleware.ts
git commit -m "fix(security): require auth + school scoping on served uploads

serve-upload เดิมไม่ตรวจสิทธิ์เลย ใครรู้ path ก็ดึงไฟล์หลักฐานได้
พร้อมแก้ traversal check ที่ยอมให้โฟลเดอร์พี่น้อง prefix เดียวกันผ่าน
และเปลี่ยนเป็น stream + รองรับ Range แทนอ่านทั้งไฟล์เข้า RAM"
```

---

### Task 2: ปิดด่าน admin/setup ด้วย layout guard

**Files:**
- Create: `lib/auth/guards.ts`
- Create: `app/admin/layout.tsx`
- Create: `app/setup/layout.tsx`

**Interfaces:**
- Consumes: `auth()` จาก [lib/auth/nextauth.ts](../../../lib/auth/nextauth.ts), `redirect` จาก `next/navigation`
- Produces: `requireRoles(allowed: string[]): Promise<Session>` — โยน redirect เองเมื่อไม่ผ่าน แผนอื่นเรียกใช้ได้

**เหตุผลที่ใช้ layout แทนแก้ 8 หน้า:** ทั้ง `app/admin/` และ `app/setup/` ยังไม่มี `layout.tsx` เลย (ยืนยันด้วย `find app/admin app/setup -name layout.tsx` = ว่าง) การใส่ guard ที่ layout ครอบทุกหน้าลูกทั้งที่มีอยู่และที่จะเพิ่มในอนาคต — DRY กว่าและกันหน้าใหม่ลืม guard

- [ ] **Step 1: เขียน lib/auth/guards.ts**

```ts
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/nextauth';

/**
 * ด่านสิทธิ์สำหรับหน้า RSC — ป้องกันชั้นที่สองนอกเหนือจาก middleware
 * (middleware มีประวัติช่องโหว่ bypass จึงห้ามพึ่งชั้นเดียว)
 * ไม่ผ่าน = redirect ทันที ฟังก์ชันนี้จึงไม่มีทางคืนค่าแบบ "ไม่ได้สิทธิ์"
 */
export async function requireRoles(allowed: string[]) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const roleCodes = new Set((session.user.roles ?? []).map((role) => role.role));
  const permitted = allowed.some((code) => roleCodes.has(code));

  if (!permitted) {
    redirect('/dashboard?error=forbidden&reason=' + encodeURIComponent('คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้'));
  }

  return session;
}
```

- [ ] **Step 2: สร้าง app/admin/layout.tsx**

```tsx
import { requireRoles } from '@/lib/auth/guards';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(['ADMIN']);
  return <>{children}</>;
}
```

- [ ] **Step 3: สร้าง app/setup/layout.tsx**

```tsx
import { requireRoles } from '@/lib/auth/guards';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(['ADMIN', 'QA_LEAD']);
  return <>{children}</>;
}
```

- [ ] **Step 4: ยืนยันว่าไม่เหลือหน้าใต้ admin/setup ที่ไร้ด่าน**

```bash
ls app/admin/layout.tsx app/setup/layout.tsx
npx tsc --noEmit
```

Expected: เห็นไฟล์ทั้งสอง และ tsc exit 0

- [ ] **Step 5: ทดสอบด้วยมือว่า guard ทำงาน**

รัน `npm run dev` เข้าเบราว์เซอร์แบบไม่ล็อกอิน ไปที่ `http://localhost:3000/admin/users`

Expected: ถูกส่งไป `/login` — จากนั้นล็อกอินด้วย `teacher@example.com` แล้วเข้า `/admin/users` อีกครั้ง

Expected: ถูกส่งไป `/dashboard?error=forbidden&reason=...`

- [ ] **Step 6: ตรวจว่า build ผ่าน**

```bash
npm run build
```

Expected: exit 0 และ route `/admin/...`, `/setup/...` ยังขึ้นเป็น `ƒ (Dynamic)` เหมือนเดิม

- [ ] **Step 7: Commit**

```bash
git add lib/auth/guards.ts app/admin/layout.tsx app/setup/layout.tsx
git commit -m "fix(security): add RSC-level role guard for admin and setup routes

8 หน้าใต้ /admin และ /setup พึ่ง middleware ชั้นเดียว
ซึ่งเสี่ยงจาก middleware-bypass CVE ของ Next.js"
```

---

### Task 3: อัป Next.js ปิด CVE ระดับ critical

**Files:**
- Modify: `package.json:50`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: ผลลัพธ์ของ Task 1 และ 2 (build ต้องผ่านอยู่ก่อนอัป จะได้รู้ว่า regression มาจากการอัปจริง)
- Produces: `next@15.5.20` — ไม่เปลี่ยน API ใด ๆ ที่แผนอื่นใช้

- [ ] **Step 1: บันทึกสถานะช่องโหว่ก่อนอัป**

```bash
npm audit --omit=dev 2>&1 | tail -5
```

Expected: `12 vulnerabilities (1 moderate, 10 high, 1 critical)` — จดตัวเลขนี้ไว้เทียบทีหลัง

- [ ] **Step 2: อัป Next.js เป็น patch ล่าสุดของ 15.5.x**

```bash
npm install next@15.5.20 eslint-config-next@15.5.20
```

**ห้าม**ใช้ `npm install next@latest` — จะได้ 16.x ซึ่งถอด `next lint` และเปลี่ยน caching semantics

- [ ] **Step 3: แก้ช่องโหว่ transitive ที่เหลือ**

```bash
npm audit fix
```

**ห้าม**ใช้ `--force` — จะลาก major upgrade ที่มี breaking change เข้ามา

- [ ] **Step 4: ยืนยันว่าช่องโหว่ฝั่ง production หมด**

```bash
npm audit --omit=dev 2>&1 | tail -5
```

Expected: `found 0 vulnerabilities` — ถ้ายังเหลือ critical/high ให้ระบุ package ที่ค้างและหยุดรายงาน ไม่ต้องใช้ `--force`

- [ ] **Step 5: ยืนยันว่าระบบยังทำงาน**

```bash
npx tsc --noEmit
npx next lint
npx vitest run
npm run build
```

Expected ทั้งหมด: tsc exit 0 · lint `✔ No ESLint warnings or errors` · vitest `Test Files 3 passed (3)` / `Tests 28 passed (28)` (17 เดิม + 11 จาก Task 1) · build exit 0

- [ ] **Step 6: ทดสอบ smoke ด้วยมือ**

```bash
npm run dev
```

เปิด `http://localhost:3000/login` ล็อกอินด้วย `admin@example.com` / `admin123` แล้วเข้า `/dashboard`, `/evidence`, `/admin/users`

Expected: ทุกหน้าเรนเดอร์ได้ ไม่มี error ใน console ของ dev server

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): bump next to 15.5.20 to close critical RCE + middleware bypass

ปิด GHSA-9qr9-h5gf-34mp (RCE ใน React flight protocol)
และ advisory เรื่อง middleware/proxy bypass 3 รายการ
ซึ่งกระทบตรง เพราะ RBAC ของระบบบังคับที่ middleware"
```

---

## เกณฑ์ปิดแผน

- [ ] `curl` ไป `/uploads/...` โดยไม่ล็อกอิน → `401`
- [ ] ล็อกอินคนละโรงเรียนแล้วขอไฟล์ของโรงเรียนอื่น → `404`
- [ ] `Range: bytes=0-99` → `206` พร้อม 100 ไบต์
- [ ] เข้า `/admin/users` ด้วยบัญชี TEACHER → redirect ไป `/dashboard?error=forbidden`
- [ ] `npm audit --omit=dev` → 0 vulnerabilities
- [ ] `npx vitest run` → 3 files / 28 tests
- [ ] `npm run build` exit 0
