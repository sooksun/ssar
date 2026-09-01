# แผนปรับปรุง QA Evidence Center — ชุดวันที่ 21 ก.ค. 2569

แผนชุดนี้มาจากผลตรวจ `/codestatus` (ความสมบูรณ์รวม **56%**) ครอบคลุมงานระดับ **Critical + Important ทั้ง 13 รายการ** แบ่งเป็น 5 แผนย่อยตาม subsystem — แต่ละแผนจบในตัวเอง ทดสอบได้เอง และ review แยกกันได้

## ลำดับการรัน (สำคัญ — มี dependency จริง)

| # | แผน | ทำไมต้องอยู่ลำดับนี้ | Task | ระดับ |
|---|---|---|---|---|
| 1 | [05 — Infra & Test Hygiene](2026-07-21-05-infra-test-hygiene.md) | ต้องเลิก gitignore `prisma/migrations` **ก่อน** แผน 03 สร้าง migration ใหม่ และต้องทำให้ vitest นับไม่ซ้ำก่อน เพื่อให้ทุกแผนใช้ตัวเลข test เป็นเกณฑ์ได้ | 2 | Critical + Important |
| 2 | [01 — Security Hardening](2026-07-21-01-security-hardening.md) | ปิดช่องโหว่ที่เปิดอยู่จริงก่อนงานอื่นทั้งหมด และสร้าง `lib/auth/guards.ts` ที่แผน 02 ต่อยอด | 3 | Critical |
| 3 | [02 — Scoping & Data Isolation](2026-07-21-02-scoping-data-isolation.md) | ต่อยอด `guards.ts` จากแผน 01 · ต้องเสร็จก่อนแผน 04 เพราะแผน 04 สมมติว่าทุกหน้าได้ `schoolIds` จาก `requireSchoolScope()` แล้ว | 2 | Critical + Important |
| 4 | [03 — Database Integrity](2026-07-21-03-database-integrity.md) | สร้าง migration ใหม่ 2 ชุด — ต้องมาหลังแผน 05 | 2 | Important |
| 5 | [04 — Performance & Correctness](2026-07-21-04-performance-correctness.md) | แก้ query ที่ต้องอิง scoping ที่ถูกต้องจากแผน 02 | 3 | Important |

## แผนที่งาน → รายการจากรายงาน `/codestatus`

| รายการในรายงาน | อยู่ในแผน |
|---|---|
| 1. serve-upload ไม่มี auth + traversal check อ่อน | 01 · Task 1 |
| 2. Next.js 15.5.6 มี CVE critical + middleware bypass | 01 · Task 3 |
| 3. migration ไม่อยู่ใน git + Docker ไม่มีขั้น migrate | 05 · Task 1 |
| 4. `where: undefined` ทำให้เห็นข้อมูลทุกโรงเรียน | 02 · Task 1 |
| 5. 9 หน้า RSC ข้าม `getUserSchools()` | 02 · Task 1 + Task 2 |
| 6. 8 หน้า admin/setup พึ่ง middleware ชั้นเดียว | 01 · Task 2 |
| 7. Evidence list กรอง level ใน JS + ไม่มี pagination | 04 · Task 1 |
| 8. Dashboard ดึงแถวดิบทั้งหมดมารวมยอดใน JS | 04 · Task 2 |
| 9. Gemini อ่านไฟล์ทั้งก้อนเข้า RAM ไม่ตรวจขนาด | 04 · Task 3 |
| 10. serve-upload ไม่ stream / ไม่รองรับ Range | 01 · Task 1 (รวมกับข้อ 1 เพราะเป็นไฟล์เดียวกัน) |
| 11. AuditLog ไม่มี index เลย | 03 · Task 2 |
| 12. `nextEvidenceCode` ออกรหัสซ้ำหลัง soft delete | 03 · Task 1 |
| 13. vitest นับ test ซ้ำ 3 เท่า + `.claude/` ไม่ถูก gitignore | 05 · Task 2 |

## เส้นทางจำนวน test ที่คาดหวัง

ใช้ตรวจว่าแต่ละแผนเพิ่มการทดสอบเข้ามาจริง

| หลังแผน | ไฟล์ | จำนวน test | ที่เพิ่ม |
|---|---|---|---|
| ก่อนเริ่ม | 6 | 51 | (นับซ้ำจาก worktree) |
| 05 | 2 | 17 | ตัวเลขจริงหลังเลิกนับซ้ำ |
| 01 | 3 | 28 | `uploads-authz.test.ts` (+11) |
| 02 | 4 | 31 | `guards.test.ts` (+3) |
| 03 | 4 | 31 | เขียนเคส `nextEvidenceCode` ใหม่ 7 เคส (ยอดรวมเท่าเดิม) |
| 04 | 5 | 37 | `gemini-guard.test.ts` (+6) |

## สิ่งที่ **ไม่อยู่** ในแผนชุดนี้

รายการ Nice-to-have 6 ข้อจากรายงานยังเป็น backlog — ทำเมื่อ 5 แผนข้างบนจบแล้ว

- completeness นับหลักฐานผ่าน `indicatorCodes` + กรองตาม level ([lib/indicators/completeness.ts:76](../../../lib/indicators/completeness.ts))
- เพิ่ม `error.tsx` / `loading.tsx` (ตอนนี้ทั้งโปรเจกต์ไม่มีเลยสักไฟล์)
- Zod ใน 25 API route ที่เหลือ + เลิกคืน `err.message` ดิบให้ client
- pagination ใน `getProjectList` / PA / audit
- เติม `GEMINI_API_KEY` · `UPLOAD_DIR` · `PUBLIC_UPLOAD_DIR` ใน `.env.example` และเลิก track `.env.backup`
- `next/dynamic` สำหรับ recharts/antd + rate limit หน้า login

รวมถึงงานอัปเกรด major ทั้งหมด (Prisma 7, Next.js 16, Zod 4, Tailwind 4, Vitest 4, recharts 3, ESLint 10, bcryptjs 3, Node 22) — ดูตารางในรายงาน `/codestatus` ประกอบ
