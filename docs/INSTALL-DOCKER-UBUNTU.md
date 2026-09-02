# การติดตั้ง SSAR ด้วย Docker บน Ubuntu Server

สภาวะแวดล้อม: **Node.js 20 LTS**, **Next.js 15**, **Prisma** (MySQL/MariaDB), ต่อกับ **MariaDB ภายนอก** (ไม่รัน DB ใน Docker)

**Path บน Server:** `/DATA/AppData/www/ssar`

---

## 1. ความต้องการบน Ubuntu Host

- Docker และ Docker Compose (v2 ขึ้นไป)
- MariaDB อยู่ที่ `192.168.1.4:3306` (หรือแก้ใน `.env` ตามสภาพจริง)
- โฟลเดอร์โปรเจกต์อยู่ที่ `/DATA/AppData/www/ssar`

### ติดตั้ง Docker (ถ้ายังไม่มี)

```bash
# อัปเดตและติดตั้ง Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 2. เตรียมโปรเจกต์ที่ path ที่กำหนด

```bash
# สร้างโฟลเดอร์ (ถ้ายังไม่มี)
sudo mkdir -p /DATA/AppData/www/ssar
sudo chown $USER:$USER /DATA/AppData/www/ssar

# ไปที่ path โปรเจกต์
cd /DATA/AppData/www/ssar
```

วางไฟล์โปรเจกต์ SSAR ไว้ในโฟลเดอร์นี้ (clone จาก git หรือ copy ไฟล์) ให้มีอย่างน้อย:

- `Dockerfile`
- `docker-compose.yml`
- `package.json`, `package-lock.json`
- โฟลเดอร์ `prisma/`, `app/`, `lib/`, `public/`, `components/` ฯลฯ

---

## 3. MariaDB (Dataserver)

- **Server:** 192.168.1.4 (TCP/IP)
- **ประเภท:** MariaDB
- **เวอร์ชัน:** 11.4.8-MariaDB-log (หรือเทียบเท่า)
- **Charset:** UTF-8 (utf8mb4)
- **User ตัวอย่าง:** casaos@172.17.0.1 (หรือตามที่ตั้งไว้)

สร้าง database และ user บน MariaDB แล้วใช้ connection string ใน `.env`:

```env
DATABASE_URL="mysql://<user>:<password>@<db-host>:3306/qa_external?schema=public&authPlugin=mysql_native_password"
```

ตรวจสอบว่าเครื่อง Ubuntu (และ Docker container) สามารถเชื่อมต่อ `192.168.1.4:3306` ได้ ( firewall / routing ).

---

## 4. ตั้งค่า .env บน server

```bash
cd /DATA/AppData/www/ssar
cp .env.docker.example .env
nano .env   # หรือ vi
```

แก้ค่าให้ตรงกับ server:

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `DATABASE_URL` | ชี้ไปที่ MariaDB จริง (เช่น 192.168.1.4) |
| `NEXTAUTH_SECRET` | สร้างด้วย `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL จริงของแอป (เช่น https://your-domain.com) |
| `GEMINI_API_KEY` | ถ้าใช้ฟีเจอร์ AI เชื่อมโยงตัวชี้วัด |
| `UPLOAD_DIR` | ตั้งเป็น `/app/public/uploads` ใน Docker เพื่อให้รูปอัปโหลดใหม่บันทึกและโหลดได้ (Next standalone ไม่ serve ไฟล์ที่เพิ่มใน public ตอน runtime — เราใช้ rewrite ไปที่ API serve ไฟล์จากโฟลเดอร์นี้แทน) |

---

## 5. Build และรัน

```bash
cd /DATA/AppData/www/ssar

# Build image
docker compose build

# รัน (แอปที่พอร์ต 9954, uploads อยู่ที่ ./public/uploads)
docker compose up -d

# ดู log
docker compose logs -f app
```

แอปจะ listen ที่ **พอร์ต 9954** (เช่น `http://localhost:9954` หรือ `http://<IP-host>:9954`)

---

## 6. Migration ฐานข้อมูล (รันครั้งแรกหรือหลังอัปเดต schema)

Migration **ไม่รันอัตโนมัติ** ใน container — ต้องรันเองครั้งแรกหรือหลังอัปเดต Prisma schema:

```bash
cd /DATA/AppData/www/ssar

# วิธีที่ 1: รันผ่าน container ชั่วคราว
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

## 7. โครงสร้างที่เกี่ยวข้อง

| รายการ | ค่า |
|--------|-----|
| App path | `/DATA/AppData/www/ssar` |
| Port | **9954** |
| Uploads (volume) | `./public/uploads` → `/app/public/uploads` (ถ้าย้ายจากเครื่องอื่น ต้อง copy โฟลเดอร์นี้ไปที่ server ด้วย ไม่งั้นรูปเดิมจะ 404) |
| DB | ภายนอก MariaDB (เช่น 192.168.1.4) |

---

## 8. คำสั่งที่มีประโยชน์

```bash
# หยุด
docker compose down

# Build ใหม่หลังแก้โค้ด
docker compose build --no-cache
docker compose up -d

# เข้า shell ใน container
docker compose exec app sh

# ดูสถานะ
docker compose ps
```

---

## 9. หมายเหตุ

- **Prisma:** ทำงานกับ MariaDB 11.4 ได้ ใช้ `authPlugin=mysql_native_password` ตามที่ Dataserver รองรับ
- **SSL:** ถ้า MariaDB เปิด SSL ให้เพิ่มพารามิเตอร์ใน `DATABASE_URL` ตามที่ Prisma รองรับ
- **Reverse proxy:** ถ้าใช้ Nginx Proxy Manager หรือ Caddy ให้ตั้ง **Forward Port = 9954** (ไม่ใช่ 9950) ไปที่ `http://192.168.1.4:9954` หรือ `http://127.0.0.1:9954`

---

## 10. แก้ปัญหา: อัปโหลดสำเร็จแต่รูปโหลดไม่ขึ้น (404)

ถ้ารูปที่อัปโหลดใหม่โหลดไม่ได้ (404) ให้ตรวจตามนี้:

1. **อัปเดตโค้ดและ build ใหม่** (ต้องมี rewrite + API serve-upload)
   ```bash
   cd /DATA/AppData/www/ssar
   git pull
   docker compose build --no-cache
   docker compose up -d
   ```

2. **ตั้ง UPLOAD_DIR ใน .env**
   ```bash
   UPLOAD_DIR=/app/public/uploads
   ```
   จากนั้น `docker compose up -d` อีกครั้ง

3. **ตรวจว่า rewrite ทำงาน** — เปิดในเบราว์เซอร์:
   `https://sar.cnppai.com/api/serve-upload/evidence/8/images/7476028b-a9b2-4eec-af7e-233b0ea484e0.png`
   - ถ้าได้ 200 = route ทำงาน (ถ้ายัง 404 อาจเป็นเพราะไฟล์ไม่มีบนดิสก์)
   - ถ้าได้ 404 หน้า API = แปลว่า rewrite อาจไม่ส่ง request มาที่ route หรือโค้ดยังไม่ deploy

4. **ตรวจว่าไฟล์อยู่บนโฟลเดอร์**
   ```bash
   ls -la /DATA/AppData/www/ssar/public/uploads/evidence/8/images/
   ```
   ควรเห็นไฟล์ .png หลังอัปโหลด ถ้าไม่มี แปลว่าการเขียนไฟล์อาจผิด path หรือสิทธิ์
