# Deploy SSAR ด้วย Docker บน Ubuntu (Host)

สภาวะแวดล้อม: **Node.js 20 LTS**, **Next.js 15**, **Prisma** (MySQL/MariaDB), ต่อกับ **MariaDB ภายนอก** (ไม่รัน DB ใน Docker)

---

## 1. บน Ubuntu host

### path โปรเจกต์

```bash
cd /DATA/AppData/www/ssar
```

### ความต้องการ

- Docker และ Docker Compose
- MariaDB อยู่ที่ `192.168.1.4:3306` (หรือแก้ใน `.env`)

---

## 2. MariaDB (Dataserver)

- **Server:** 192.168.1.4 (TCP/IP)
- **ประเภท:** MariaDB
- **เวอร์ชัน:** 11.4.8-MariaDB-log
- **โปรโตคอล:** 10
- **Charset:** UTF-8 (utf8mb4)
- **User ตัวอย่าง:** casaos@172.17.0.1 (หรือตามที่ตั้งไว้)

สร้าง database และ user แล้วใช้ connection string ใน `.env`:

```env
DATABASE_URL="mysql://<user>:<password>@<db-host>:3306/qa_external?schema=public&authPlugin=mysql_native_password"
```

ตรวจสอบว่า container สามารถเชื่อมต่อ 192.168.1.4 ได้ (network/firewall ของ host และ Docker).

---

## 3. ตั้งค่า .env บน server

```bash
cd /DATA/AppData/www/ssar
cp .env.docker.example .env
nano .env   # หรือ vi
```

แก้ค่าให้ตรงกับ server โดยเฉพาะ:

- `DATABASE_URL` — ชี้ไปที่ MariaDB จริง (เช่น 192.168.1.4)
- `NEXTAUTH_SECRET` — สร้างด้วย `openssl rand -base64 32`
- `NEXTAUTH_URL` — URL จริงของแอป (เช่น https://your-domain.com)
- `GEMINI_API_KEY` — ถ้าใช้ฟีเจอร์ AI

---

## 4. Build และรัน

```bash
cd /DATA/AppData/www/ssar

# Build image
docker compose build

# รัน (แอปที่พอร์ต 9954, uploads อยู่ที่ ./public/uploads)
docker compose up -d

# ดู log
docker compose logs -f app
```

แอปจะ listen ที่ `http://localhost:9954` (หรือ IP ของ host)

---

## 5. Migration ฐานข้อมูล (รันครั้งแรกหรือหลังอัปเดต schema)

Migration **ไม่รันอัตโนมัติ** ใน container. รันบน host (หรือในเครื่องที่มี Prisma + เข้าถึง DB ได้):

```bash
cd /DATA/AppData/www/ssar
# ใช้ Node จาก host หรือรันใน container ชั่วคราว
docker compose run --rm app node -e "
  require('dotenv').config();
  const { execSync } = require('child_process');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
"
```

หรือติดตั้ง Node + Prisma บน host แล้วรัน:

```bash
npm ci
npx prisma migrate deploy
```

จากนั้นค่อย `docker compose up -d` ตามปกติ

---

## 6. โครงสร้างที่เกี่ยวข้อง

| รายการ        | ค่า |
|---------------|-----|
| App path      | `/DATA/AppData/www/ssar` |
| Port          | 9954 |
| Uploads (volume) | `./public/uploads` → `/app/public/uploads` |
| DB            | ภายนอก MariaDB ที่ 192.168.1.4 |

---

## 7. คำสั่งที่มีประโยชน์

```bash
# หยุด
docker compose down

# Build ใหม่หลังแก้โค้ด
docker compose build --no-cache
docker compose up -d

# เข้า shell ใน container
docker compose exec app sh
```

---

## 8. หมายเหตุ

- **Prisma:** โปรเจกต์ใช้ Prisma รุ่นล่าสุด (ตรวจจาก `package.json`); ทำงานกับ MariaDB 11.4 ได้
- **authPlugin:** ใช้ `mysql_native_password` ตามที่ Dataserver รองรับ
- **SSL:** ถ้า MariaDB เปิด SSL ให้เพิ่มพารามิเตอร์ใน `DATABASE_URL` ตามที่ Prisma รองรับ
