# บันทึกการสอนชุมชน (ภาคเรียนละ 1 ฉบับต่อคน)

## ฐานข้อมูล

สร้างตาราง `communityteachingrecord` (ถ้ายังไม่มี):

```bash
mysql -h 127.0.0.1 -u YOUR_DB_USER -p YOUR_DB_NAME < docs/EXTRA_COMMUNITY_TEACHING_TABLE.sql
```

หรือเปิด `docs/EXTRA_COMMUNITY_TEACHING_TABLE.sql` ใน phpMyAdmin แล้ว Execute

## โฟลเดอร์อัปโหลด

- Dockerfile มีการสร้าง `public/uploads/community-teaching` อยู่แล้ว
- ถ้า deploy แบบ mount volume ให้รวมโฟลเดอร์นี้ใน volume ของ `public/uploads` (เช่น `./public/uploads:/app/public/uploads`) เพื่อให้มีสิทธิ์เขียน

## Template (pp5.pdf)

เพื่อให้ลิงก์ "ดาวน์โหลดแบบฟอร์ม template (pp5.pdf)" ในหน้ารายการทำงาน:

- วางไฟล์ **pp5.pdf** ที่ `public/docref/pp5.pdf` (หรือ copy จาก `docref/pp5.pdf` ไปที่ `public/docref/pp5.pdf`)
- ถ้าไม่วาง ลิงก์จะ 404 แต่การกรอกข้อมูลและอัปโหลด/แนบลิงก์ยังใช้ได้ตามปกติ
