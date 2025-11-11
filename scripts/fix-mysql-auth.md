# แก้ปัญหา MySQL Authentication Plugin

## ปัญหา
Error: `Unknown authentication plugin 'sha256_password'`

MySQL 8.0 ใช้ `sha256_password` เป็น default แต่ Prisma/Node.js ไม่รองรับ

## วิธีแก้ไข

### วิธีที่ 1: เพิ่ม authPlugin ใน DATABASE_URL (แนะนำ)

แก้ไขไฟล์ `.env`:

```env
DATABASE_URL="mysql://app:app123@localhost:3306/qa_external?schema=public&authPlugin=mysql_native_password"
```

### วิธีที่ 2: เปลี่ยน MySQL User Authentication Method

รันคำสั่งใน MySQL:

```sql
ALTER USER 'app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app123';
FLUSH PRIVILEGES;
```

### วิธีที่ 3: ใช้ root user (สำหรับ development)

แก้ไข `.env`:

```env
DATABASE_URL="mysql://root:root@localhost:3306/qa_external?schema=public"
```

## ทดสอบการเชื่อมต่อ

```bash
npm run db:test
```

