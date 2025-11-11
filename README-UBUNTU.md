# 🐧 คู่มือการติดตั้งบน Ubuntu Server (Native Installation)

คู่มือการติดตั้ง QA Evidence Center บน Ubuntu Server โดยไม่ใช้ Docker

## 📋 ข้อกำหนดเบื้องต้น

- Ubuntu Server 20.04 LTS หรือใหม่กว่า
- MySQL 8.0
- Node.js 20.x หรือใหม่กว่า
- npm หรือ yarn
- ffmpeg (สำหรับสร้าง thumbnail วิดีโอ)
- PM2 หรือ systemd (สำหรับรันแอปพลิเคชันเป็น service)

## 🚀 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: อัพเดทระบบ

```bash
sudo apt update
sudo apt upgrade -y
```

### ขั้นตอนที่ 2: ติดตั้ง Node.js 20.x

```bash
# ติดตั้ง Node.js 20.x ผ่าน NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ตรวจสอบเวอร์ชัน
node --version  # ควรแสดง v20.x.x
npm --version
```

### ขั้นตอนที่ 3: ติดตั้ง MySQL 8.0

```bash
# ติดตั้ง MySQL Server
sudo apt install -y mysql-server

# เริ่ม MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# ตั้งค่ารหัสผ่าน root (เลือกวิธีใดวิธีหนึ่ง)
# วิธีที่ 1: ใช้ mysql_secure_installation
sudo mysql_secure_installation

# วิธีที่ 2: ตั้งค่าผ่าน MySQL command line
sudo mysql
```

ใน MySQL prompt:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_secure_password';
FLUSH PRIVILEGES;
EXIT;
```

### ขั้นตอนที่ 4: สร้างฐานข้อมูลและผู้ใช้

```bash
sudo mysql -u root -p
```

ใน MySQL prompt:

```sql
-- สร้างฐานข้อมูล
CREATE DATABASE qa_external CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- สร้างผู้ใช้และให้สิทธิ์
CREATE USER 'app'@'localhost' IDENTIFIED BY 'your_secure_app_password';
GRANT ALL PRIVILEGES ON qa_external.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### ขั้นตอนที่ 5: ติดตั้ง ffmpeg

```bash
sudo apt install -y ffmpeg

# ตรวจสอบการติดตั้ง
ffmpeg -version
```

### ขั้นตอนที่ 6: Clone หรืออัพโหลดโปรเจกต์

```bash
# สร้างโฟลเดอร์สำหรับแอปพลิเคชัน
sudo mkdir -p /var/www
cd /var/www

# Clone repository (ถ้ามี)
git clone <repository-url> ssar
cd ssar

# หรืออัพโหลดไฟล์โปรเจกต์ผ่าน SCP/SFTP
```

### ขั้นตอนที่ 7: ติดตั้ง Dependencies

```bash
cd /var/www/ssar

# ติดตั้ง dependencies
npm install

# หรือใช้ yarn
# yarn install
```

### ขั้นตอนที่ 8: ตั้งค่า Environment Variables

```bash
# สร้างไฟล์ .env
cp .env.example .env
nano .env
```

แก้ไขไฟล์ `.env` ตามนี้:

```env
# Database Configuration
DATABASE_URL="mysql://app:your_secure_app_password@localhost:3306/qa_external?connection_limit=10"

# NextAuth Configuration
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"
# สร้าง secret ด้วยคำสั่ง: openssl rand -base64 32
NEXTAUTH_SECRET="your_generated_secret_here"

# Node Environment
NODE_ENV=production

# Port (optional, default 3000)
PORT=3000
```

**⚠️ สำคัญ**: 
- เปลี่ยน `your_secure_app_password` เป็นรหัสผ่านที่ตั้งไว้ในขั้นตอนที่ 4
- เปลี่ยน `YOUR_SERVER_IP` เป็น IP address หรือ domain ของ server
- สร้าง `NEXTAUTH_SECRET` ด้วยคำสั่ง: `openssl rand -base64 32`

### ขั้นตอนที่ 9: Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# รัน migrations
npx prisma migrate deploy

