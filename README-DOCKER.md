# 🐳 Docker Deployment Guide

คู่มือการติดตั้ง QA Evidence Center ด้วย Docker และ Docker Compose สำหรับ CasaOS

## 📋 ไฟล์ที่สร้างขึ้น

- `Dockerfile` - Multi-stage build สำหรับ Next.js application
- `docker-compose.yml` - Docker Compose configuration สำหรับ Next.js + MySQL
- `docker-entrypoint.sh` - Script สำหรับรัน migrations และ seed database
- `.dockerignore` - ไฟล์ที่ต้อง ignore เมื่อ build Docker image
- `.env.example` - ตัวอย่างไฟล์ environment variables
- `DEPLOYMENT.md` - คู่มือการติดตั้งแบบละเอียด

## 🚀 Quick Start

### 1. เตรียมไฟล์

```bash
# Clone หรืออัพโหลดโปรเจกต์
git clone https://github.com/sooksun/ssar.git
cd ssar

# สร้างไฟล์ .env จากตัวอย่าง
cp .env.example .env

# แก้ไขไฟล์ .env
nano .env
```

### 2. Build และ Start

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# ดู logs
docker compose logs -f
```

### 3. ตรวจสอบการทำงาน

```bash
# ตรวจสอบ containers
docker compose ps

# ทดสอบ health check
curl http://localhost:3000/api/health

# เปิดเบราว์เซอร์
# http://localhost:3000
```

## 📝 Environment Variables

แก้ไขไฟล์ `.env` ตามความต้องการ:

```env
# Database
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=qa_external
MYSQL_USER=app
MYSQL_PASSWORD=your_secure_password

# Application
APP_PORT=3000
NEXTAUTH_URL=http://your-server-ip:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

## 🏗️ Build Process

### Multi-stage Build

1. **Dependencies Stage**: ติดตั้ง dependencies
2. **Builder Stage**: Generate Prisma Client และ build Next.js
3. **Runner Stage**: สร้าง production image ที่เล็กที่สุด

### Standalone Output

Next.js จะ build เป็น standalone mode ซึ่งรวม:
- Server code
- Static files
- Prisma Client

## 🔧 การใช้งาน

### Start Services

```bash
docker compose up -d
```

### Stop Services

```bash
docker compose down
```

### Restart Services

```bash
docker compose restart
```

### View Logs

```bash
# ทั้งหมด
docker compose logs

# Real-time
docker compose logs -f

# เฉพาะ service
docker compose logs -f web
docker compose logs -f db
```

### Execute Commands

```bash
# เข้าไปใน container
docker compose exec web sh
docker compose exec db bash

# รัน Prisma commands
docker compose exec web npx prisma studio
docker compose exec web npx prisma migrate dev
```

## 📦 Volumes

- `dbdata`: MySQL data directory
- `uploads`: Uploaded files directory

## 🔒 Security

- ใช้ non-root user (`nextjs`) ใน container
- ตั้งค่ารหัสผ่านที่ปลอดภัยใน `.env`
- ใช้ `NEXTAUTH_SECRET` ที่สร้างจาก `openssl rand -base64 32`
- ไม่ expose MySQL port ไปยัง public network (ถ้าไม่จำเป็น)

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# ตรวจสอบ logs
docker compose logs db

# ตรวจสอบ health check
docker compose ps
```

### Migration Failed

```bash
# เข้าไปใน container
docker compose exec web sh

# รัน migration ใหม่
npx prisma migrate deploy
```

### Build Failed

```bash
# ลบ cache และ build ใหม่
docker compose build --no-cache
```

## 📚 เอกสารเพิ่มเติม

ดู `DEPLOYMENT.md` สำหรับคำแนะนำการติดตั้งแบบละเอียด

