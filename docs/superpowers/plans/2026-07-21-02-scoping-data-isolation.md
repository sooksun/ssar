# Scoping & Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ทุกหน้าฝั่งอ่านใช้ขอบเขตโรงเรียนชุดเดียวกับฝั่งเขียน และปิดกรณีที่ query หลุดขอบเขตทั้งหมด

**Architecture:** ปัญหาคือ 9 หน้า RSC คำนวณ `schoolIds` เองด้วย `roles.map(r => BigInt(r.schoolId))` แทนที่จะเรียก `getUserSchools()` ซึ่งพังกับ role ระดับเขต (session เก็บ `schoolId: ''` → `BigInt('')` = `0n` ตรงกับโรงเรียนไหนก็ไม่ได้) และ ADMIN (เห็นแค่โรงเรียนที่ตัวเองมี `UserSchoolRole`) วิธีแก้คือสร้าง helper ตัวเดียว `requireSchoolScope()` ที่ทุกหน้าเรียก แล้วไล่เปลี่ยนทุกจุด

**Tech Stack:** Next.js 15.5 App Router (RSC), Prisma 6.19, Vitest 2.1

## Global Constraints

- ต้องรันแผน `2026-07-21-01-security-hardening.md` ให้จบก่อน — แผนนี้ต่อยอดจาก `lib/auth/guards.ts` ที่สร้างในนั้น
- ห้ามใช้ `roles.map(...BigInt(role.schoolId))` เพิ่มที่ใดอีก — `getUserSchools()` เป็นแหล่งความจริงเดียว ตามที่ [CLAUDE.md](../../../CLAUDE.md) ระบุ
- ทุก Prisma query ที่กรองด้วยโรงเรียนต้องมี `schoolId: { in: schoolIds }` เสมอ — ห้ามส่ง `where: undefined` เมื่อ `schoolIds` ว่าง (จะกลายเป็นดึงทุกโรงเรียน)
- แผนนี้แก้เฉพาะ "ขอบเขตข้อมูล" ห้ามแตะ pagination หรือรูปแบบ query — งานนั้นอยู่ในแผน 04
- ข้อความ empty state เป็นภาษาไทย

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/auth/guards.ts` (modify) | เพิ่ม `requireSchoolScope()` — จุดเดียวที่หน้า RSC ใช้ขอขอบเขตโรงเรียน |
| `lib/__tests__/guards.test.ts` (create) | test ของ helper ข้างบน |
| `app/dashboard/page.tsx` (modify) | scoping + ปิด leak |
| `app/pa/page.tsx` (modify) | ปิด leak |
| อีก 8 หน้า RSC (modify) | เปลี่ยนมาใช้ helper |

---

### Task 1: สร้าง requireSchoolScope() และแก้สองหน้าที่ข้อมูลรั่ว

**Files:**
- Modify: `lib/auth/guards.ts` (เพิ่มฟังก์ชัน)
- Create: `lib/__tests__/guards.test.ts`
- Modify: `app/dashboard/page.tsx:17-118`
- Modify: `app/pa/page.tsx:33-52`

**Interfaces:**
- Consumes: `auth()` จาก [lib/auth/nextauth.ts](../../../lib/auth/nextauth.ts), `getUserSchools()` จาก [lib/auth/scoping.ts](../../../lib/auth/scoping.ts), `requireRoles()` จาก Task 2 ของแผน 01
- Produces: `requireSchoolScope(): Promise<{ session: Session; schoolIds: bigint[] }>` — Task 2 ของแผนนี้และแผน 04 เรียกใช้

- [ ] **Step 1: เขียน test ที่ต้องล้มก่อน**

สร้าง `lib/__tests__/guards.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