# Seed ข้อมูลเริ่มต้น (idempotent)
npm run db:seed
```

### ขั้นตอนที่ 10: Build แอปพลิเคชัน

```bash
# Build สำหรับ production
npm run build
```

### ขั้นตอนที่ 11: สร้างโฟลเดอร์สำหรับ Uploads

```bash
# สร้างโฟลเดอร์สำหรับเก็บไฟล์ที่อัพโหลด
mkdir -p public/uploads/evidence
mkdir -p public/uploads/external-evaluations

# ตั้งค่า permissions
chmod -R 755 public/uploads
```

### ขั้นตอนที่ 12: ตั้งค่า Process Manager (เลือกวิธีใดวิธีหนึ่ง)

#### วิธีที่ 1: ใช้ PM2 (แนะนำ)

```bash
# ติดตั้ง PM2 แบบ global
sudo npm install -g pm2

# เริ่มแอปพลิเคชัน
pm2 start npm --name "qa-evidence" -- start

# ตั้งค่าให้รันอัตโนมัติเมื่อ boot
pm2 startup
pm2 save

# ดูสถานะ
pm2 status
pm2 logs qa-evidence
```

#### วิธีที่ 2: ใช้ systemd

```bash
# สร้างไฟล์ service
sudo nano /etc/systemd/system/qa-evidence.service
```

เพิ่มเนื้อหาดังนี้:

```ini
[Unit]
Description=QA Evidence Center Next.js App
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ssar
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /var/www/ssar/.next/standalone/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**หมายเหตุ**: ถ้าใช้ standalone output ต้องแน่ใจว่า build แล้ว และ path ถูกต้อง

หรือถ้าไม่ใช้ standalone:

```ini
[Unit]
Description=QA Evidence Center Next.js App
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ssar
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

เริ่ม service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# เริ่ม service
sudo systemctl start qa-evidence

# ตั้งค่าให้รันอัตโนมัติเมื่อ boot
sudo systemctl enable qa-evidence

# ตรวจสอบสถานะ
sudo systemctl status qa-evidence

# ดู logs
sudo journalctl -u qa-evidence -f
```

### ขั้นตอนที่ 13: ตั้งค่า Reverse Proxy (Nginx)

```bash
# ติดตั้ง Nginx
sudo apt install -y nginx

# สร้างไฟล์ configuration
sudo nano /etc/nginx/sites-available/qa-evidence
```

เพิ่มเนื้อหาดังนี้:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # เพิ่มขนาด upload limit สำหรับวิดีโอขนาดใหญ่
    client_max_body_size 1000M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # เพิ่ม timeout สำหรับไฟล์ขนาดใหญ่
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

เปิดใช้งาน:

```bash
# สร้าง symbolic link
sudo ln -s /etc/nginx/sites-available/qa-evidence /etc/nginx/sites-enabled/

# ลบ default site (ถ้าต้องการ)
sudo rm /etc/nginx/sites-enabled/default

# ทดสอบ configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### ขั้นตอนที่ 14: ตั้งค่า Firewall

```bash
# เปิด port 80 และ 443 (ถ้าใช้ HTTPS)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# เปิด port 3000 เฉพาะ localhost (ไม่จำเป็นถ้าใช้ Nginx)
sudo ufw allow from 127.0.0.1 to any port 3000

# เปิดใช้งาน firewall
sudo ufw enable

# ตรวจสอบสถานะ
sudo ufw status
```

### ขั้นตอนที่ 15: ตั้งค่า SSL/HTTPS (แนะนำ - ใช้ Let's Encrypt)

```bash
# ติดตั้ง Certbot
sudo apt install -y certbot python3-certbot-nginx

# ขอ SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN

# ตั้งค่า auto-renewal
sudo certbot renew --dry-run
```

อัพเดทไฟล์ Nginx configuration เพื่อรองรับ HTTPS:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    # เพิ่มขนาด upload limit
    client_max_body_size 1000M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

## ✅ ตรวจสอบการทำงาน

### 1. ตรวจสอบ Application

```bash
# ตรวจสอบว่าแอปพลิเคชันรันอยู่
curl http://localhost:3000/api/health

