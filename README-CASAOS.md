# 🏠 คู่มือการติดตั้ง QA Evidence Center ผ่าน CasaOS

คู่มือการติดตั้งระบบ QA Evidence Center บน Ubuntu Server ผ่าน CasaOS โดยใช้ Dockerfile และเชื่อมต่อกับ MariaDB ที่มีอยู่แล้ว

## 📋 สารบัญ

- [ความต้องการของระบบ](#ความต้องการของระบบ)
- [ข้อมูล Database ที่ใช้](#ข้อมูล-database-ที่ใช้)
- [การติดตั้ง CasaOS](#การติดตั้ง-casaos)
- [การเตรียมโปรเจกต์](#การเตรียมโปรเจกต์)
- [การ Deploy ผ่าน CasaOS](#การ-deploy-ผ่าน-casaos)
- [การตรวจสอบการทำงาน](#การตรวจสอบการทำงาน)
- [การแก้ไขปัญหา](#การแก้ไขปัญหา)
- [การอัพเดทแอปพลิเคชัน](#การอัพเดทแอปพลิเคชัน)

---

## ความต้องการของระบบ

### ระบบปฏิบัติการ
- Ubuntu 20.04 LTS หรือใหม่กว่า
- Docker Engine 20.10+
- Docker Compose 2.0+

### ทรัพยากรระบบ
- **CPU**: 2 cores ขึ้นไป
- **RAM**: 4GB ขึ้นไป (แนะนำ 8GB)
- **Storage**: 10GB ขึ้นไป (สำหรับ application และ uploads)
- **Network**: 
  - พอร์ต 3000 (Web Application)
  - การเข้าถึง MariaDB ที่ `192.168.1.4:3306`

### Database ที่ต้องมี
- MariaDB หรือ MySQL 8.0+ ที่รันอยู่แล้ว
- Database ชื่อ `qa_external` ต้องมีอยู่แล้ว
- User `tok` ต้องมีสิทธิ์เข้าถึง database `qa_external`

---

## ข้อมูล Database ที่ใช้

สำหรับการติดตั้งนี้ ระบบจะเชื่อมต่อกับ MariaDB ที่มีอยู่แล้ว:

- **Host**: `192.168.1.4`
- **Port**: `3306`
- **User**: `tok`
- **Password**: `l6-lyo9N`
- **Database**: `qa_external`

**⚠️ หมายเหตุ**: ข้อมูลนี้จะถูกใช้ในไฟล์ `.env` และ `docker-compose.yml`

---

## การติดตั้ง CasaOS

### ขั้นตอนที่ 1: ติดตั้ง Docker และ Docker Compose

```bash
# อัพเดท package list
sudo apt update

# ติดตั้ง dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# เพิ่ม Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# เพิ่ม Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ติดตั้ง Docker Engine และ Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# ตรวจสอบการติดตั้ง
docker --version
docker compose version
```

### ขั้นตอนที่ 2: ติดตั้ง CasaOS

```bash
# ติดตั้ง CasaOS
curl -fsSL https://get.casaos.io | sudo bash

# หรือใช้ wget
wget -qO- https://get.casaos.io | sudo bash
```

### ขั้นตอนที่ 3: เข้าใช้งาน CasaOS

หลังจากติดตั้งเสร็จ ให้เข้าใช้งาน CasaOS ผ่าน:

- **URL**: `http://YOUR_SERVER_IP:80` หรือ `http://YOUR_SERVER_IP`
- **Default Username**: `admin`
- **Default Password**: `admin`

**⚠️ สำคัญ**: ควรเปลี่ยนรหัสผ่าน admin ทันทีหลังจากเข้าใช้งานครั้งแรก

---

## การเตรียมโปรเจกต์

### ขั้นตอนที่ 1: Clone หรืออัพโหลดโปรเจกต์

```bash
# สร้างโฟลเดอร์สำหรับโปรเจกต์
mkdir -p ~/apps/qa-evidence-center
cd ~/apps/qa-evidence-center

# Clone จาก GitHub (ถ้ามี)
git clone <repository-url> .

# หรืออัพโหลดไฟล์โปรเจกต์ผ่าน SCP/SFTP
# scp -r /path/to/ssar/* user@server:~/apps/qa-evidence-center/
```

### ขั้นตอนที่ 2: ตรวจสอบไฟล์ที่จำเป็น

ตรวจสอบว่ามีไฟล์ต่อไปนี้:

- ✅ `Dockerfile`
- ✅ `docker-compose.yml` (หรือ `docker-compose-casaos.yml` ที่เราจะสร้าง)
- ✅ `docker-entrypoint.sh`
- ✅ `package.json`
- ✅ `prisma/schema.prisma`
- ✅ `next.config.js`

### ขั้นตอนที่ 3: สร้างไฟล์ docker-compose สำหรับ CasaOS

สร้างไฟล์ `docker-compose-casaos.yml` สำหรับใช้กับ CasaOS:

```bash
nano docker-compose-casaos.yml
```

เพิ่มเนื้อหาดังนี้:

```yaml
version: "3.9"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: qa-evidence-web
    restart: unless-stopped
    environment:
      # ใช้ MariaDB ที่มีอยู่แล้ว
      DATABASE_URL: mysql://tok:l6-lyo9N@192.168.1.4:3306/qa_external?connection_limit=10
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-changeme-in-production}
      NODE_ENV: production
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - uploads:/app/public/uploads
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  uploads:
    driver: local
```

**หมายเหตุ**: 
- ไม่มี `db` service เพราะใช้ MariaDB ภายนอก
- ไม่มี `depends_on` เพราะไม่ต้องรอ database container
- `DATABASE_URL` ชี้ไปที่ `192.168.1.4:3306`

### ขั้นตอนที่ 4: สร้างไฟล์ Environment Variables

```bash
# สร้างไฟล์ .env
nano .env
```

เพิ่มเนื้อหาดังนี้:

```env
# Database Configuration (ใช้ MariaDB ภายนอก)
# Host: 192.168.1.4, Port: 3306, User: tok, Database: qa_external
DATABASE_URL="mysql://tok:l6-lyo9N@192.168.1.4:3306/qa_external?connection_limit=10"

# NextAuth Configuration
# เปลี่ยน YOUR_SERVER_IP เป็น IP address หรือ domain ของ server
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"

# สร้าง secret ด้วยคำสั่ง: openssl rand -base64 32
NEXTAUTH_SECRET="changeme-in-production-generate-with-openssl-rand-base64-32"

# Node Environment
NODE_ENV=production

# Application Port
APP_PORT=3000
```

**⚠️ สำคัญ**: 
1. เปลี่ยน `YOUR_SERVER_IP` เป็น IP address จริงของ server
2. สร้าง `NEXTAUTH_SECRET` ใหม่ด้วยคำสั่ง:
   ```bash
   openssl rand -base64 32
   ```
3. วางค่า secret ที่ได้ลงใน `.env`

### ขั้นตอนที่ 5: ทดสอบการเชื่อมต่อ Database

ก่อน deploy ควรทดสอบว่าสามารถเชื่อมต่อ database ได้:

```bash
# ติดตั้ง mysql client (ถ้ายังไม่มี)
sudo apt install -y mysql-client

# ทดสอบการเชื่อมต่อ
mysql -h 192.168.1.4 -P 3306 -u tok -p'l6-lyo9N' qa_external -e "SELECT 1;"
```

ถ้าเชื่อมต่อได้จะเห็นผลลัพธ์:
```
+---+
| 1 |
+---+
| 1 |
+---+
```

---

## การ Deploy ผ่าน CasaOS

### วิธีที่ 1: ใช้ CasaOS App Store (แนะนำ)

#### ขั้นตอนที่ 1: เข้า CasaOS Dashboard

1. เปิดเบราว์เซอร์ไปที่ `http://YOUR_SERVER_IP`
2. Login ด้วย username และ password

#### ขั้นตอนที่ 2: สร้าง Custom App

1. ไปที่ **App Store** (เมนูด้านซ้าย)
2. คลิก **Custom Apps** หรือ **My Apps**
3. คลิก **Add Custom App** หรือ **+** (ปุ่มเพิ่ม)

#### ขั้นตอนที่ 3: อัพโหลด Docker Compose

1. เลือก **Docker Compose** หรือ **Compose**
2. เปิดไฟล์ `docker-compose-casaos.yml` ที่สร้างไว้
3. คัดลอกเนื้อหาทั้งหมด (Ctrl+A, Ctrl+C)
4. วางลงในช่อง **Compose File** หรือ **YAML**

หรือ

1. คลิก **Upload File**
2. เลือกไฟล์ `docker-compose-casaos.yml`

#### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

ในส่วน **Environment Variables** หรือ **Env** เพิ่ม:

```
DATABASE_URL=mysql://tok:l6-lyo9N@192.168.1.4:3306/qa_external?connection_limit=10
NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
NEXTAUTH_SECRET=your_generated_secret_here
NODE_ENV=production
APP_PORT=3000
```

**⚠️ หมายเหตุ**: เปลี่ยน `YOUR_SERVER_IP` และ `NEXTAUTH_SECRET` ให้ถูกต้อง

#### ขั้นตอนที่ 5: ตั้งค่า Port

ในส่วน **Ports** หรือ **Port Mapping**:
- **Container Port**: `3000`
- **Host Port**: `3000` (หรือ port อื่นที่ต้องการ)

#### ขั้นตอนที่ 6: Deploy

1. ตรวจสอบการตั้งค่าทั้งหมด
2. คลิก **Deploy** หรือ **Install**
3. รอให้ระบบ build และ start container

### วิธีที่ 2: ใช้ Terminal ใน CasaOS

#### ขั้นตอนที่ 1: เปิด Terminal

1. ใน CasaOS Dashboard
2. ไปที่ **Terminal** หรือ **Terminal App**
3. หรือ SSH เข้า server โดยตรง

#### ขั้นตอนที่ 2: ไปที่โฟลเดอร์โปรเจกต์

```bash
cd ~/apps/qa-evidence-center
```

#### ขั้นตอนที่ 3: ตรวจสอบไฟล์

```bash
# ตรวจสอบว่ามีไฟล์ที่จำเป็น
ls -la

# ตรวจสอบ docker-compose-casaos.yml
cat docker-compose-casaos.yml
```

#### ขั้นตอนที่ 4: Build และ Start

```bash
# Build image
docker compose -f docker-compose-casaos.yml build

# Start service
docker compose -f docker-compose-casaos.yml up -d

# ตรวจสอบสถานะ
docker compose -f docker-compose-casaos.yml ps
```

#### ขั้นตอนที่ 5: ดู Logs

```bash
# ดู logs ทั้งหมด
docker compose -f docker-compose-casaos.yml logs

# ดู logs แบบ real-time
docker compose -f docker-compose-casaos.yml logs -f

# ดู logs 100 บรรทัดล่าสุด
docker compose -f docker-compose-casaos.yml logs --tail=100
```

---

## การตรวจสอบการทำงาน

### 1. ตรวจสอบ Container

```bash
# ตรวจสอบ containers ที่รันอยู่
docker ps

# ควรเห็น container ชื่อ qa-evidence-web
```

### 2. ตรวจสอบ Logs

```bash
# ดู logs ของ container
docker logs qa-evidence-web

# หรือใช้ docker compose
docker compose -f docker-compose-casaos.yml logs -f web
```

**สิ่งที่ควรเห็นใน logs**:
- ✅ `🚀 Starting QA Evidence Center...`
- ✅ `⏳ Waiting for database...`
- ✅ `✅ Database is ready!`
- ✅ `📦 Running database migrations...`
- ✅ `🌱 Checking if database needs seeding...`
- ✅ `🎉 Starting Next.js server...`
- ✅ `Ready on http://0.0.0.0:3000`

### 3. ทดสอบ Health Check

```bash
# ทดสอบ health check endpoint
curl http://localhost:3000/api/health
```

**ผลลัพธ์ที่ควรได้**:
```json
{"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
```

### 4. ทดสอบการเชื่อมต่อ Database

```bash
# เข้าไปใน container
docker exec -it qa-evidence-web sh

# ทดสอบการเชื่อมต่อ database
npx prisma db execute --stdin <<< "SELECT 1"
```

### 5. เข้าใช้งาน Web Application

1. เปิดเบราว์เซอร์
2. ไปที่ `http://YOUR_SERVER_IP:3000`
3. ควรเห็นหน้า Login
4. Login ด้วย:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`

---

## การแก้ไขปัญหา

### ปัญหา: Container ไม่สามารถเชื่อมต่อ Database

**อาการ**: 
- Logs แสดง `❌ Database connection failed`
- Error: `Can't reach database server`

**วิธีแก้**:

1. **ตรวจสอบ Network Connectivity**:
   ```bash
   # ทดสอบการเชื่อมต่อจาก container
   docker exec -it qa-evidence-web ping -c 3 192.168.1.4
   ```

2. **ตรวจสอบ Firewall**:
   ```bash
   # ตรวจสอบว่า MariaDB server อนุญาตการเชื่อมต่อจาก IP นี้
   # บน MariaDB server (192.168.1.4) ตรวจสอบ:
   # - Firewall rules
   # - MariaDB bind-address
   # - User permissions (tok@'%' หรือ tok@'YOUR_SERVER_IP')
   ```

3. **ตรวจสอบ User Permissions**:
   ```sql
   -- บน MariaDB server
   -- ตรวจสอบว่า user tok สามารถเชื่อมต่อจาก IP นี้ได้
   SELECT user, host FROM mysql.user WHERE user = 'tok';
   
   -- ถ้าจำเป็น ให้สร้าง user ที่อนุญาตจาก IP ใดก็ได้
   CREATE USER 'tok'@'%' IDENTIFIED BY 'l6-lyo9N';
   GRANT ALL PRIVILEGES ON qa_external.* TO 'tok'@'%';
   FLUSH PRIVILEGES;
   ```

### ปัญหา: Migration ล้มเหลว

**อาการ**: 
- Logs แสดง `⚠️ Migration failed`
- Error: `Table already exists` หรือ `Unknown column`

**วิธีแก้**:

```bash
# เข้าไปใน container
docker exec -it qa-evidence-web sh

# ตรวจสอบ migration status
npx prisma migrate status

# รัน migration ใหม่
npx prisma migrate deploy

# หรือ reset database (⚠️ จะลบข้อมูลทั้งหมด)
npx prisma migrate reset
```

### ปัญหา: Port 3000 ถูกใช้งานแล้ว

**อาการ**: 
- Error: `port is already allocated`
- Container ไม่สามารถ start ได้

**วิธีแก้**:

1. **เปลี่ยน Port ใน docker-compose-casaos.yml**:
   ```yaml
   ports:
     - "3001:3000"  # เปลี่ยนจาก 3000 เป็น 3001
   ```

2. **อัพเดท NEXTAUTH_URL**:
   ```env
   NEXTAUTH_URL="http://YOUR_SERVER_IP:3001"
   ```

3. **Restart Container**:
   ```bash
   docker compose -f docker-compose-casaos.yml down
   docker compose -f docker-compose-casaos.yml up -d
   ```

### ปัญหา: Permission Denied สำหรับ Uploads

**อาการ**: 
- Error: `EACCES: permission denied`
- ไม่สามารถอัพโหลดไฟล์ได้

**วิธีแก้**:

```bash
# ตรวจสอบ volume
docker volume inspect qa-evidence-center_uploads

# แก้ไข permissions (ถ้าจำเป็น)
docker exec -it qa-evidence-web sh
chmod -R 755 /app/public/uploads
chown -R 1001:1001 /app/public/uploads
```

### ปัญหา: Build ล้มเหลว

**อาการ**: 
- Error: `npm ERR!` หรือ `prisma generate failed`

**วิธีแก้**:

```bash
# ลบ cache และ build ใหม่
docker compose -f docker-compose-casaos.yml build --no-cache

# หรือลบ images เก่า
docker compose -f docker-compose-casaos.yml down --rmi all
docker compose -f docker-compose-casaos.yml build
```

### ปัญหา: NEXTAUTH_SECRET ไม่ถูกต้อง

**อาการ**: 
- Error: `Invalid NEXTAUTH_SECRET`
- Session ไม่ทำงาน

**วิธีแก้**:

1. **สร้าง Secret ใหม่**:
   ```bash
   openssl rand -base64 32
   ```

2. **อัพเดทใน .env และ CasaOS**:
   - แก้ไขไฟล์ `.env`
   - อัพเดท Environment Variables ใน CasaOS
   - Restart container

---

## การอัพเดทแอปพลิเคชัน

### ขั้นตอนการอัพเดท

```bash
# 1. เข้าไปที่โฟลเดอร์โปรเจกต์
cd ~/apps/qa-evidence-center

# 2. Pull code ใหม่ (ถ้าใช้ Git)
git pull origin main

# 3. Build image ใหม่
docker compose -f docker-compose-casaos.yml build --no-cache

# 4. Stop container เก่า
docker compose -f docker-compose-casaos.yml down

# 5. Start container ใหม่
docker compose -f docker-compose-casaos.yml up -d

# 6. ตรวจสอบ logs
docker compose -f docker-compose-casaos.yml logs -f web
```

### ผ่าน CasaOS Dashboard

1. ไปที่ **App Store** → **My Apps**
2. หา app **qa-evidence-center**
3. คลิก **Settings** หรือ **⚙️**
4. คลิก **Rebuild** หรือ **Update**
5. รอให้ build และ restart เสร็จ

---

## คำสั่งที่ใช้บ่อย

```bash
# เริ่ม services
docker compose -f docker-compose-casaos.yml up -d

# หยุด services
docker compose -f docker-compose-casaos.yml down

# Restart services
docker compose -f docker-compose-casaos.yml restart

# ดูสถานะ
docker compose -f docker-compose-casaos.yml ps

# ดู logs
docker compose -f docker-compose-casaos.yml logs -f

# เข้าไปใน container
docker exec -it qa-evidence-web sh

# ตรวจสอบ database connection
docker exec -it qa-evidence-web npx prisma db execute --stdin <<< "SELECT 1"

# รัน migration
docker exec -it qa-evidence-web npx prisma migrate deploy

# รัน seed (ถ้าจำเป็น)
docker exec -it qa-evidence-web npm run db:seed
```

---

## การ Backup และ Restore

### Backup Uploads

```bash
# Backup uploads volume
docker run --rm -v qa-evidence-center_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Backup Database

```bash
# Backup database จาก MariaDB server
mysqldump -h 192.168.1.4 -P 3306 -u tok -p'l6-lyo9N' qa_external > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# Restore database
mysql -h 192.168.1.4 -P 3306 -u tok -p'l6-lyo9N' qa_external < backup_20240101_120000.sql
```

---

## สรุป

หลังจากติดตั้งเสร็จ คุณสามารถ:

1. ✅ เข้าใช้งานแอปพลิเคชันที่ `http://YOUR_SERVER_IP:3000`
2. ✅ Login ด้วยบัญชี admin: `admin@example.com` / `admin123`
3. ✅ จัดการหลักฐาน, รายงาน, และผู้ใช้ผ่านระบบ
4. ✅ ระบบเชื่อมต่อกับ MariaDB ที่ `192.168.1.4:3306` อัตโนมัติ

---

## เอกสารเพิ่มเติม

- [README.md](./README.md) - เอกสารหลักของโปรเจกต์
- [README-DOCKER.md](./README-DOCKER.md) - คู่มือการติดตั้งด้วย Docker (แบบมี database container)
- [README-UBUNTU.md](./README-UBUNTU.md) - คู่มือการติดตั้งแบบ native (ไม่ใช้ Docker)

---

**หมายเหตุ**: สำหรับการใช้งานจริง ควรตั้งค่า:
- Firewall rules
- SSL/TLS certificates (Let's Encrypt)
- Regular backups
- Monitoring และ alerting
- เปลี่ยนรหัสผ่าน default ทั้งหมด

