# 🚀 คู่มือการติดตั้ง QA Evidence Center บน Ubuntu Server ผ่าน CasaOS

## 📋 สารบัญ

- [ความต้องการของระบบ](#ความต้องการของระบบ)
- [การเตรียมความพร้อม](#การเตรียมความพร้อม)
- [การติดตั้งผ่าน CasaOS](#การติดตั้งผ่าน-casaos)
- [การติดตั้งแบบ Manual](#การติดตั้งแบบ-manual)
- [การตั้งค่า Environment Variables](#การตั้งค่า-environment-variables)
- [การ Backup และ Restore](#การ-backup-และ-restore)
- [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## ความต้องการของระบบ

### ระบบปฏิบัติการ
- Ubuntu 20.04 LTS หรือใหม่กว่า
- Docker Engine 20.10+
- Docker Compose 2.0+

### ทรัพยากรระบบ
- **CPU**: 2 cores ขึ้นไป
- **RAM**: 4GB ขึ้นไป (แนะนำ 8GB)
- **Storage**: 20GB ขึ้นไป (สำหรับ database และ uploads)
- **Network**: พอร์ต 3000 (Web), 3306 (MySQL - optional)

---

## การเตรียมความพร้อม

### 1. ติดตั้ง Docker และ Docker Compose

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

### 2. ติดตั้ง CasaOS (ถ้ายังไม่มี)

```bash
# ติดตั้ง CasaOS
curl -fsSL https://get.casaos.io | sudo bash

# หรือใช้ wget
wget -qO- https://get.casaos.io | sudo bash
```

หลังจากติดตั้งเสร็จ ให้เข้าใช้งาน CasaOS ผ่าน:
- **URL**: `http://YOUR_SERVER_IP:80`
- **Default Username**: `admin`
- **Default Password**: `admin` (ควรเปลี่ยนทันที)

---

## การติดตั้งผ่าน CasaOS

### ขั้นตอนที่ 1: อัพโหลดโปรเจกต์

1. **Clone หรืออัพโหลดโปรเจกต์**:
   ```bash
   # สร้างโฟลเดอร์สำหรับโปรเจกต์
   mkdir -p ~/apps/qa-evidence-center
   cd ~/apps/qa-evidence-center

   # Clone จาก GitHub (ถ้ามี)
   git clone https://github.com/sooksun/ssar.git .

   # หรืออัพโหลดไฟล์ผ่าน SCP/SFTP
   ```

2. **ตรวจสอบไฟล์ที่จำเป็น**:
   - `Dockerfile`
   - `docker-compose.yml`
   - `docker-entrypoint.sh`
   - `.env.example` (สำหรับสร้าง `.env`)

### ขั้นตอนที่ 2: สร้างไฟล์ Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง
cp .env.example .env

# แก้ไขไฟล์ .env
nano .env
```

**ตัวอย่าง `.env` สำหรับ Production**:

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=your_secure_root_password_here
MYSQL_DATABASE=qa_external
MYSQL_USER=app
MYSQL_PASSWORD=your_secure_app_password_here
MYSQL_PORT=3306

# Application Configuration
APP_PORT=3000
NEXTAUTH_URL=http://YOUR_SERVER_IP:3000
# สร้าง secret ด้วยคำสั่ง: openssl rand -base64 32
NEXTAUTH_SECRET=your_generated_secret_here

# Node Environment
NODE_ENV=production
```

**⚠️ สำคัญ**: เปลี่ยนรหัสผ่านและ `NEXTAUTH_SECRET` ให้เป็นค่าที่ปลอดภัย

### ขั้นตอนที่ 3: Deploy ผ่าน CasaOS

#### วิธีที่ 1: ใช้ CasaOS App Store (แนะนำ)

1. เข้า CasaOS Dashboard
2. ไปที่ **App Store** → **Custom Apps**
3. คลิก **Add Custom App**
4. เลือก **Docker Compose**
5. อัพโหลดหรือวางเนื้อหาของ `docker-compose.yml`
6. ตั้งค่า Environment Variables จาก `.env`
7. คลิก **Deploy**

#### วิธีที่ 2: ใช้ Terminal ใน CasaOS

1. เปิด **Terminal** ใน CasaOS
2. ไปที่โฟลเดอร์โปรเจกต์:
   ```bash
   cd ~/apps/qa-evidence-center
   ```
3. Build และ Start:
   ```bash
   docker compose up -d --build
   ```
4. ตรวจสอบสถานะ:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

### ขั้นตอนที่ 4: ตรวจสอบการทำงาน

1. **ตรวจสอบ Containers**:
   ```bash
   docker ps
   ```
   ควรเห็น 2 containers:
   - `qa-evidence-db` (MySQL)
   - `qa-evidence-web` (Next.js)

2. **ตรวจสอบ Logs**:
   ```bash
   # ดู logs ทั้งหมด
   docker compose logs

   # ดู logs แบบ real-time
   docker compose logs -f web

   # ดู logs ของ database
   docker compose logs -f db
   ```

3. **ทดสอบ Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```
   ควรได้ response: `{"status":"ok","timestamp":"..."}`

4. **เข้าใช้งาน Web Application**:
   - เปิดเบราว์เซอร์ไปที่: `http://YOUR_SERVER_IP:3000`
   - หน้าแรกควรแสดงหน้า Login

---

## การติดตั้งแบบ Manual (ไม่ใช้ CasaOS)

### ขั้นตอนที่ 1: Clone โปรเจกต์

```bash
# สร้างโฟลเดอร์
mkdir -p ~/apps/qa-evidence-center
cd ~/apps/qa-evidence-center

# Clone จาก GitHub
git clone https://github.com/sooksun/ssar.git .

# หรืออัพโหลดไฟล์ผ่าน SCP/SFTP
```

### ขั้นตอนที่ 2: สร้างไฟล์ .env

```bash
cp .env.example .env
nano .env
```

แก้ไขค่าตามที่อธิบายไว้ข้างต้น

### ขั้นตอนที่ 3: Build และ Start

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# ตรวจสอบสถานะ
docker compose ps
```

### ขั้นตอนที่ 4: ตรวจสอบ Logs

```bash
# ดู logs
docker compose logs -f

# ดู logs เฉพาะ web
docker compose logs -f web
```

---

## การตั้งค่า Environment Variables

### ตัวแปรที่สำคัญ

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|----------|---------|
| `MYSQL_ROOT_PASSWORD` | รหัสผ่าน root ของ MySQL | `SecurePassword123!` |
| `MYSQL_DATABASE` | ชื่อฐานข้อมูล | `qa_external` |
| `MYSQL_USER` | ชื่อผู้ใช้ฐานข้อมูล | `app` |
| `MYSQL_PASSWORD` | รหัสผ่านผู้ใช้ฐานข้อมูล | `AppPassword123!` |
| `NEXTAUTH_URL` | URL ของแอปพลิเคชัน | `http://192.168.1.100:3000` |
| `NEXTAUTH_SECRET` | Secret key สำหรับ NextAuth | สร้างด้วย `openssl rand -base64 32` |
| `APP_PORT` | พอร์ตของแอปพลิเคชัน | `3000` |

### สร้าง NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## การ Backup และ Restore

### Backup Database

```bash
# Backup database
docker compose exec db mysqldump -u app -p${MYSQL_PASSWORD} qa_external > backup_$(date +%Y%m%d_%H%M%S).sql

# หรือ backup ทั้ง volume
docker run --rm -v qa-evidence-center_dbdata:/data -v $(pwd):/backup alpine tar czf /backup/db_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Backup Uploads

```bash
# Backup uploads volume
docker run --rm -v qa-evidence-center_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restore Database

```bash
# Restore จาก SQL file
docker compose exec -T db mysql -u app -p${MYSQL_PASSWORD} qa_external < backup_20240101_120000.sql

# หรือ restore จาก volume backup
docker run --rm -v qa-evidence-center_dbdata:/data -v $(pwd):/backup alpine tar xzf /backup/db_backup_20240101_120000.tar.gz -C /
```

### Restore Uploads

```bash
# Restore uploads volume
docker run --rm -v qa-evidence-center_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup_20240101_120000.tar.gz -C /
```

---

## การแก้ไขปัญหา

### ปัญหา: Container ไม่สามารถเชื่อมต่อ Database

**สาเหตุ**: Database ยังไม่พร้อม

**วิธีแก้**:
```bash
# ตรวจสอบ logs ของ database
docker compose logs db

# ตรวจสอบ health check
docker compose ps

# รอให้ database พร้อม (healthcheck จะรออัตโนมัติ)
```

### ปัญหา: Migration ล้มเหลว

**สาเหตุ**: Database schema ไม่ตรงกัน

**วิธีแก้**:
```bash
# เข้าไปใน container
docker compose exec web sh

# รัน migration ใหม่
npx prisma migrate deploy

# หรือ reset database (⚠️ จะลบข้อมูลทั้งหมด)
npx prisma migrate reset
```

### ปัญหา: Port 3000 ถูกใช้งานแล้ว

**วิธีแก้**:
```bash
# เปลี่ยนพอร์ตใน .env
APP_PORT=3001

# Restart services
docker compose down
docker compose up -d
```

### ปัญหา: Permission Denied

**วิธีแก้**:
```bash
# ตรวจสอบ permissions
ls -la public/uploads/

# แก้ไข permissions
sudo chown -R 1001:1001 public/uploads/
```

### ปัญหา: Build ล้มเหลว

**วิธีแก้**:
```bash
# ลบ cache และ build ใหม่
docker compose build --no-cache

# หรือลบ images เก่า
docker compose down --rmi all
docker compose build
```

### ดู Logs แบบละเอียด

```bash
# Logs ทั้งหมด
docker compose logs

# Logs แบบ real-time
docker compose logs -f

# Logs เฉพาะ service
docker compose logs -f web
docker compose logs -f db

# Logs 100 บรรทัดล่าสุด
docker compose logs --tail=100 web
```

---

## คำสั่งที่ใช้บ่อย

```bash
# เริ่ม services
docker compose up -d

# หยุด services
docker compose down

# Restart services
docker compose restart

# Restart service เฉพาะ
docker compose restart web

# ดูสถานะ
docker compose ps

# ดู logs
docker compose logs -f

# Build ใหม่
docker compose build --no-cache

# เข้าไปใน container
docker compose exec web sh
docker compose exec db bash

# ตรวจสอบ network
docker network ls
docker network inspect qa-evidence-center_qa-evidence-network

# ตรวจสอบ volumes
docker volume ls
docker volume inspect qa-evidence-center_dbdata
```

---

## การอัพเดทแอปพลิเคชัน

```bash
# 1. Pull code ใหม่
git pull origin main

# 2. Build ใหม่
docker compose build --no-cache

# 3. Restart services
docker compose down
docker compose up -d

# 4. ตรวจสอบ logs
docker compose logs -f web
```

---

## การตั้งค่า Reverse Proxy (Nginx)

สำหรับใช้งานผ่าน domain name:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

อย่าลืมอัพเดท `NEXTAUTH_URL` ใน `.env` เป็น domain name ของคุณ

---

## สรุป

หลังจากติดตั้งเสร็จ คุณสามารถ:

1. ✅ เข้าใช้งานแอปพลิเคชันที่ `http://YOUR_SERVER_IP:3000`
2. ✅ Login ด้วยบัญชี admin ที่สร้างจาก seed
3. ✅ จัดการหลักฐาน, รายงาน, และผู้ใช้ผ่านระบบ

หากมีปัญหาหรือคำถามเพิ่มเติม ดูที่ [การแก้ไขปัญหา](#การแก้ไขปัญหา) หรือตรวจสอบ logs

---

**หมายเหตุ**: สำหรับการใช้งานจริง ควรตั้งค่า:
- Firewall rules
- SSL/TLS certificates (Let's Encrypt)
- Regular backups
- Monitoring และ alerting

