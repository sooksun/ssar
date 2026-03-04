# การ deploy ฟีเจอร์ PA 1/ส, PA 2/ส, PA 3/ส (ผูกกับครู)

## สิ่งที่เปลี่ยน

- บันทึก PA 1/ส, PA 2/ส, PA 3/ส **ครู 1 คน บันทึก 1 ครั้งต่อปีการศึกษา ต่อโรงเรียน**
- ผูกกับ **ครู (ผู้ใช้ที่ล็อกอิน)** + **ปีการศึกษา** + **โรงเรียน**

## ขั้นตอนบนเซิร์ฟเวอร์

### 1. อัปเดตฐานข้อมูล (ต้องทำก่อนหรือพร้อม deploy)

ถ้าตาราง `pateacherdocument` **มีอยู่แล้ว** (สร้างจากเวอร์ชันเก่า) ต้องรัน SQL เพิ่มคอลัมน์ `userId`:

```bash
mysql -u USER -p DATABASE < docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql
```

หรือเปิด `docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql` ใน phpMyAdmin แล้ว Execute

- ถ้าไม่รัน: แอปจะ error ตอนบันทึก/โหลด PA ครู (ตารางไม่มีคอลัมน์ `userId`)

### 2. Deploy โค้ด

```bash
cd /DATA/AppData/www/ssar   # หรือ path โปรเจกต์
git pull
docker compose build
docker compose up -d
```

## คำสั่งรันบนเซิร์ฟเวอร์ (สรุป)

```bash
cd /DATA/AppData/www/ssar   # หรือ path โปรเจกต์บนเซิร์ฟเวอร์

# 1. อัปเดต DB (ถ้าตาราง pateacherdocument มีอยู่แล้วแต่ไม่มีคอลัมน์ userId)
mysql -u USER -p DATABASE < docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql

# ถ้าตาราง project / projectfile / pateacherdocument ยังไม่มี ให้รัน:
# mysql -u USER -p DATABASE < docs/PROJECT_ADD_TABLES.sql
# และสร้างตาราง pateacherdocument ตาม docs/PA_TEACHER_DOCUMENTS_TABLE.sql

# 2. ดึงโค้ด + build + ขึ้นแอป
git pull
docker compose build
docker compose up -d

# 3. (ถ้าติดตั้ง tsx ใน container) ตรวจสอบตารางครบหรือไม่
npm run db:check-tables
```

## ตรวจสอบว่าใช้งานได้

1. เข้า https://sar.cnppai.com/pa
2. เลื่อนไปส่วน **บันทึก PA 1/ส, PA 2/ส, PA 3/ส (ของครู)**
3. ควรเห็นข้อความ **「กำลังแสดง/บันทึกของ: [ชื่อคุณ]」**
4. เลือกโรงเรียน + ปีการศึกษา แล้วอัปโหลดหรือแนบลิงก์ PA 1/ส (หรือ 2/ส, 3/ส)
5. ลองล็อกอินด้วยครูอีกคน → คนนั้นจะเห็นเฉพาะชุดของตนเอง (ไม่เห็นของครูคนแรก)