const mockAuth = vi.fn();
const mockGetUserSchools = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock('@/lib/auth/nextauth', () => ({ auth: mockAuth }));
vi.mock('@/lib/auth/scoping', () => ({ getUserSchools: mockGetUserSchools }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

let requireSchoolScope: typeof import('../auth/guards').requireSchoolScope;

beforeAll(async () => {
  const mod = await import('../auth/guards');
  requireSchoolScope = mod.requireSchoolScope;
});

describe('requireSchoolScope', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUserSchools.mockReset();
    mockRedirect.mockClear();
  });

  it('ควร redirect ไป /login เมื่อไม่มี session', async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSchoolScope()).rejects.toThrow('REDIRECT:/login');
    expect(mockGetUserSchools).not.toHaveBeenCalled();
  });

  it('ควรคืน schoolIds จาก getUserSchools ไม่ใช่จาก session.roles', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '7', roles: [{ role: 'AREA_ADMIN', schoolId: '' }] },
    });
    mockGetUserSchools.mockResolvedValue([BigInt(10001), BigInt(10002)]);

    const result = await requireSchoolScope();

    expect(mockGetUserSchools).toHaveBeenCalledWith('7');
    expect(result.schoolIds).toEqual([BigInt(10001), BigInt(10002)]);
    expect(result.session.user.id).toBe('7');
  });

  it('ควรคืน array ว่างโดยไม่ redirect เมื่อ user ไม่มีโรงเรียน', async () => {
    mockAuth.mockResolvedValue({ user: { id: '9', roles: [] } });
    mockGetUserSchools.mockResolvedValue([]);

    const result = await requireSchoolScope();

    expect(result.schoolIds).toEqual([]);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: รัน test ยืนยันว่าล้ม**

```bash
npx vitest run lib/__tests__/guards.test.ts
```

Expected: FAIL — `requireSchoolScope is not a function`

- [ ] **Step 3: เพิ่ม requireSchoolScope ใน lib/auth/guards.ts**

เพิ่มบรรทัด import และฟังก์ชันนี้ต่อท้าย `lib/auth/guards.ts` (ไฟล์ที่สร้างในแผน 01):

```ts
import { getUserSchools } from '@/lib/auth/scoping';

/**
 * ขอบเขตโรงเรียนสำหรับหน้า RSC — ใช้แทนการ map จาก session.roles โดยตรง
 * เพราะ role ระดับเขตเก็บ schoolId เป็นสตริงว่างใน session (BigInt('') = 0n)
 * และ ADMIN ต้องเห็นทุกโรงเรียน ไม่ใช่แค่ที่มี UserSchoolRole
 *
 * คืน schoolIds ว่างได้ — หน้าที่เรียกต้องแสดง empty state
 * ห้ามแปลง array ว่างเป็น query ที่ไม่มี where
 */
export async function requireSchoolScope() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const schoolIds = await getUserSchools(session.user.id);

  return { session, schoolIds };
}
```

- [ ] **Step 4: รัน test ยืนยันว่าผ่าน**

```bash
npx vitest run lib/__tests__/guards.test.ts
```

Expected: PASS — `Tests 3 passed (3)`

- [ ] **Step 5: แก้ app/dashboard/page.tsx — เปลี่ยน scoping**

แทนบรรทัด 17-31 (ตั้งแต่ `export default async function DashboardPage()` ถึงก่อน `const evidenceWhere`):

```tsx
export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

  const schoolIds = roles.map((role) => BigInt(role.schoolId));

  const evidenceWhere: Prisma.EvidenceWhereInput = {
```

ด้วย:

```tsx
export default async function DashboardPage() {
  const { session, schoolIds } = await requireSchoolScope();

  const user = session.user;

  const evidenceWhere: Prisma.EvidenceWhereInput = {
```

แล้วแก้ import ด้านบนไฟล์ — ลบ `import { auth } from '@/lib/auth/nextauth';` และ `import { redirect } from 'next/navigation';` ถ้าไม่มีที่อื่นใช้ แล้วเพิ่ม:

```tsx
import { requireSchoolScope } from '@/lib/auth/guards';
```

- [ ] **Step 6: แก้ app/dashboard/page.tsx — ปิด PA data leak**

แทนบล็อก `prisma.pAAgreement.findMany` (บรรทัด 114-117):

```tsx
    prisma.pAAgreement.findMany({
      where: schoolIds.length > 0 ? { schoolId: { in: schoolIds } } : undefined,
      select: { positionType: true, status: true, isPassed: true, totalScore: true },
    }),
```

ด้วย:

```tsx
    prisma.pAAgreement.findMany({
      where: { schoolId: { in: schoolIds } },
      select: { positionType: true, status: true, isPassed: true, totalScore: true },
    }),
```

**เหตุผล:** `where: undefined` ทำให้ user ที่ไม่มีโรงเรียนดึง PA ของทุกโรงเรียนในระบบ ส่วน `{ in: [] }` ของ Prisma คืน 0 แถวเสมอ ซึ่งเป็นพฤติกรรมที่ถูกต้อง

- [ ] **Step 7: แก้ app/pa/page.tsx — ปิด PA data leak แบบเดียวกัน**

แทนบล็อก `prisma.pAAgreement.findMany` (บรรทัด 44-52):

```tsx
  const agreements = await prisma.pAAgreement.findMany({
    where: schoolIds.length > 0 ? { schoolId: { in: schoolIds } } : undefined,
```

ด้วย:

```tsx
  const agreements = await prisma.pAAgreement.findMany({
    where: { schoolId: { in: schoolIds } },
```

(ส่วนที่เหลือของ query — `orderBy`, `include`, `take: 50` — คงไว้เหมือนเดิม)

- [ ] **Step 8: ยืนยันว่าไม่เหลือ where แบบมีเงื่อนไขที่หลุดขอบเขต**

```bash
grep -rn "schoolIds.length > 0 ?" app --include="*.tsx" --include="*.ts"
```

Expected: ไม่มีผลลัพธ์ที่อยู่ในตำแหน่ง `where:` — ถ้าเจอที่ `app/pa/page.tsx:38` (`const schools = schoolIds.length > 0 ? await prisma.school.findMany(...) : []`) อันนั้น **ปล่อยไว้ได้** เพราะเป็นการข้าม query ทั้งก้อน ไม่ใช่การส่ง `where: undefined`

- [ ] **Step 9: ตรวจ build + test**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Expected: tsc exit 0 · vitest `Test Files 4 passed (4)` / `Tests 31 passed (31)` · build exit 0

- [ ] **Step 10: ทดสอบด้วยมือว่า ADMIN เห็นทุกโรงเรียน**

รัน `npm run dev` ล็อกอิน `admin@example.com` / `admin123` เข้า `/dashboard`

Expected: ตัวเลขสรุปหลักฐานมากกว่าหรือเท่าเดิม (ADMIN ควรเห็นทุกโรงเรียน เดิมเห็นแค่โรงเรียนที่ตัวเองผูก `UserSchoolRole`)

- [ ] **Step 11: Commit**

```bash
git add lib/auth/guards.ts lib/__tests__/guards.test.ts app/dashboard/page.tsx app/pa/page.tsx
git commit -m "fix(scoping): use getUserSchools on dashboard + close PA where:undefined leak

หน้า RSC map schoolId เองจาก session ทำให้ role ระดับเขตได้ 0n
และ where:undefined ทำให้ user ที่ไม่มีโรงเรียนเห็น PA ทุกโรงเรียน"
```

---

### Task 2: เปลี่ยนอีก 8 หน้าให้ใช้ requireSchoolScope()

**Files:**
- Modify: `app/evidence/page.tsx:14-24`
- Modify: `app/evidence/[id]/page.tsx:26`
- Modify: `app/evidence/new/page.tsx:31`
- Modify: `app/lesson-plans/new/page.tsx:23`
- Modify: `app/reports/missing/page.tsx:19`
- Modify: `app/reports/readiness/page.tsx:23`
- Modify: `app/teaching-media/new/page.tsx:23`
- Modify: `app/work-collection/page.tsx:18`

**Interfaces:**
- Consumes: `requireSchoolScope()` จาก Task 1
- Produces: ไม่มี export ใหม่ — แผน 04 จะแก้ `app/evidence/page.tsx` และ `app/reports/readiness/page.tsx` ต่อ โดยสมมติว่า `schoolIds` มาจาก `requireSchoolScope()` แล้ว

- [ ] **Step 1: ยืนยันรายชื่อไฟล์ที่ยังมีปัญหา**

```bash
grep -rn "BigInt(role.schoolId)\|BigInt(r.schoolId)" app --include="*.tsx"
```

Expected: 8 บรรทัด (dashboard หายไปแล้วจาก Task 1)

- [ ] **Step 2: แก้ทีละไฟล์ตามรูปแบบเดียวกัน**

ในแต่ละไฟล์ทั้ง 8 ให้ทำ 3 อย่าง:

1. เพิ่ม import: `import { requireSchoolScope } from '@/lib/auth/guards';`
2. แทนบล็อกต้นฟังก์ชันที่มีรูปแบบนี้:

```tsx
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

  const schoolIds = roles.map((role) => BigInt(role.schoolId));
```

ด้วย:

```tsx
  const { session, schoolIds } = await requireSchoolScope();
  const user = session.user;
```

3. ลบ import ของ `auth` และ `redirect` ถ้าไม่มีที่อื่นในไฟล์ใช้แล้ว

**ข้อยกเว้นเฉพาะไฟล์:**

- `app/work-collection/page.tsx` ใช้ตัวแปรชื่อ `r` และมี guard บทบาทต่อจากนั้น (บรรทัด 14-18) — เก็บ guard นั้นไว้ ให้เหลือ:

```tsx
  const { session, schoolIds } = await requireSchoolScope();

  const roles = session.user.roles ?? [];
  const canAdd = roles.some((r) => ['ADMIN', 'QA_LEAD', 'TEACHER'].includes(r.role));
  if (!canAdd) redirect('/dashboard');
```

  (ไฟล์นี้ยังต้อง import `redirect` ต่อ)

- `app/evidence/[id]/page.tsx` ใช้ `schoolIds` เพื่อตรวจว่าหลักฐานที่เปิดอยู่ในขอบเขตหรือไม่ — ตรรกะส่วนนั้นไม่ต้องแก้ แค่เปลี่ยนที่มาของ `schoolIds`

- [ ] **Step 3: ยืนยันว่าไม่เหลือ pattern เดิมเลย**

```bash
grep -rn "BigInt(role.schoolId)\|BigInt(r.schoolId)" app --include="*.tsx" --include="*.ts"; echo "exit=$?"
```

Expected: `exit=1` (grep ไม่เจออะไรเลย)

- [ ] **Step 4: ตรวจว่า typecheck และ build ผ่าน**

```bash
npx tsc --noEmit
npm run build
```

Expected: ทั้งคู่ exit 0 — error ที่พบบ่อยคือ import `auth`/`redirect` ที่ลบไปแล้วยังถูกใช้ที่อื่นในไฟล์ ให้ใส่กลับเฉพาะไฟล์นั้น

- [ ] **Step 5: ทดสอบด้วยมือด้วยบัญชีระดับเขต**

รัน `npm run dev` ล็อกอินด้วย `areaadmin@example.com` (รหัสตาม role ที่ seed ไว้ ดู [README.md](../../../README.md)) แล้วเข้า `/evidence` และ `/reports/readiness`

Expected: เห็นข้อมูลของโรงเรียนในเขต — เดิมทั้งสองหน้าว่างเปล่าเพราะ `BigInt('')` = `0n`

- [ ] **Step 6: รัน test ทั้งชุดยืนยันว่าไม่พัง**

```bash
npx vitest run
```

Expected: `Test Files 4 passed (4)` / `Tests 31 passed (31)`

- [ ] **Step 7: Commit**

```bash
git add app/evidence app/lesson-plans/new app/reports app/teaching-media/new app/work-collection
git commit -m "fix(scoping): route remaining 8 RSC pages through requireSchoolScope

ปิด pattern rots.map(BigInt(role.schoolId)) ทั้งหมด
role ระดับเขตและ ADMIN จึงเห็นข้อมูลตามขอบเขตจริง"
```

---

## เกณฑ์ปิดแผน

- [ ] `grep -rn "BigInt(role.schoolId)\|BigInt(r.schoolId)" app` → ไม่เจอ
- [ ] ไม่มี `where: schoolIds.length > 0 ? ... : undefined` เหลือใน query ใด
- [ ] บัญชี AREA_ADMIN เห็นข้อมูลของโรงเรียนในเขตที่ `/evidence` และ `/reports/readiness`
- [ ] บัญชี ADMIN เห็นข้อมูลของทุกโรงเรียนที่ `/dashboard`
- [ ] `npx vitest run` → 4 files / 31 tests
- [ ] `npm run build` exit 0
