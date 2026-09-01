# Performance & Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หยุด 3 จุดที่ดึงข้อมูลเกินความจำเป็นจนได้ผลลัพธ์ผิดหรือกินหน่วยความจำจนล่ม

**Architecture:** ทั้งสามจุดมีรากเดียวกัน — ดึงข้อมูลดิบทั้งหมดมาแล้วค่อยกรอง/รวมใน JavaScript แทนที่จะให้ฐานข้อมูล (หรือ guard) ทำงานนั้น แก้โดยผลักการกรองและการรวมยอดลงไปที่ SQL และเพิ่มเพดานขนาดก่อนอ่านไฟล์เข้าหน่วยความจำ

**Tech Stack:** Next.js 15.5 App Router (RSC + searchParams), Prisma 6.19 (`groupBy`, `aggregate`), Google Generative AI SDK, Vitest 2.1

## Global Constraints

- ต้องรันแผน `2026-07-21-02-scoping-data-isolation.md` ให้จบก่อน — แผนนี้สมมติว่าทุกหน้าได้ `schoolIds` จาก `requireSchoolScope()` แล้ว
- ห้ามเปลี่ยนความหมายของ `Evidence.fiscalYear` (ยังเก็บค่า academicYear ในบางเส้นทาง ตามที่ [CLAUDE.md](../../../CLAUDE.md) ระบุ)
- ตัวเลขที่ผู้ใช้เห็นบน dashboard ต้องเท่าเดิมทุกตัวหลังปรับ query — ถ้าเปลี่ยนถือว่าพัง
- ขนาดสูงสุดที่ส่ง inline ให้ Gemini: **15 MB** (ต่ำกว่าเพดาน ~20 MB ของ API ไว้เผื่อ overhead ของ base64 และ prompt)
- ข้อความ error ที่ผู้ใช้เห็นเป็นภาษาไทย

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `app/evidence/page.tsx` (modify) | กรอง level ใน SQL + pagination จริง |
| `app/dashboard/page.tsx` (modify) | เปลี่ยน 2 query จากดึงแถวดิบเป็น aggregate |
| `lib/ai/gemini.ts` (modify) | เพดานขนาด + ชนิดไฟล์ ก่อนอ่านเข้าหน่วยความจำ |
| `lib/__tests__/gemini-guard.test.ts` (create) | test ของ guard |

---

### Task 1: กรอง level ใน SQL และใส่ pagination ให้หน้าหลักฐาน

**Files:**
- Modify: `app/evidence/page.tsx:8-78` (ส่วน query และหัวเรื่อง) และส่วนท้ายที่ render รายการ

**Interfaces:**
- Consumes: `requireSchoolScope()` จากแผน 02
- Produces: URL รูปแบบ `/evidence?level=<CODE>&page=<n>` — ลิงก์ในหน้าอื่นที่ชี้มา `/evidence?level=...` ยังใช้ได้เหมือนเดิม (ไม่มี `page` = หน้า 1)

**ปัญหาที่กำลังแก้:** ปัจจุบันดึง 100 แถวล่าสุดของทุกระดับ แล้วค่อยกรองด้วย `.filter()` ใน JS ([app/evidence/page.tsx:73-77](../../../app/evidence/page.tsx)) — ถ้าโรงเรียนมีหลักฐานปฐมวัย 100 รายการล่าสุด แท็บ "ขั้นพื้นฐาน" จะแสดง **0 รายการ ทั้งที่มีข้อมูลอยู่**

- [ ] **Step 1: ยืนยันบั๊กด้วยข้อมูลจริง**

```bash
npx prisma db execute --stdin <<'SQL'
SELECT l.code AS level_code, COUNT(*) AS n
FROM evidence e
JOIN qaindicator i ON i.id = e.indicatorId
JOIN qastandard s ON s.id = i.standardId
JOIN edulevel l ON l.id = s.levelId
WHERE e.del = 0
GROUP BY l.code;
SQL
```

จดจำนวนต่อระดับไว้ — ตัวเลขนี้คือสิ่งที่หน้าเว็บต้องแสดงได้ครบหลังแก้

