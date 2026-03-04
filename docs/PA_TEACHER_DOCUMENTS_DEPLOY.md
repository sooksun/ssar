# การ deploy ฟีเจอร์ PA 1/ส, PA 2/ส, PA 3/ส (ผูกกับครู)

## สิ่งที่เปลี่ยน (Logic & DB)

- ครู 1 คน เพิ่ม **PA 1/ส, PA 2/ส, PA 3/ส** ได้ **1 ชุด ต่อคน ต่อโรงเรียน ต่อปีการศึกษา**
- โรงเรียนมี 10 ครู → บันทึกได้ 10 ชุด (ครูแต่ละคนบันทึกของตนเอง)
- **ผูก user id, school id, ปีการศึกษา** — รายละเอียดใน [PA_TEACHER_DOCUMENTS_LOGIC.md](./PA_TEACHER_DOCUMENTS_LOGIC.md)

## ขั้นตอนบนเซิร์ฟเวอร์

### 1. อัปเดตฐานข้อมูล (ต้องทำก่อนหรือพร้อม deploy)

ถ้าตาราง `pateacherdocument` **มีอยู่แล้วแต่ยังไม่มีคอลัมน์ `userId`** ต้องรัน SQL ด้านล่าง (ถ้าเจอ *Duplicate column name 'userId'* = มีคอลัมน์แล้ว ไม่ต้องรัน):

```bash
# แทน YOUR_DB_USER และ YOUR_DB_NAME ด้วย user / ชื่อฐานข้อมูลจริง
# ตัวอย่าง: user=casaos, password=casaos, database=qa_external (ใส่รหัสผ่านเมื่อคำสั่งถาม)
mysql -h 127.0.0.1 -u YOUR_DB_USER -p YOUR_DB_NAME < docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql
```

- ถ้าเจอ `Can't connect to local server through socket`: MySQL อาจรันใน Docker หรือ remote ให้ใช้ `-h 127.0.0.1` (หรือ IP ของ MySQL) ถ้าเปิดพอร์ต 3306 ไว้
- หรือเปิด `docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql` ใน phpMyAdmin แล้ว Execute

ถ้าไม่รัน: แอปจะ error ตอนบันทึก/โหลด PA ครู (ตารางไม่มีคอลัมน์ `userId`)

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

# 1. อัปเดต DB — ใช้ user และชื่อฐานข้อมูลจริง (อย่าใส่ < > ในคำสั่ง จะ error)
#    ตัวอย่าง user=casaos, database=qa_external (ใส่รหัสผ่านเมื่อถาม):
mysql -h 127.0.0.1 -u casaos -p qa_external < docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql
#    ถ้าตาราง project / projectfile / pateacherdocument ยังไม่มี:
#    mysql -h 127.0.0.1 -u casaos -p qa_external < docs/PROJECT_ADD_TABLES.sql
#    และสร้างตาราง pateacherdocument ตาม docs/PA_TEACHER_DOCUMENTS_TABLE.sql

# 2. ดึงโค้ด + build + ขึ้นแอป
git pull
docker compose build
docker compose up -d

# 3. ตรวจสอบตารางครบหรือไม่ (รันบนโฮสต์ — ต้องมี DATABASE_URL ใน .env หรือ export)
npm run db:check-tables
```

## ตรวจสอบว่าใช้งานได้

1. เข้า https://sar.cnppai.com/pa
2. เลื่อนไปส่วน **บันทึก PA 1/ส, PA 2/ส, PA 3/ส (ของครู)**
3. ควรเห็นข้อความ **「กำลังแสดง/บันทึกของ: [ชื่อคุณ]」**
4. เลือกโรงเรียน + ปีการศึกษา แล้วอัปโหลดหรือแนบลิงก์ PA 1/ส (หรือ 2/ส, 3/ส)
5. ลองล็อกอินด้วยครูอีกคน → คนนั้นจะเห็นเฉพาะชุดของตนเอง (ไม่เห็นของครูคนแรก)
