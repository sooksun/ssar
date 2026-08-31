# Migration baseline — ต้องทำครั้งเดียวกับฐานข้อมูลที่มีอยู่แล้ว

## ปัญหาที่แก้

ก่อนหน้านี้ `prisma migrate deploy` บนฐานข้อมูลใหม่ **สร้าง schema ที่ไม่ตรงกับ `schema.prisma`** เพราะ:

1. **ลำดับ migration ผิด** — โฟลเดอร์ `20250304000000_add_pateacherdocument_project_tables`
   มี timestamp เป็นเดือน มี.ค. 2025 ซึ่งเรียงตามตัวอักษรแล้วมาก่อน `20251106140555_init`
   → รันก่อนตาราง `school` ถูกสร้าง → ล้มด้วย `Failed to open the referenced table 'school'`
   และอีก 3 โฟลเดอร์ (`add_pa_tables`, `add_lesson_plan_fields`,
   `prd_evidence_development_summary`) ไม่มี timestamp prefix เลย
2. **ตาราง/คอลัมน์จำนวนหนึ่งไม่เคยอยู่ใน migration** — ถูกเพิ่มเข้า DB ด้วย raw SQL นอกระบบ
   migration ได้แก่ตาราง `educationservicearea`, `userarearole`, `evidenceindicatormapping`,
   `teachersardocument`, `teacheridplan`, `communityteachingrecord` และคอลัมน์
   `evidence.aiSummary` / `aiKeywords` / `aiQualityCheck` / `aiSuggestions` /
   `indicatorCodes` / `evidenceType` / `pdpaChecked` / `pdpaRiskLevel`

ผลคือ container ที่ deploy ใหม่ (`docker-entrypoint.sh` รัน `prisma migrate deploy`)
ได้ฐานข้อมูลที่ขาด 6 ตาราง — ระบบสิทธิ์ระดับเขตและโปรแกรมเสริมจะพังทันทีที่ query

## สิ่งที่เปลี่ยน

| เดิม | ใหม่ |
|---|---|
| `add_pa_tables` | `20251116000100_add_pa_tables` |
| `prd_evidence_development_summary` | `20251116000200_prd_evidence_development_summary` |
| `add_lesson_plan_fields` | `20251116000300_add_lesson_plan_fields` |
| `20250304000000_add_pateacherdocument_project_tables` | `20251116000400_add_pateacherdocument_project_tables` |
| — | `20251116000500_add_evidence_list_indexes` (ใหม่) |
| — | `20251116000600_reconcile_schema_with_migrations` (ใหม่) |

ชื่อใหม่เรียงตามลำดับที่ migration ถูกใช้จริง (ตรวจจาก `_prisma_migrations.started_at`)

## ฐานข้อมูลใหม่ (dev เครื่องใหม่ / staging / prod ใหม่)

ไม่ต้องทำอะไรเพิ่ม — `prisma migrate deploy` ทำงานได้ตรงแล้ว ยืนยันได้ด้วย:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

ต้องได้ `No difference detected.`

## สคริปต์ช่วย (แนะนำให้ใช้แทนการรัน SQL เอง)

`scripts/prod-baseline.mjs` ทำขั้นที่ 1 ให้ พร้อมตรวจความเสี่ยงก่อนเสมอ
อ่าน `DATABASE_URL` จาก environment — ไม่ต้องใส่รหัสผ่านใน argument

```bash
export DATABASE_URL="mysql://<user>:<pass>@192.168.1.4:3306/qa_external?schema=public&authPlugin=mysql_native_password"
```

```bash
node scripts/prod-baseline.mjs
```

รายงานที่ได้: ต่อกับฐานไหน · จำนวนตาราง · สถานะ `_prisma_migrations` ·
แผนว่าจะลบ/rename กี่แถว · และ**ตรวจความเสี่ยงข้อมูลถูกตัด**โดยอ่านจาก
`prisma migrate diff` จริง (ไม่ใช่รายชื่อตายตัว) — ถ้าเจอคอลัมน์ที่จะโดนบีบเป็น
`VARCHAR(n)` ทั้งที่มีข้อมูลยาวกว่านั้น สคริปต์จะ**ปฏิเสธไม่ยอมทำงานต่อ**

เมื่อ dry run ดูโอเคแล้ว และ**สำรองฐานข้อมูลทั้งก้อนแล้ว**:

```bash
docker run --rm mariadb:11 mariadb-dump -h 192.168.1.4 -u <user> -p<pass> qa_external > backup-$(date +%F).sql
```

```bash
node scripts/prod-baseline.mjs --apply --i-have-a-backup
```

สคริปต์แตะเฉพาะตาราง `_prisma_migrations` เท่านั้น ไม่ CREATE/ALTER/DROP ตารางข้อมูลใด ๆ
และรันซ้ำได้ปลอดภัย (idempotent) จากนั้นทำขั้นที่ 2–5 ต่อตามด้านล่าง

---

## ฐานข้อมูลที่มีอยู่แล้ว (dev เครื่องเดิม + prod ปัจจุบัน) — ต้องทำก่อน deploy รอบถัดไป

ฐานข้อมูลเหล่านี้มีตารางครบอยู่แล้ว และมี `_prisma_migrations` บันทึกด้วย **ชื่อเดิม**
ถ้า deploy ทับโดยไม่ทำขั้นตอนนี้ `migrate deploy` จะพยายามรัน migration ที่ "หายไป" ซ้ำ แล้วล้ม

### 1. เปลี่ยนชื่อ record ใน `_prisma_migrations` ให้ตรงกับโฟลเดอร์ใหม่

ตรวจสถานะปัจจุบันก่อน — สนใจเฉพาะแถวที่ `finished_at IS NOT NULL AND rolled_back_at IS NULL`:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations ORDER BY started_at;
```

**สำคัญ:** บาง DB มีแถวที่ rolled back ค้างอยู่ (เช่น `prd_evidence_development_summary`
ที่ dev มี 3 แถว — สำเร็จ 1 rolled back 2) ถ้า rename ทั้งหมดจะได้แถวชื่อซ้ำกัน
จึงต้องลบแถวที่ rolled back ทิ้งก่อน:

```sql
-- 1a. ลบแถวที่ rollback ไปแล้ว (ไม่มีผลกับ schema — steps = 0)
DELETE FROM _prisma_migrations
  WHERE rolled_back_at IS NOT NULL
    AND migration_name IN (
      'add_pa_tables',
      'prd_evidence_development_summary',
      'add_lesson_plan_fields',
      '20250304000000_add_pateacherdocument_project_tables'
    );

-- 1b. rename เฉพาะแถวที่สำเร็จจริง
UPDATE _prisma_migrations SET migration_name = '20251116000100_add_pa_tables'
  WHERE migration_name = 'add_pa_tables' AND finished_at IS NOT NULL;
UPDATE _prisma_migrations SET migration_name = '20251116000200_prd_evidence_development_summary'
  WHERE migration_name = 'prd_evidence_development_summary' AND finished_at IS NOT NULL;
UPDATE _prisma_migrations SET migration_name = '20251116000300_add_lesson_plan_fields'
  WHERE migration_name = 'add_lesson_plan_fields' AND finished_at IS NOT NULL;
UPDATE _prisma_migrations SET migration_name = '20251116000400_add_pateacherdocument_project_tables'
  WHERE migration_name = '20250304000000_add_pateacherdocument_project_tables'
    AND finished_at IS NOT NULL;
```

ตรวจว่าไม่มีชื่อซ้ำหลงเหลือ (ต้องได้ 0 แถว):

```sql
SELECT migration_name, COUNT(*) c FROM _prisma_migrations
GROUP BY migration_name HAVING c > 1;
```

### 2. Baseline migration ที่ปรับ schema ให้ตรงกัน (ตารางมีอยู่แล้ว ไม่ต้องรัน SQL ซ้ำ)

```bash
npx prisma migrate resolve --applied 20251116000600_reconcile_schema_with_migrations
```

### 3. index ใหม่ — ปล่อยให้ `migrate deploy` รันตามปกติ

`20251116000500_add_evidence_list_indexes` เป็น `CREATE INDEX` ล้วน ยังไม่เคยถูกใช้กับ DB ใด
จึงต้องให้รันจริง **ห้าม** `migrate resolve --applied` กับ migration นี้

### 4. ตรวจผล — และคาดว่าจะยังเหลือ drift

```bash
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

`migrate status` จะได้ `Database schema is up to date!` แต่ **diff มักจะยังไม่ว่าง**

ตอนทำกับ DB dev (`qa_external`) จริงพบว่าขาด 3 ตาราง — `teachersardocument`,
`teacheridplan`, `communityteachingrecord` (โปรแกรมเสริม SAR / ID plan / การสอนชุมชน
จะพังตอน query) เพราะ raw SQL ที่เคยรันไม่ครบทุกตัว **prod น่าจะเจอแบบเดียวกันหรือมากกว่า**

### 5. ปิด drift ที่เหลือ (ถ้ามี)

สร้าง SQL จาก diff แล้ว **อ่านก่อนรันเสมอ**:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script > /tmp/devfix.sql
```

ตรวจ 2 อย่างก่อนรัน — ถ้าเจอ **ห้ามรันทันที**:

```bash
grep -cE '^DROP TABLE|DROP COLUMN' /tmp/devfix.sql   # ต้องได้ 0
grep -cE 'MODIFY '                 /tmp/devfix.sql   # ต้องได้ 0
```

`MODIFY` อันตรายเพราะ Prisma จะเสนอบีบคอลัมน์ `TEXT` ให้เหลือ `VARCHAR(191)` ตาม
`schema.prisma` ซึ่ง**ตัดข้อมูลทิ้ง** ถ้าเจอ ให้ตรวจความยาวข้อมูลจริงก่อน:

```sql
SELECT MAX(CHAR_LENGTH(<column>)), SUM(CHAR_LENGTH(<column>) > 191) FROM <table>;
```

ถ้ามีแถวเกิน 191 แปลว่า **`schema.prisma` ผิด ไม่ใช่ DB** — ให้เติม `@db.Text` ใน schema
แล้ว generate diff ใหม่ (เคสนี้เกิดจริงกับ `PAIndicator.description` ที่มีข้อมูลยาว 620
และ enum `PAPositionType` ที่ DB มีค่า `ASSISTANT_TEACHER` แต่ schema ไม่มี — แก้ใน schema แล้ว)

เมื่อ SQL สะอาดแล้ว:

```bash
npx prisma db execute --url "$DATABASE_URL" --file /tmp/devfix.sql
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

ต้องได้ `No difference detected.`

> **backup ก่อนทำกับ prod เสมอ** — `mariadb-dump` ทั้ง database ไม่ใช่แค่ `_prisma_migrations`

## กติกาต่อจากนี้

เปลี่ยน schema ทุกครั้งให้ผ่าน `npm run db:migrate` (prisma migrate dev) เท่านั้น
**ห้าม** เพิ่มตาราง/คอลัมน์ด้วย raw SQL นอก migration อีก — นั่นคือต้นเหตุของปัญหานี้
