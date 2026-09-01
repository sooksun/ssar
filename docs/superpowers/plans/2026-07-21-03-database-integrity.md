# Database Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หยุดการสร้างรหัสหลักฐานซ้ำ และทำให้ตาราง AuditLog ค้นได้โดยไม่สแกนทั้งตาราง

**Architecture:** `nextEvidenceCode()` ปัจจุบันนับจำนวนแถวที่ `del: false` แล้ว +1 — พอมีการ soft delete จำนวนจะลดลงและรหัสถัดไปจะชนกับรหัสที่ออกไปแล้ว วิธีแก้คือหา "เลขที่สูงสุดที่เคยออก" แทนการนับ (นับรวมแถวที่ถูกลบด้วย) แล้วเสริมด้วย unique constraint ที่ฐานข้อมูลเป็นตาข่ายกันพลาด ส่วน AuditLog เพิ่ม index ให้ตรงกับ query ที่หน้า audit ใช้จริง

**Tech Stack:** Prisma 6.19 (MySQL), Vitest 2.1

## Global Constraints

- ต้องรันแผน `2026-07-21-05-infra-test-hygiene.md` ให้จบก่อน — ไม่งั้น migration ที่สร้างในแผนนี้จะถูก gitignore
- Migration ต้องสร้างผ่าน `npx prisma migrate dev --name <ชื่อ>` เท่านั้น ห้ามเขียน SQL เข้า `prisma/migrations/` ด้วยมือ
- ห้ามแก้ migration ที่มีอยู่แล้ว 18 ชุด — เพิ่มใหม่อย่างเดียว
- `evidenceCode` เป็น `String?` (nullable) — unique constraint ต้องยอมให้มีหลายแถวเป็น `NULL` ได้ (MySQL ทำแบบนี้อยู่แล้ว) ห้ามเปลี่ยนเป็น `NOT NULL`
- ตามที่ [CLAUDE.md](../../../CLAUDE.md) ระบุ: `Evidence.fiscalYear` ถูกใช้เก็บค่า **academicYear** ในเส้นทางของ `nextEvidenceCode` — รักษาพฤติกรรมนี้ไว้ ห้ามเปลี่ยนความหมายของฟิลด์ในแผนนี้

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/evidence.ts` (modify) | เปลี่ยน `nextEvidenceCode` จาก count-based เป็น max-based |
| `lib/__tests__/evidence.test.ts` (modify) | test เดิม 14 ตัว mock `count` — ต้องเปลี่ยนเป็น mock `findMany` + เพิ่มเคสรหัสซ้ำ |
| `prisma/schema.prisma` (modify) | `@@unique` บน Evidence, `@@index` บน AuditLog |
| `prisma/migrations/<ts>_evidence_code_unique/` (generate) | migration ของ unique constraint |
| `prisma/migrations/<ts>_auditlog_indexes/` (generate) | migration ของ index |

---

### Task 1: แก้ nextEvidenceCode ไม่ให้ออกรหัสซ้ำ

**Files:**
- Modify: `lib/evidence.ts:35-60`
- Modify: `lib/__tests__/evidence.test.ts:1-33` (ส่วน mock) และเคสทดสอบ `nextEvidenceCode`
- Modify: `prisma/schema.prisma:235-238` (บล็อก `@@index` ของ model Evidence)

**Interfaces:**
- Consumes: `prisma.qAIndicator.findUnique`, `prisma.evidence.findMany`
- Produces: `nextEvidenceCode(indicatorId: bigint, academicYear: number): Promise<string>` — ลายเซ็นเดิมไม่เปลี่ยน ผู้เรียกใน [app/actions/evidence.ts](../../../app/actions/evidence.ts) ไม่ต้องแก้

- [ ] **Step 1: ตรวจว่าฐานข้อมูลปัจจุบันมีรหัสซ้ำอยู่แล้วหรือไม่**

```bash
npx prisma db execute --stdin <<'SQL'
SELECT indicatorId, fiscalYear, evidenceCode, COUNT(*) AS n
FROM evidence
WHERE evidenceCode IS NOT NULL
GROUP BY indicatorId, fiscalYear, evidenceCode
HAVING n > 1;
SQL
```

Expected: ไม่มีแถวคืนมา — **ถ้ามีแถวคืนมา ให้หยุดและรายงานผู้ใช้** ต้องตัดสินใจว่าจะแก้ข้อมูลเดิมยังไงก่อน ไม่งั้น migration ใน Step 7 จะล้ม

- [ ] **Step 2: แก้ test ให้สะท้อนพฤติกรรมใหม่ (ต้องล้มก่อน)**

ใน `lib/__tests__/evidence.test.ts` แทนบล็อก mock ด้านบน (บรรทัด 4-21):

```ts
// Mock Prisma Client สำหรับ nextEvidenceCode — ใช้ vi.hoisted เพื่อให้มีค่าก่อน vi.mock ทำงาน
const { mockFindUnique, mockCount } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({
      qAIndicator: {
        findUnique: mockFindUnique,
      },
      evidence: {
        count: mockCount,
      },
    })),
  };
});
```

ด้วย:

```ts
// Mock Prisma Client สำหรับ nextEvidenceCode — ใช้ vi.hoisted เพื่อให้มีค่าก่อน vi.mock ทำงาน
const { mockFindUnique, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({
      qAIndicator: {
        findUnique: mockFindUnique,
      },
      evidence: {
        findMany: mockFindMany,
      },
    })),
  };
});
```

จากนั้นแทน `describe` ของ `nextEvidenceCode` ทั้งบล็อก (ตั้งแต่บรรทัดที่มี `describe('nextEvidenceCode'` จนจบ describe นั้น) ด้วย:

```ts
describe('nextEvidenceCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ควรคืนรหัส -01 เมื่อยังไม่มีหลักฐานของตัวชี้วัดนี้', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-01');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      select: { code: true },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        indicatorId: BigInt(1),
        fiscalYear: 2568,
        evidenceCode: { startsWith: '2.3-' },
      },
      select: { evidenceCode: true },
    });
  });

  it('ควรนับต่อจากเลขสูงสุดที่เคยออก', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-02' },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-03');
  });

  it('ควรไม่ออกรหัสซ้ำแม้รหัสกลางช่วงจะถูกลบไปแล้ว', async () => {
    // สถานการณ์บั๊กเดิม: 01,02,03 ออกไปแล้ว ลบ 02 ทิ้ง (soft delete)
    // count-based จะได้ 2+1 = 03 ซึ่งชนกับที่ออกไปแล้ว
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-02' },
      { evidenceCode: '2.3-03' },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-04');
  });

  it('ควรข้ามรหัสที่รูปแบบไม่ตรงโดยไม่พัง', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([
      { evidenceCode: '2.3-01' },
      { evidenceCode: '2.3-เก่า' },
      { evidenceCode: null },
    ]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-02');
  });

  it('ควรรองรับเลขเกิน 99 โดยไม่ตัดหลัก', async () => {
    mockFindUnique.mockResolvedValue({ code: '2.3' });
    mockFindMany.mockResolvedValue([{ evidenceCode: '2.3-99' }]);

    const result = await nextEvidenceCode(BigInt(1), 2568);

    expect(result).toBe('2.3-100');
  });

  it('ควรใช้ code ของตัวชี้วัดเป็นคำนำหน้า', async () => {
    mockFindUnique.mockResolvedValue({ code: '1.1' });
    mockFindMany.mockResolvedValue([]);

    const result = await nextEvidenceCode(BigInt(5), 2567);

    expect(result).toBe('1.1-01');
  });

  it('ควรโยน error เมื่อไม่พบตัวชี้วัด', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(nextEvidenceCode(BigInt(999), 2568)).rejects.toThrow('Indicator 999 not found');
  });
});
```

- [ ] **Step 3: รัน test ยืนยันว่าล้ม**

```bash
npx vitest run lib/__tests__/evidence.test.ts
```

Expected: FAIL — test ที่คาด `mockFindMany` จะล้มเพราะโค้ดจริงยังเรียก `count`

- [ ] **Step 4: แก้ nextEvidenceCode ใน lib/evidence.ts**

แทนฟังก์ชัน `nextEvidenceCode` ทั้งตัว (บรรทัด 31-60) ด้วย:

```ts
/**
 * สร้างรหัสหลักฐานอัตโนมัติ: ${indicator.code}-${running2digits}
 * ตัวอย่าง: 2.3-01, 2.3-02, ...
 *
 * นับต่อจาก "เลขสูงสุดที่เคยออก" ไม่ใช่จำนวนแถวที่เหลืออยู่
 * เพราะการ soft delete จะทำให้จำนวนลดลงและรหัสถัดไปชนกับรหัสที่ออกไปแล้ว
 * — จึงต้องนับรวมแถวที่ del = true ด้วย
 */