# หรือเปิดเบราว์เซอร์
# http://YOUR_SERVER_IP หรือ https://YOUR_DOMAIN
```

### 2. ตรวจสอบ Logs

**ถ้าใช้ PM2:**
```bash
pm2 logs qa-evidence
pm2 monit
```

**ถ้าใช้ systemd:**
```bash
sudo journalctl -u qa-evidence -f
```

**ถ้าใช้ Nginx:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. ทดสอบ Login

- ไปที่ `/login`
- ใช้ credentials: `admin@example.com` / `admin123`

## 🔧 การบำรุงรักษา

### อัพเดทแอปพลิเคชัน

```bash
cd /var/www/ssar

# Pull code ใหม่ (ถ้าใช้ Git)
git pull

# ติดตั้ง dependencies ใหม่
npm install

# รัน migrations (ถ้ามี)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Build ใหม่
npm run build

# Restart application
# ถ้าใช้ PM2:
pm2 restart qa-evidence

# ถ้าใช้ systemd:
sudo systemctl restart qa-evidence
```

### Backup Database

```bash
# สร้าง backup
mysqldump -u app -p qa_external > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u app -p qa_external < backup_20240101_120000.sql
```

### Backup Uploads

```bash
# Backup โฟลเดอร์ uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz public/uploads/

# Restore
tar -xzf uploads_backup_20240101_120000.tar.gz
```

## 🐛 แก้ไขปัญหา

### แอปพลิเคชันไม่เริ่มทำงาน

1. ตรวจสอบ logs:
   ```bash
   pm2 logs qa-evidence
   # หรือ
   sudo journalctl -u qa-evidence -n 50
   ```

2. ตรวจสอบ environment variables:
   ```bash
   cat .env
   ```

3. ตรวจสอบ database connection:
   ```bash
   npm run db:test
   ```

### Database Connection Error

1. ตรวจสอบว่า MySQL รันอยู่:
   ```bash
   sudo systemctl status mysql
   ```

2. ทดสอบการเชื่อมต่อ:
   ```bash
   mysql -u app -p -h localhost qa_external
   ```

3. ตรวจสอบ DATABASE_URL ในไฟล์ `.env`

### Port 3000 ถูกใช้งานแล้ว

```bash
# ตรวจสอบ process ที่ใช้ port 3000
sudo lsof -i :3000

# หรือ
sudo netstat -tulpn | grep 3000

# Kill process (ถ้าจำเป็น)
sudo kill -9 <PID>
```

### Permission Denied

```bash
# ตั้งค่า ownership
sudo chown -R www-data:www-data /var/www/ssar

# ตั้งค่า permissions
sudo chmod -R 755 /var/www/ssar
sudo chmod -R 775 /var/www/ssar/public/uploads
```

## 📝 คำสั่งที่สำคัญ

```bash
# Development
npm run dev          # เริ่ม development server
npm run build        # Build สำหรับ production
npm run start        # เริ่ม production server

# Database
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # รัน migrations
npm run db:seed      # Seed ข้อมูล
npm run db:reset     # Reset database + seed
npx prisma studio    # เปิด Prisma Studio

# Process Management (PM2)
pm2 start npm --name "qa-evidence" -- start
pm2 stop qa-evidence
pm2 restart qa-evidence
pm2 delete qa-evidence
pm2 logs qa-evidence
pm2 monit

# Process Management (systemd)
sudo systemctl start qa-evidence
sudo systemctl stop qa-evidence
sudo systemctl restart qa-evidence
sudo systemctl status qa-evidence
```

## 🔒 Security Best Practices

1. **เปลี่ยนรหัสผ่าน default**: เปลี่ยนรหัสผ่าน admin และ database
2. **ใช้ HTTPS**: ตั้งค่า SSL certificate
3. **ตั้งค่า Firewall**: เปิดเฉพาะ port ที่จำเป็น
4. **อัพเดทระบบ**: รัน `sudo apt update && sudo apt upgrade` เป็นประจำ
5. **Backup**: สร้าง backup database และไฟล์เป็นประจำ
6. **Environment Variables**: เก็บไฟล์ `.env` ไว้ในที่ปลอดภัย
7. **Non-root User**: รันแอปพลิเคชันด้วย user ที่ไม่ใช่ root

## 📚 เอกสารเพิ่มเติม

- [README.md](./README.md) - เอกสารหลักของโปรเจกต์
- [README-DOCKER.md](./README-DOCKER.md) - คู่มือการติดตั้งด้วย Docker
- [context.md](./context.md) - Product context และ requirements

## 🆘 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา

