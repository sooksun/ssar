# นโยบาย สพฐ — กรอกข้อมูลจาก policy.pdf

## ตาราง

- **ตาราง:** `obecpolicy` (สร้างด้วย `docs/PROJECT_ADD_TABLES.sql`)
- **ฟิลด์:** `fiscalYear`, `code`, `nameTh`, `descriptionTh`, `sortNo`

## สร้าง/อัปเดตนโยบายจาก docref/policy.pdf (แนะนำ)

รันสคริปต์เพื่อดึงข้อความจาก PDF แล้วอัปเดตทั้งไฟล์ SQL และตารางใน DB:

```bash
# สร้างไฟล์ SQL + อัปเดตตาราง (ปีงบประมาณ default 2568)
npm run db:seed-obec-policy

# เฉพาะสร้างไฟล์ SQL ไม่เขียน DB
node scripts/seed-obec-from-pdf.mjs --sql-only

# ระบุปีงบประมาณ
node scripts/seed-obec-from-pdf.mjs --fiscal-year=2567
```

- ถ้า PDF มีข้อความที่ดึงได้ สคริปต์จะแยกรายการนโยบาย (นโยบายที่ N, ข้อ N, 1. ...) อัตโนมัติ
- ถ้า PDF เป็นภาพ/สแกน จะใช้รายการค่าเริ่มต้น (นโยบายที่ 1–5 + Quick Win) และเขียนลง `docs/OBEC_POLICY_SEED.sql` กับตาราง

**หมายเหตุ:** ต้องสร้างตาราง `obecpolicy` ก่อน (รัน `docs/PROJECT_ADD_TABLES.sql`)

## ข้อมูลเริ่มต้น (มือ)

- **ไฟล์ seed:** `docs/OBEC_POLICY_SEED.sql`  
  มีคำสั่ง INSERT ตัวอย่างสำหรับปี 2567 และ 2568

## วิธีกรอกข้อมูลจาก docref/policy.pdf ด้วยมือ

1. เปิด **docref/policy.pdf** ดูรายการนโยบายและจุดเน้นแต่ละข้อ
2. เปิด **docs/OBEC_POLICY_SEED.sql**
3. แก้ไขแต่ละแถว INSERT ให้ตรงกับ PDF:
   - **code** — รหัส/เลขข้อ (เช่น `นโยบายที่ 1`, `ข้อ 1`)
   - **nameTh** — ชื่อนโยบายตามใน PDF
   - **descriptionTh** — คำอธิบาย (ถ้ามี) หรือ `NULL`
   - **sortNo** — ลำดับแสดง (1, 2, 3, ...)
4. เพิ่มหรือลบแถวให้ตรงจำนวนข้อใน PDF
5. รัน SQL ใน MySQL:
   ```bash
   mysql -u USER -p DATABASE < docs/OBEC_POLICY_SEED.sql
   ```
   หรือเปิดใน phpMyAdmin / MySQL Workbench แล้ว Execute

## หมายเหตุ

- ถ้า PDF มีหลายปีงบประมาณ ให้เพิ่มชุด INSERT สำหรับแต่ละปี (แก้ `fiscalYear`)
- ใช้ `ON DUPLICATE KEY UPDATE` ใน seed แล้ว จึงรันซ้ำได้เพื่ออัปเดตชื่อ/คำอธิบาย