**หมายเหตุ:** ชื่อตารางมาจาก `@@map` ใน [prisma/schema.prisma](../../../prisma/schema.prisma) ถ้า query ล้มเพราะชื่อตารางไม่ตรง ให้เช็ค `@@map` ของ QAIndicator/QAStandard/EduLevel แล้วปรับ

- [ ] **Step 2: แก้ส่วน query ของ app/evidence/page.tsx**

แทนตั้งแต่ `export default async function EvidencePage({` จนถึงบล็อก `const evidence = allEvidence.filter(...)` (บรรทัด 9-78) ด้วย:

```tsx
const PAGE_SIZE = 20;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; page?: string }>;
}) {
  const { session, schoolIds } = await requireSchoolScope();
  const user = session.user;

  // กำหนดแท็บที่เลือกจาก query param
  const LEVEL_TABS = [
    { code: 'EARLY_CHILDHOOD', label: 'ปฐมวัย' },
    { code: 'BASIC', label: 'ขั้นพื้นฐาน' },
  ] as const;
  const { level, page } = await searchParams;
  const activeLevel = LEVEL_TABS.some((t) => t.code === level) ? level! : 'EARLY_CHILDHOOD';
  const activeLabel = LEVEL_TABS.find((t) => t.code === activeLevel)?.label ?? 'ปฐมวัย';

  const parsedPage = Number.parseInt(page ?? '1', 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // กรอง level ที่ฐานข้อมูล ไม่ใช่หลังดึงมาแล้ว — ไม่งั้นแท็บที่มีข้อมูลน้อยกว่าจะว่างเปล่า
  const where = {
    schoolId: { in: schoolIds },
    del: false,
    indicator: {
      standard: {
        level: { code: activeLevel },
      },
    },
  };

  const [totalCount, evidence] = await Promise.all([
    prisma.evidence.count({ where }),
    prisma.evidence.findMany({
      where,
      include: {
        school: {
          select: {
            name: true,
          },
        },
        indicator: {
          include: {
            standard: {
              include: {
                level: true,
              },
            },
          },
        },
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
        files: {
          where: {
            isPrimary: true,
            del: false,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
```

แล้วแก้ import ด้านบนไฟล์: ลบ `import { auth } from '@/lib/auth/nextauth';` และ `import { redirect } from 'next/navigation';` (ถ้าไม่มีที่อื่นใช้) เพิ่ม:

```tsx
import { requireSchoolScope } from '@/lib/auth/guards';
```

- [ ] **Step 3: แก้บรรทัดสรุปจำนวนให้บอกยอดจริง**

แทนบล็อก Filter Section:

```tsx
        <p className="text-sm text-muted-foreground">
          กำลังแสดง {evidence.length} รายการ ({activeLabel})
        </p>
```

ด้วย:

```tsx
        <p className="text-sm text-muted-foreground">
          กำลังแสดง {evidence.length} จาก {totalCount} รายการ ({activeLabel}) — หน้า {currentPage}/{totalPages}
        </p>
```

- [ ] **Step 4: แก้ลิงก์แท็บให้รีเซ็ตหน้าเป็น 1**

ในบล็อก `LEVEL_TABS.map(...)` แทน `href`:

```tsx
            href={`/evidence?level=${tab.code}`}
```

ด้วย:

```tsx
            href={`/evidence?level=${tab.code}&page=1`}
```

- [ ] **Step 5: เพิ่มแถบเปลี่ยนหน้าใต้รายการ**

ต่อท้ายบล็อก `<div className="space-y-4">...</div>` ที่ปิดรายการหลักฐาน (ก่อน `)}` ที่ปิด ternary) ให้เพิ่ม:

```tsx
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={`/evidence?level=${activeLevel}&page=${currentPage - 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                >
                  ก่อนหน้า
                </Link>
              ) : (
                <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground opacity-50">
                  ก่อนหน้า
                </span>
              )}

              <span className="px-3 text-sm text-muted-foreground">
                หน้า {currentPage} / {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={`/evidence?level=${activeLevel}&page=${currentPage + 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                >
                  ถัดไป
                </Link>
              ) : (
                <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground opacity-50">
                  ถัดไป
                </span>
              )}
            </div>
          )}
```

- [ ] **Step 6: ตรวจว่า typecheck + build ผ่าน**

```bash
npx tsc --noEmit
npm run build
```

Expected: ทั้งคู่ exit 0

- [ ] **Step 7: ทดสอบด้วยมือว่าทั้งสองแท็บแสดงข้อมูลถูก**

รัน `npm run dev` ล็อกอิน `admin@example.com` / `admin123` แล้วเปิด `/evidence?level=EARLY_CHILDHOOD` และ `/evidence?level=BASIC`

Expected: ยอด "จาก N รายการ" ของแต่ละแท็บตรงกับตัวเลขที่จดไว้ใน Step 1 — และถ้าแท็บใดมีเกิน 20 รายการ ปุ่ม "ถัดไป" ต้องกดได้และเปลี่ยนข้อมูลจริง

- [ ] **Step 8: Commit**

```bash
git add app/evidence/page.tsx
git commit -m "fix(evidence): filter level in SQL and add real pagination

เดิมดึง 100 แถวล่าสุดของทุกระดับแล้วกรองใน JS
ทำให้แท็บที่มีข้อมูลน้อยกว่าแสดงว่างเปล่าทั้งที่มีข้อมูลอยู่"
```

---

### Task 2: เปลี่ยน dashboard จากดึงแถวดิบเป็น aggregate

**Files:**
- Modify: `app/dashboard/page.tsx:33-118` (บล็อก `Promise.all`) และส่วนคำนวณบรรทัด 128-206

**Interfaces:**
- Consumes: `requireSchoolScope()` จากแผน 02
- Produces: ไม่มี export ใหม่ — ค่าที่ส่งเข้า chart component ทั้ง 4 ตัวยังเป็น type เดิม (`ReadinessByStandardDatum`, `StatusSlice`, `EvaluationScoreByStandardDatum`, `EvaluationMonthlyTrendDatum`)

**ปัญหาที่กำลังแก้:** `evidenceForAgg` ([dashboard:65](../../../app/dashboard/page.tsx)) ดึง Evidence ทุกแถวของโรงเรียนพร้อม `include` เต็มเพียงเพื่อไปนับใน JS และ `evaluationRecords` ([dashboard:73](../../../app/dashboard/page.tsx)) ดึงทุกแถวตลอดกาลทั้งที่กราฟใช้แค่ 6 เดือน

- [ ] **Step 1: จดตัวเลขบน dashboard ก่อนแก้ (baseline ที่ต้องไม่เปลี่ยน)**

รัน `npm run dev` ล็อกอิน `admin@example.com` เปิด `/dashboard` แล้วจด: ยอดหลักฐานรวม, จำนวนไฟล์, จำนวนรีวิว, ค่าเฉลี่ยคะแนนประเมิน, แท่งกราฟความพร้อมต่อมาตรฐาน (standardCode → ready/total), และยอด PA (ครู/ผู้บริหาร/ผ่าน/รอ)

- [ ] **Step 2: แทน query `evidenceForAgg` ด้วย groupBy**

ในบล็อก `Promise.all` แทนรายการที่ 5 (บรรทัด 65-72):

```tsx
    prisma.evidence.findMany({
      where: { schoolId: { in: schoolIds }, del: false },
      include: {
        indicator: {
          include: { standard: true },
        },
      },
    }),
```

ด้วย:

```tsx
    prisma.evidence.groupBy({
      by: ['indicatorId', 'status'],
      _count: { _all: true },
      where: { schoolId: { in: schoolIds }, del: false },
    }),
```

แล้วเปลี่ยนชื่อตัวแปรที่รับค่าใน destructuring จาก `evidenceForAgg` เป็น `evidenceByIndicator`

- [ ] **Step 3: แทน query `evaluationRecords` ด้วยสองส่วนที่แคบลง**

ก่อนอื่น **ย้าย** บรรทัด `const now = new Date();` (เดิมอยู่บรรทัด 185 หลัง `Promise.all`) ขึ้นมาไว้เหนือ `const evidenceWhere` แล้วเพิ่มบรรทัดถัดไป:

```tsx
  const now = new Date();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
```

**เหตุผลที่ต้องคำนวณครั้งเดียว:** ถ้าเรียก `new Date()` ซ้ำหลายครั้ง คำขอที่ตกคร่อมเที่ยงคืนสิ้นเดือนจะได้ช่วงเวลาที่ไม่ตรงกันระหว่าง query กับการจัดกลุ่มรายเดือน

จากนั้นแทนรายการที่ 6 ใน `Promise.all` (บรรทัด 73-91) ด้วยสองรายการนี้:

```tsx
    prisma.externalEvaluation.aggregate({
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true },
      _avg: { score: true },
    }),
    prisma.externalEvaluation.findMany({
      where: {
        schoolId: { in: schoolIds },
        evaluationDate: { gte: trendStart },
      },
      select: {
        score: true,
        evaluationDate: true,
        evidence: {
          select: {
            indicator: {
              select: {
                standard: { select: { code: true, nameTh: true } },
              },
            },
          },
        },
      },
    }),
```

แล้วเปลี่ยน destructuring ให้รับสองตัวแปร: `evaluationTotals` และ `recentEvaluations` แทน `evaluationRecords` เดิม

**ข้อควรระวัง:** ลำดับตัวแปรใน destructuring ต้องตรงกับลำดับ query ใน `Promise.all` เป๊ะ — ตรวจซ้ำหลังแก้

- [ ] **Step 4: เพิ่ม query แผนที่ indicatorId → standard**

เพิ่มรายการนี้ต่อท้ายใน `Promise.all` (หลัง `pAAgreement.findMany`) และรับด้วยชื่อ `indicatorStandards`:

```tsx
    prisma.qAIndicator.findMany({
      select: {
        id: true,
        standard: { select: { code: true, nameTh: true } },
      },
    }),
```

- [ ] **Step 5: แก้การคำนวณ readinessData ให้ใช้ผล groupBy**

แทนบล็อก (บรรทัด 128-140):

```tsx
  const byStandardMap = new Map<string, { ready: number; total: number }>();
  for (const ev of evidenceForAgg) {
    const code = ev.indicator?.standard?.code || 'N/A';
    const cur = byStandardMap.get(code) || { ready: 0, total: 0 };
    cur.total += 1;
    if (ev.status === 'READY') cur.ready += 1;
    byStandardMap.set(code, cur);
  }
```

ด้วย:

```tsx
  const standardByIndicatorId = new Map(
    indicatorStandards.map((ind) => [ind.id.toString(), ind.standard])
  );

  const byStandardMap = new Map<string, { ready: number; total: number }>();
  for (const row of evidenceByIndicator) {
    const code = standardByIndicatorId.get(row.indicatorId.toString())?.code || 'N/A';
    const cur = byStandardMap.get(code) || { ready: 0, total: 0 };
    const n = row._count?._all ?? 0;
    cur.total += n;
    if (row.status === 'READY') cur.ready += n;
    byStandardMap.set(code, cur);
  }
```

- [ ] **Step 6: แก้การคำนวณสรุปคะแนนประเมิน**

แทนบล็อก (บรรทัด 152-157):

```tsx
  const totalEvaluations = evaluationRecords.length;
  const scoredEvaluations = evaluationRecords.filter((ev) => ev.score !== null && ev.score !== undefined);
  const evaluationAverageScore =
    scoredEvaluations.length > 0
      ? scoredEvaluations.reduce((sum, ev) => sum + Number(ev.score), 0) / scoredEvaluations.length
      : null;
```

ด้วย:

```tsx
  const totalEvaluations = evaluationTotals._count._all;
  const evaluationAverageScore =
    evaluationTotals._avg.score !== null ? Number(evaluationTotals._avg.score) : null;
```

- [ ] **Step 7: เปลี่ยนสองลูปที่เหลือให้อ่านจาก recentEvaluations และเก็บกวาดตัวแปรวันที่ที่ซ้ำ**

1. ในบล็อกที่สร้าง `evaluationByStandardMap` (บรรทัด 159-176) เปลี่ยน `for (const ev of evaluationRecords)` เป็น `for (const ev of recentEvaluations)`
2. **ลบ** บรรทัด `const now = new Date();` ตัวเดิม (บรรทัด 185) — ย้ายขึ้นไปแล้วใน Step 3 การประกาศซ้ำจะทำให้ tsc ฟ้อง `Cannot redeclare block-scoped variable`
3. **ลบ** บรรทัด `const minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);` — `trendStart` ทำหน้าที่นี้แล้ว
4. ในลูปที่เติม `monthMap` เปลี่ยน `for (const ev of evaluationRecords)` เป็น `for (const ev of recentEvaluations)` และเปลี่ยน `if (date < minDate) continue;` เป็น `if (date < trendStart) continue;`

**หมายเหตุ:** ข้อ 4 เป็นการกรองซ้ำกับที่ query กรองไว้แล้ว — เก็บไว้ได้ ไม่เสียหาย และกันพลาดถ้ามีคนเปลี่ยน `where` ทีหลัง

**หมายเหตุความหมายที่เปลี่ยน:** กราฟ "คะแนนต่อมาตรฐาน" จะสะท้อนเฉพาะ 6 เดือนล่าสุดแทนตลอดกาล ซึ่งสอดคล้องกับกราฟแนวโน้มรายเดือนที่อยู่ข้าง ๆ อยู่แล้ว — ถ้าผู้ใช้ต้องการตลอดกาล ให้เพิ่ม `groupBy` แยกอีกตัว อย่าย้อนกลับไปดึงทุกแถว

- [ ] **Step 8: ตรวจ typecheck + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: ทั้งคู่ exit 0 — error ที่พบบ่อยคือลำดับ destructuring ของ `Promise.all` ไม่ตรง ให้ไล่นับใหม่ทีละตัว

- [ ] **Step 9: เทียบตัวเลขกับ baseline**

รัน `npm run dev` เปิด `/dashboard` ด้วยบัญชีเดิม

Expected: ยอดหลักฐานรวม, จำนวนไฟล์, จำนวนรีวิว, แท่งกราฟความพร้อมต่อมาตรฐาน และยอด PA **ตรงกับที่จดไว้ใน Step 1 ทุกตัว** (ค่าเฉลี่ยคะแนนยังต้องตรงด้วย เพราะ `_avg` คิดจากทุกแถวเหมือนเดิม) — ถ้าตัวใดเปลี่ยน ให้หยุดและหาสาเหตุ อย่า commit

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "perf(dashboard): aggregate in SQL instead of loading raw rows

เดิมดึง Evidence ทุกแถวพร้อม include เต็มเพื่อไปนับใน JS
และดึง ExternalEvaluation ตลอดกาลทั้งที่กราฟใช้แค่ 6 เดือน"
```

---

### Task 3: ใส่เพดานขนาดไฟล์ก่อนส่งให้ Gemini

**Files:**
- Modify: `lib/ai/gemini.ts:33-42` และ `lib/ai/gemini.ts` ฟังก์ชัน `analyzeEvidenceFile`
- Create: `lib/__tests__/gemini-guard.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `MAX_INLINE_FILE_BYTES: number` (= 15 MB)
  - `assertFileAnalyzable(filePath: string, mimeType: string): void` — โยน `Error` พร้อมข้อความภาษาไทยเมื่อไฟล์ใหญ่เกินหรือชนิดไม่รองรับ
  - `analyzeEvidenceFile()` ลายเซ็นเดิมไม่เปลี่ยน — [app/api/evidence/[id]/analyze/route.ts](../../../app/api/evidence/[id]/analyze/route.ts) ไม่ต้องแก้

**ปัญหาที่กำลังแก้:** [lib/ai/gemini.ts:36](../../../lib/ai/gemini.ts) ใช้ `fs.readFileSync` อ่านทั้งไฟล์แล้วแปลงเป็น base64 (โต 1.33 เท่า) โดยไม่ตรวจขนาดเลย — ระบบรับวิดีโอได้ถึง 1000 MB ([next.config.js](../../../next.config.js) `bodySizeLimit`) การกด "AI วิเคราะห์" บนวิดีโอใหญ่จะทำให้ process ตาย

- [ ] **Step 1: เขียน test ที่ต้องล้มก่อน**

สร้าง `lib/__tests__/gemini-guard.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

const mockStatSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    statSync: mockStatSync,
    readFileSync: vi.fn(() => Buffer.from('x')),
    existsSync: vi.fn(() => true),
  },
  statSync: mockStatSync,
  readFileSync: vi.fn(() => Buffer.from('x')),
  existsSync: vi.fn(() => true),
}));

// mock SDK เพื่อไม่ให้ต้องมี GEMINI_API_KEY ตอนรัน test
// (indicator-mapping ไม่ต้อง mock — เป็นข้อมูลคงที่ ไม่มี side effect ตอน import)
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

let assertFileAnalyzable: typeof import('../ai/gemini').assertFileAnalyzable;
let MAX_INLINE_FILE_BYTES: number;

beforeAll(async () => {
  const mod = await import('../ai/gemini');
  assertFileAnalyzable = mod.assertFileAnalyzable;
  MAX_INLINE_FILE_BYTES = mod.MAX_INLINE_FILE_BYTES;
});

describe('assertFileAnalyzable', () => {
  beforeEach(() => {
    mockStatSync.mockReset();
  });

  it('ควรผ่านสำหรับรูปภาพขนาดปกติ', () => {
    mockStatSync.mockReturnValue({ size: 2 * 1024 * 1024 });
    expect(() => assertFileAnalyzable('/tmp/a.png', 'image/png')).not.toThrow();
  });

  it('ควรผ่านสำหรับ PDF ขนาดปกติ', () => {
    mockStatSync.mockReturnValue({ size: 1024 });
    expect(() => assertFileAnalyzable('/tmp/a.pdf', 'application/pdf')).not.toThrow();
  });

  it('ควรปฏิเสธไฟล์ที่ใหญ่เกินเพดาน', () => {
    mockStatSync.mockReturnValue({ size: MAX_INLINE_FILE_BYTES + 1 });
    expect(() => assertFileAnalyzable('/tmp/big.png', 'image/png')).toThrow(/ใหญ่เกิน/);
  });

  it('ควรปฏิเสธวิดีโอซึ่งไม่รองรับการส่งแบบ inline', () => {
    mockStatSync.mockReturnValue({ size: 1024 });
    expect(() => assertFileAnalyzable('/tmp/v.mp4', 'video/mp4')).toThrow(/ไม่รองรับ/);
  });

  it('ควรปฏิเสธเมื่ออ่านขนาดไฟล์ไม่ได้', () => {
    mockStatSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(() => assertFileAnalyzable('/tmp/missing.png', 'image/png')).toThrow(/ไม่พบไฟล์/);
  });

  it('เพดานต้องไม่เกิน 20MB ซึ่งเป็นขีดจำกัดของ Gemini inline data', () => {
    expect(MAX_INLINE_FILE_BYTES).toBeLessThanOrEqual(20 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: รัน test ยืนยันว่าล้ม**

```bash
npx vitest run lib/__tests__/gemini-guard.test.ts
```

Expected: FAIL — `assertFileAnalyzable is not a function`

- [ ] **Step 3: เพิ่ม guard ใน lib/ai/gemini.ts**

แทนฟังก์ชัน `fileToBase64Part` (บรรทัด 33-42) ด้วย:

```ts
/** เพดานขนาดไฟล์ที่ส่ง inline ให้ Gemini — ต่ำกว่าขีดจำกัด ~20MB ของ API เผื่อ overhead ของ base64 + prompt */
export const MAX_INLINE_FILE_BYTES = 15 * 1024 * 1024;

/** ชนิดไฟล์ที่ส่ง inline ได้ — วิดีโอต้องผ่าน Files API ซึ่งยังไม่รองรับในระบบนี้ */
const INLINE_ANALYZABLE_MIME_PREFIXES = ['image/'];
const INLINE_ANALYZABLE_MIME_EXACT = new Set(['application/pdf']);

/**
 * ตรวจว่าไฟล์ส่งให้ Gemini แบบ inline ได้หรือไม่ ก่อนอ่านเข้าหน่วยความจำ
 * โยน Error พร้อมข้อความภาษาไทยเมื่อไม่ผ่าน — ผู้เรียกต้องแปลงเป็น response ให้ผู้ใช้
 */
export function assertFileAnalyzable(filePath: string, mimeType: string): void {
  const normalized = (mimeType || '').toLowerCase();
  const supported =
    INLINE_ANALYZABLE_MIME_EXACT.has(normalized) ||
    INLINE_ANALYZABLE_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));

  if (!supported) {
    throw new Error(
      `ไม่รองรับการวิเคราะห์ไฟล์ชนิด ${mimeType || 'ไม่ทราบชนิด'} ด้วย AI — รองรับเฉพาะรูปภาพและ PDF`
    );
  }

  let size: number;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    throw new Error('ไม่พบไฟล์สำหรับวิเคราะห์');
  }

  if (size > MAX_INLINE_FILE_BYTES) {
    const limitMb = Math.floor(MAX_INLINE_FILE_BYTES / (1024 * 1024));
    throw new Error(`ไฟล์ใหญ่เกินขีดจำกัดการวิเคราะห์ด้วย AI (สูงสุด ${limitMb} MB)`);
  }
}

function fileToBase64Part(filePath: string, mimeType: string): Part {
  const data = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: data.toString('base64'),
      mimeType,
    },
  };
}
```

- [ ] **Step 4: เรียก guard ใน analyzeEvidenceFile**

ในฟังก์ชัน `analyzeEvidenceFile` แทนบล็อก:

```ts
  const parts: Part[] = [];

  if (fs.existsSync(absolutePath)) {
    parts.push(fileToBase64Part(absolutePath, params.mimeType));
  }
```

ด้วย:

```ts
  const parts: Part[] = [];

  if (fs.existsSync(absolutePath)) {
    assertFileAnalyzable(absolutePath, params.mimeType);
    parts.push(fileToBase64Part(absolutePath, params.mimeType));
  }
```

- [ ] **Step 5: รัน test ยืนยันว่าผ่าน**

```bash
npx vitest run lib/__tests__/gemini-guard.test.ts
```

Expected: PASS — `Tests 6 passed (6)`

- [ ] **Step 6: ทำให้ route คืนข้อความที่ผู้ใช้อ่านรู้เรื่องแทน 500**

ใน `app/api/evidence/[id]/analyze/route.ts` ครอบบล็อกที่เรียก `analyzeEvidenceFile` (บรรทัด 64-69) ด้วย try/catch:

```ts
      if (filePathForAnalysis) {
        try {
          result = await analyzeEvidenceFile({
            filePath: filePathForAnalysis,
            mimeType: firstFile!.mimeType ?? 'application/octet-stream',
            title: evidence.title,
            description: evidence.description ?? undefined,
          });
        } catch (error) {
          console.error('[api/evidence/analyze] file analysis rejected:', error);
          const message =
            error instanceof Error ? error.message : 'ไม่สามารถวิเคราะห์ไฟล์นี้ได้';
          return NextResponse.json({ error: message }, { status: 422 });
        }
      } else if (firstFile?.externalUrl) {
```

- [ ] **Step 7: ตรวจ typecheck + build + test ทั้งชุด**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Expected: tsc exit 0 · vitest `Test Files 5 passed (5)` / `Tests 37 passed (37)` · build exit 0

- [ ] **Step 8: ทดสอบด้วยมือ**

รัน `npm run dev` สร้างหลักฐานที่แนบวิดีโอ แล้วกด "AI วิเคราะห์"

Expected: ได้ข้อความ "ไม่รองรับการวิเคราะห์ไฟล์ชนิด video/mp4 ด้วย AI — รองรับเฉพาะรูปภาพและ PDF" และ dev server ไม่ล่ม (เดิมจะพยายามอ่านไฟล์ทั้งก้อนเข้าหน่วยความจำ)

- [ ] **Step 9: Commit**

```bash
git add lib/ai/gemini.ts lib/__tests__/gemini-guard.test.ts "app/api/evidence/[id]/analyze/route.ts"
git commit -m "fix(ai): guard file size and mime before inline Gemini upload

readFileSync อ่านทั้งไฟล์เข้าหน่วยความจำโดยไม่ตรวจขนาดเลย
ทั้งที่ระบบรับวิดีโอได้ถึง 1000MB — กด AI วิเคราะห์แล้ว process ตาย"
```

---

## เกณฑ์ปิดแผน

- [ ] `/evidence?level=BASIC` แสดงยอดตรงกับ SQL ใน Task 1 Step 1 และเปลี่ยนหน้าได้
- [ ] ตัวเลขทุกตัวบน `/dashboard` ตรงกับ baseline ก่อนแก้
- [ ] กด "AI วิเคราะห์" บนวิดีโอ → ได้ 422 พร้อมข้อความภาษาไทย ไม่ใช่ process ตาย
- [ ] `npx vitest run` → 5 files / 37 tests
- [ ] `npm run build` exit 0
