# QA Evidence Center (สมศ.)

ระบบจัดการหลักฐานการประกันคุณภาพภายนอกสำหรับสำนักงานรับรองมาตรฐานและประเมินคุณภาพการศึกษา (สมศ.)

## 📋 สารบัญ

- [ภาพรวม](#ภาพรวม)
- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจ็กต์](#โครงสร้างโปรเจ็กต์)
- [การติดตั้งและเริ่มต้น](#การติดตั้งและเริ่มต้น)
- [คำสั่งที่สำคัญ](#คำสั่งที่สำคัญ)
- [เอกสารประกอบ](#เอกสารประกอบ)

## ภาพรวม

ระบบ QA Evidence Center ถูกออกแบบมาเพื่อเก็บและจัดการหลักฐานเชิงดิจิทัลสำหรับการประเมินคุณภาพภายนอก โดยรองรับ 2 ระดับการศึกษา:
- **EARLY_CHILDHOOD**: ระดับปฐมวัย
- **BASIC**: ระดับขั้นพื้นฐาน

### คุณสมบัติหลัก

- จัดการหลักฐาน (Evidence) พร้อมระบบ autocode
- แนบไฟล์/ลิงก์ (LOCAL/Google Drive/URL)
- รีวิวและอนุมัติหลักฐาน
- Dashboard และรายงานความพร้อม
- RBAC และ School Scoping
- Audit Logging

### บทบาทผู้ใช้

- **ADMIN**: จัดการทุกอย่างในระบบ
- **QA_LEAD**: นำระบบ QA ของโรงเรียน
- **TEACHER**: สร้าง/แก้ไขหลักฐานของตนเอง
- **ASSESSOR**: อ่านทั้งหมด + รีวิว/ให้คะแนน

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: MySQL 8.0 + Prisma ORM
- **Auth**: NextAuth.js (Credentials)
- **UI**: Tailwind CSS + shadcn/ui
- **Icons**: lucide-react
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: recharts
- **Code Quality**: ESLint + Prettier

## โครงสร้างโปรเจ็กต์

```
ssar/
├── context.md          # Product context และ requirements
├── plan.md             # Roadmap และ EPICs
├── routes.md           # Routes และ API endpoints
├── ui-spec.md          # UI/UX specifications
├── tasks.md            # Tasks สำหรับแต่ละบทบาท
├── acceptance.md       # Acceptance criteria
├── schema.prisma       # Prisma schema
├── .cursorrules        # Project rules สำหรับ Cursor
├── .env.example        # Environment variables template
└── lib/
    └── evidence.ts     # Helper functions (thaiAcademicYear, nextEvidenceCode)
```

## การติดตั้งและเริ่มต้น

### ข้อกำหนดเบื้องต้น

- Node.js 20+
- MySQL 8.0 (หรือใช้ Docker)
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

1. **Clone repository** (ถ้ามี)
   ```bash
   git clone <repository-url>
   cd ssar
   ```

2. **ติดตั้ง dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   ```bash
   cp .env.example .env
   ```
   แก้ไข `.env` ตามความเหมาะสม:
   ```env
   DATABASE_URL="mysql://app:app123@localhost:3306/qa_external?schema=public"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Setup Database**
   ```bash
   # สร้าง Prisma client
   npx prisma generate

   # รัน migrations
   npx prisma migrate dev --name init

   # Seed ข้อมูลเริ่มต้น (idempotent)
   npm run db:reset
   ```

5. **เริ่มต้น Development Server**
   ```bash
   npm run dev
   ```

6. **เปิดเบราว์เซอร์**
   - ไปที่ `http://localhost:3000`
   - Login ด้วย: `admin@example.com` / `admin123`
   
      Login credentials:
         [ADMIN] admin@example.com / admin123
         [QA_LEAD] qalead@example.com / qalead123
         [TEACHER] teacher@example.com / teacher123
         [ASSESSOR] assessor@example.com / assessor123
         [SCHOOL_DIRECTOR] director@example.com / director123
         [AREA_ADMIN] areaadmin@example.com / areaadmin123


## คำสั่งที่สำคัญ

### Development
```bash
npm run dev          # เริ่ม development server (localhost:3000)
npm run lint         # รัน ESLint
```

### Database
```bash
npm run db:reset     # Reset database + seed (idempotent)
npm run db:migrate   # รัน migrations
npm run db:seed      # รัน seed script
npx prisma studio    # เปิด Prisma Studio (GUI)
```

### Testing
```bash
npm test             # รัน unit tests
npm run test:e2e     # รัน E2E tests (Playwright)
```

## เอกสารประกอบ

### เอกสารหลัก

- **[context.md](./context.md)**: Product context, requirements, และ workflows
- **[plan.md](./plan.md)**: Roadmap, EPICs, และ Definition of Done
- **[routes.md](./routes.md)**: Routes และ API endpoints
- **[ui-spec.md](./ui-spec.md)**: UI/UX specifications
- **[tasks.md](./tasks.md)**: Tasks สำหรับแต่ละบทบาท (DB, Backend, Frontend, etc.)
- **[acceptance.md](./acceptance.md)**: Acceptance criteria และ test scenarios

### Schema

- **[schema.prisma](./prisma/schema.prisma)**: Prisma schema definition
  - Models: School, User, Role, UserSchoolRole, EduLevel, QAStandard, QAIndicator, QASubIndicator, Evidence, EvidenceFile, EvidenceReview, Evaluation, SarReport, ExternalAssessment, AuditLog

### Helper Functions

- **[lib/evidence.ts](./lib/evidence.ts)**:
  - `thaiAcademicYear(date?)`: คำนวณปีการศึกษาไทย (พ.ค.→เม.ย.)
  - `nextEvidenceCode(indicatorId, academicYear)`: สร้างรหัสหลักฐานอัตโนมัติ

## การใช้งานเบื้องต้น

### 1. Login
- ไปที่ `/login`
- ใช้ credentials: `admin@example.com` / `admin123`

### 2. สร้างหลักฐาน
- ไปที่ `/evidence/new`
- เลือก: โรงเรียน → ระดับการศึกษา → มาตรฐาน → ตัวชี้วัด
- ระบบจะสร้างรหัสหลักฐานอัตโนมัติ (เช่น 2.3-01)
- กรอกข้อมูลและบันทึก

### 3. แนบไฟล์
- ไปที่ `/evidence/[id]/files`
- เลือกประเภท: URL / YouTube / Google Drive / Canva / Link
- **สำหรับ URL (อัปโหลดไฟล์):**
  - **รูปภาพ**: อัปโหลดได้มากสุด 20 รูป (รูปแรกจะเป็น thumbnail)
  - **วิดีโอ**: อัปโหลดได้ 1 ไฟล์ ขนาดไม่เกิน 1000 MB (จะสร้าง thumbnail อัตโนมัติ)
  - **PDF**: อัปโหลดได้ตามปกติ
- ระบุข้อมูลตามประเภทที่เลือก
- กำหนดไฟล์หลัก (primary file) - เฉพาะรูปภาพเท่านั้น

### 4. ดู Dashboard
- ไปที่ `/dashboard`
- ดูความพร้อมหลักฐานต่อมาตรฐาน
- ดู KPI และรายการที่รอการดำเนินการ

### 5. รีวิวหลักฐาน
- ไปที่ `/evidence/[id]/reviews`
- สร้างรีวิว (สำหรับ ASSESSOR, QA_LEAD)
- เปลี่ยนสถานะหลักฐาน

## ปีงบประมาณไทย

ระบบนี้ใช้ปีการศึกษา (พ.ค.→เม.ย. ของปีถัดไป) ดังนี้:
- **พ.ค.–ธ.ค.**: ปีค.ศ. + 543
- **ม.ค.–เม.ย.**: ปีค.ศ. + 542

ตัวอย่าง: วันที่ 15 พ.ค. 2567 → ปีการศึกษา 2567
         วันที่ 10 ก.พ. 2568 → ปีการศึกษา 2567

## Evidence Code Format

รหัสหลักฐานมีรูปแบบ: `${indicator.code}-${running2digits}`

ตัวอย่าง:
- `2.3-01` (หลักฐานแรกของ indicator 2.3 ในปีงบประมาณนั้น)
- `2.3-02` (หลักฐานที่สอง)
- `1.1-01` (หลักฐานแรกของ indicator 1.1)

## Security & Access Control

- **RBAC**: Role-Based Access Control จาก `Role.code`
- **School Scoping**: ผู้ใช้เห็นเฉพาะข้อมูลของโรงเรียนที่ตนเองมีสิทธิ์ (`UserSchoolRole`)
- **Audit Logging**: บันทึก event สำคัญ (CREATE_EVIDENCE, UPDATE_STATUS, UPLOAD_FILE, etc.)

## File Storage

**ไม่เก็บไฟล์จริงในฐานข้อมูล** - เก็บเฉพาะ metadata:
- `storageType`: URL | YOUTUBE | GDRIVE | CANVA | LINK
- `storagePath`: path สำหรับไฟล์ local (URL type)
- `driveFileId`: Google Drive file ID (GDRIVE type)
- `externalUrl`: external URL (URL, CANVA, LINK types)
- `thumbnailUrl`: URL ของ thumbnail (วิดีโอและรูปแรกของกลุ่มรูปภาพ)
- `fileUrls`: JSON array สำหรับเก็บหลายรูปภาพ (URL type, images only)

### การอัปโหลดไฟล์

**รูปภาพ (URL type):**
- อัปโหลดได้ครั้งละหลายรูป แต่ไม่เกิน 20 รูป
- รูปแรกจะถูกใช้เป็น thumbnail ของกลุ่ม
- เก็บเป็น JSON array ใน field `fileUrls` ของ record เดียว
- เก็บใน folder `/public/uploads/evidence/[id]/images/`

**วิดีโอ (URL type):**
- อัปโหลดได้เพียง 1 ไฟล์ต่อครั้ง
- ขนาดไม่เกิน 1000 MB
- ระบบจะสร้าง thumbnail อัตโนมัติจาก frame ที่ 10 วินาที (ใช้ ffmpeg)
- เก็บใน folder `/public/uploads/evidence/[id]/videos/`
- ไม่สามารถตั้งเป็นไฟล์หลักได้

**PDF และไฟล์อื่น (URL type):**
- อัปโหลดได้ตามปกติ
- เก็บใน folder `/public/uploads/evidence/[id]/` ตามประเภท

### การแสดงผลไฟล์

- **รูปภาพ**: แสดงในรูปแบบ Responsive Image Gallery พร้อมคำอธิบาย
- **วิดีโอ**: แสดงด้วย `<video>` tag พร้อม controls
- **YouTube/Google Drive/Canva/Link**: แสดงด้วย `<iframe>` embed

## Development Guidelines

ดูรายละเอียดใน [.cursorrules](./.cursorrules) สำหรับ:
- Code style และ conventions
- Testing requirements
- Security best practices
- Performance targets

## License

[ระบุ license ตามความเหมาะสม]

## Support

[ระบุช่องทางติดต่อหรือ support]


## การแก้ไขปัญหา File Upload

### ปัญหา: อัปโหลดวิดีโอขนาดใหญ่ไม่ได้

**อาการ:**
- Error: "Failed to parse body as FormData"
- Error: "Request body exceeded 10MB"
- Request body consumed: true

**สาเหตุ:**
1. Middleware มี body size limit 10MB โดย default
2. Middleware อ่าน request body ไปแล้วก่อนถึง API route

**วิธีแก้ไข:**
1. เพิ่ม `middlewareClientMaxBodySize: '1000mb'` ใน `next.config.js`
2. Exclude API route `/api/evidence/[id]/files` จาก middleware matcher
3. ใช้ API Route แทน Server Action สำหรับ file uploads
4. เพิ่ม `bodySizeLimit: '1000mb'` สำหรับ Server Actions

**ไฟล์ที่แก้ไข:**
- `next.config.js`: เพิ่ม `middlewareClientMaxBodySize` และ `bodySizeLimit`
- `middleware.ts`: Exclude API route จาก matcher
- `app/api/evidence/[id]/files/route.ts`: สร้าง API route สำหรับ file uploads
- `app/evidence/[id]/files/ui-files-form.tsx`: ใช้ API route สำหรับ file uploads

ดูรายละเอียดเพิ่มเติมใน [context.md](./context.md)