export async function nextEvidenceCode(
  indicatorId: bigint,
  academicYear: number
): Promise<string> {
  const indicator = await prisma.qAIndicator.findUnique({
    where: { id: indicatorId },
    select: { code: true },
  });

  if (!indicator) {
    throw new Error(`Indicator ${indicatorId} not found`);
  }

  const prefix = `${indicator.code}-`;

  const existing = await prisma.evidence.findMany({
    where: {
      indicatorId,
      fiscalYear: academicYear, // ใช้ academicYear แต่เก็บใน field fiscalYear (เพื่อความเข้ากันได้กับฐานข้อมูล)
      evidenceCode: { startsWith: prefix },
    },
    select: { evidenceCode: true },
  });

  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
  let maxNumber = 0;
  for (const row of existing) {
    const matched = row.evidenceCode ? pattern.exec(row.evidenceCode) : null;
    if (!matched) continue;
    const parsed = Number.parseInt(matched[1], 10);
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }

  const runningCode = String(maxNumber + 1).padStart(2, '0');

  return `${prefix}${runningCode}`;
}

/** escape อักขระพิเศษ regex — รหัสตัวชี้วัดมีจุด เช่น "2.3" */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 5: รัน test ยืนยันว่าผ่าน**

```bash
npx vitest run lib/__tests__/evidence.test.ts
```

Expected: PASS — `Tests 14 passed (14)` — ไฟล์นี้มี `describe('thaiAcademicYear')` 7 เคสที่ไม่ถูกแตะ บวก `describe('nextEvidenceCode')` 7 เคสใหม่ที่เขียนแทนของเดิม (ซึ่งก็มี 7 เคสพอดี ยอดรวมจึงเท่าเดิม)

- [ ] **Step 6: เพิ่ม unique constraint ใน schema**

ใน `prisma/schema.prisma` model `Evidence` แทนบล็อกท้าย model:

```prisma
  @@index([schoolId, fiscalYear, indicatorId, status])
  @@index([schoolId, academicYear, indicatorId, status])
  @@map("evidence")
```

ด้วย:

```prisma
  @@unique([indicatorId, fiscalYear, evidenceCode], name: "evidence_code_per_indicator_year")
  @@index([schoolId, fiscalYear, indicatorId, status])
  @@index([schoolId, academicYear, indicatorId, status])
  @@map("evidence")
```

**หมายเหตุ:** `evidenceCode` เป็น nullable — MySQL ยอมให้มีหลายแถวที่คอลัมน์ในดัชนี unique เป็น `NULL` ได้ หลักฐานที่ยังไม่มีรหัสจึงไม่ถูกบล็อก

- [ ] **Step 7: สร้าง migration**

```bash
npx prisma migrate dev --name evidence_code_unique
```

Expected: migration สร้างสำเร็จ ไม่มี error `Duplicate entry` — ถ้าล้มด้วย duplicate ให้ย้อนไป Step 1 (มีข้อมูลซ้ำที่ต้องแก้ก่อน)

- [ ] **Step 8: ยืนยันว่า migration ถูก track ใน git**

```bash
git status --short prisma/migrations
```

Expected: เห็น `?? prisma/migrations/<timestamp>_evidence_code_unique/` — ถ้าไม่เห็น แปลว่าแผน 05 ยังไม่ถูกรัน ให้หยุดและกลับไปทำก่อน

- [ ] **Step 9: ตรวจว่า typecheck + build ผ่าน**

```bash
npx prisma generate
npx tsc --noEmit
npm run build
```

Expected: ทั้งหมด exit 0

- [ ] **Step 10: Commit**

```bash
git add lib/evidence.ts lib/__tests__/evidence.test.ts prisma/schema.prisma prisma/migrations
git commit -m "fix(evidence): derive next code from max issued, not row count

count-based ทำให้ soft delete แล้วรหัสถัดไปชนกับรหัสที่ออกไปแล้ว
เพิ่ม unique constraint เป็นตาข่ายกันพลาดที่ระดับฐานข้อมูล"
```

---

### Task 2: เพิ่ม index ให้ AuditLog

**Files:**
- Modify: `prisma/schema.prisma:473-487` (model AuditLog)
- Modify: `app/admin/audit/page.tsx:51` (ลด payload ของ dropdown)

**Interfaces:**
- Consumes: schema ที่แก้แล้วใน Task 1
- Produces: ไม่มี API ใหม่

**บริบท:** [app/admin/audit/page.tsx:40-53](../../../app/admin/audit/page.tsx) query ด้วย `where.action` และ/หรือ `where.schoolId` แล้ว `orderBy: { createdAt: 'desc' }` — ปัจจุบัน model AuditLog ไม่มี `@@index` เลยแม้แต่ตัวเดียว

- [ ] **Step 1: วัดสถานะก่อนแก้**

```bash
npx prisma db execute --stdin <<'SQL'
EXPLAIN SELECT * FROM auditlog ORDER BY createdAt DESC LIMIT 200;
SQL
```

จดผลไว้ — คาดว่าเห็น `Using filesort` และ `type: ALL`

- [ ] **Step 2: เพิ่ม index ใน schema**

ใน `prisma/schema.prisma` model `AuditLog` แทนบรรทัด:

```prisma
  @@map("auditlog")
```

ด้วย:

```prisma
  @@index([createdAt])
  @@index([schoolId, createdAt])
  @@index([action, createdAt])
  @@index([actorId, createdAt])
  @@map("auditlog")
```

**เหตุผลของแต่ละตัว:** `createdAt` รองรับหน้า audit แบบไม่กรอง · `schoolId, createdAt` และ `action, createdAt` ตรงกับ 2 ตัวกรองที่หน้านั้นมีให้ · `actorId, createdAt` รองรับการสืบกิจกรรมรายบุคคลซึ่งเป็นการใช้งานหลักของ audit log

- [ ] **Step 3: สร้าง migration**

```bash
npx prisma migrate dev --name auditlog_indexes
```

Expected: สร้างสำเร็จ — ตาราง audit ขนาดเล็กในเครื่อง dev จะเสร็จเร็ว

- [ ] **Step 4: วัดผลหลังแก้**

```bash
npx prisma db execute --stdin <<'SQL'
EXPLAIN SELECT * FROM auditlog ORDER BY createdAt DESC LIMIT 200;
SQL
```

Expected: ไม่มี `Using filesort` แล้ว และคอลัมน์ `key` ขึ้นชื่อ index ของ `createdAt`

**หมายเหตุ:** ถ้าตารางในเครื่อง dev มีข้อมูลน้อยมาก MySQL อาจเลือก full scan อยู่ดีเพราะถูกกว่า — กรณีนั้นให้ตรวจแค่ว่าคอลัมน์ `possible_keys` มี index ใหม่ปรากฏ ถือว่าผ่าน

- [ ] **Step 5: ลด payload ของ dropdown ในหน้า audit**

ใน `app/admin/audit/page.tsx` แทนบล็อก:

```tsx
    prisma.school.findMany({
      where: { del: false },
      orderBy: { name: 'asc' },
    }),
```

ด้วย:

```tsx
    prisma.school.findMany({
      where: { del: false },
      orderBy: { name: 'asc' },
      select: { sc_id: true, name: true },
    }),
```

- [ ] **Step 6: ตรวจว่า build ผ่าน**

```bash
npx prisma generate
npx tsc --noEmit
npm run build
```

Expected: ทั้งหมด exit 0 — ถ้า tsc ฟ้องว่าหน้า audit ใช้ field ของ school ที่ไม่ได้ select ให้เพิ่ม field นั้นเข้า `select` (ไม่ใช่ลบ `select` ทิ้ง)

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations app/admin/audit/page.tsx
git commit -m "perf(audit): add indexes matching audit page query shape

AuditLog ไม่มี index เลย ทำให้ ORDER BY createdAt เป็น full scan + filesort
บนตารางที่โตขึ้นเรื่อย ๆ"
```

---

## เกณฑ์ปิดแผน

- [ ] `npx vitest run` → 4 files / 31 tests (จำนวนเท่าเดิม แต่เคส `nextEvidenceCode` เปลี่ยนเป็นแบบใหม่)
- [ ] `EXPLAIN` บน auditlog ไม่ขึ้น `Using filesort` (หรืออย่างน้อยมี index ใน `possible_keys`)
- [ ] มี migration ใหม่ 2 ชุดใน git
- [ ] `npm run build` exit 0
