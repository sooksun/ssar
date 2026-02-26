ไฟล์ PRD ที่ละเอียดและครอบคลุม:
PRD.md
Apply to PRD.md
# Product Requirements Document (PRD)# QA Evidence Center (สมศ.) - ระบบจัดการหลักฐานการประกันคุณภาพภายนอก**Version:** 1.0  **Last Updated:** 2024  **Status:** Development  **Target Audience:** AI Coding Assistant / Development Team---## 📋 สารบัญ1. [Executive Summary](#executive-summary)2. [Product Overview](#product-overview)3. [Technical Architecture](#technical-architecture)4. [Database Schema](#database-schema)5. [Functional Requirements](#functional-requirements)6. [API Specifications](#api-specifications)7. [UI/UX Specifications](#uiux-specifications)8. [Security & Authorization](#security--authorization)9. [File Management System](#file-management-system)10. [Testing Requirements](#testing-requirements)11. [Deployment & DevOps](#deployment--devops)12. [Development Guidelines](#development-guidelines)13. [Known Issues & Solutions](#known-issues--solutions)14. [Acceptance Criteria](#acceptance-criteria)---## Executive Summary### วัตถุประสงค์ระบบจัดการหลักฐานการประกันคุณภาพภายนอกสำหรับสำนักงานรับรองมาตรฐานและประเมินคุณภาพการศึกษา (สมศ.) เพื่อช่วยให้โรงเรียนสามารถจัดเก็บ จัดการ และติดตามหลักฐานการประกันคุณภาพได้อย่างมีประสิทธิภาพ### เป้าหมายหลัก- จัดการหลักฐานเชิงดิจิทัลพร้อมระบบ autocode- รองรับการอัปโหลดไฟล์หลายประเภท (รูปภาพ, PDF, วิดีโอ, YouTube, Google Drive, Canva, Link)- ระบบรีวิวและอนุมัติหลักฐาน- Dashboard และรายงานความพร้อม- RBAC และ School Scoping- Audit Logging### กลุ่มผู้ใช้- **ADMIN**: ผู้ดูแลระบบ- **QA_LEAD**: ผู้นำระบบ QA ของโรงเรียน- **TEACHER**: ครูผู้จัดทำหลักฐาน- **ASSESSOR**: ผู้ประเมินภายนอก---## Product Overview### คุณสมบัติหลัก#### 1. การจัดการหลักฐาน (Evidence Management)- สร้างหลักฐานพร้อมระบบ autocode (เช่น 2.3-01, 2.3-02)- จัดการหลักฐานตามปีการศึกษาไทย (พ.ค. - เม.ย.)- รองรับ 2 ระดับการศึกษา: EARLY_CHILDHOOD และ BASIC- สถานะหลักฐาน: MISSING, PENDING, READY, APPROVED, REJECTED#### 2. การจัดการไฟล์ (File Management)- **Storage Types**: URL, YOUTUBE, GDRIVE, CANVA, LINK- **รูปภาพ**: อัปโหลดได้หลายรูป (ไม่เกิน 20 รูป) พร้อม thumbnail- **วิดีโอ**: อัปโหลดได้ 1 ไฟล์ต่อครั้ง (ไม่เกิน 1000 MB) พร้อม thumbnail generation- **PDF และไฟล์อื่น**: อัปโหลดได้ตามปกติ- ระบบไฟล์หลัก (Primary File)#### 3. ระบบรีวิว (Review System)- รีวิวสามารถผูกกับไฟล์เฉพาะ (evidenceFileId) หรือหลักฐานทั้งหมด- รองรับหลายรีวิวต่อหลักฐาน- สถานะรีวิว: PENDING, APPROVED, REJECTED#### 4. Dashboard และรายงาน- แสดงความพร้อมหลักฐานต่อมาตรฐาน- KPI และรายการที่รอการดำเนินการ- รายงานไฟล์ที่ขาดหาย#### 5. ระบบสื่อการสอน (Teaching Media)- บันทึกสื่อการสอนสำหรับข้อ 2.6- อัปโหลดภาพ/วิดีโอการนำสื่อไปใช้#### 6. ระบบแผนการสอน (Lesson Plans)- บันทึกแผนการสอนและบันทึกหลังแผน- อัปโหลดไฟล์แผนการสอน (PLAN, REFLECTION, OTHER)---## Technical Architecture### Tech Stack#### Frontend- **Framework**: Next.js 15 (App Router)- **Language**: TypeScript (strict mode)- **UI Framework**: Tailwind CSS + shadcn/ui- **Icons**: lucide-react- **State Management**: Zustand (client-side), TanStack Query (server state)- **Form Management**: React Hook Form + Zod- **Charts**: recharts- **Font**: Kanit (สำหรับภาษาไทย)#### Backend- **Framework**: Next.js 15 (App Router) - Full-stack- **API**: Next.js API Routes + Server Actions- **ORM**: Prisma (MySQL 8.0)- **Authentication**: NextAuth.js (Credentials provider)- **Validation**: Zod schemas- **Password Hashing**: bcryptjs#### Database- **Database**: MySQL 8.0- **ORM**: Prisma- **Migration**: Prisma Migrate- **Seeding**: Idempotent seed scripts#### Development Tools- **Linting**: ESLint- **Formatting**: Prettier- **Testing**: Vitest (unit tests), Playwright (E2E tests)- **Type Checking**: TypeScript strict mode### Architecture Patterns#### 1. File Upload Architecture- **Problem**: Middleware body size limit และ request body consumed- **Solution**:  - Exclude API routes จาก middleware matcher  - ใช้ API Routes แทน Server Actions สำหรับ file uploads  - เพิ่ม `middlewareClientMaxBodySize: '1000mb'` ใน next.config.js  - เพิ่ม `bodySizeLimit: '1000mb'` สำหรับ Server Actions#### 2. Video Thumbnail Generation- ใช้ `ffmpeg` เพื่อสร้าง thumbnail จากวิดีโอ- Capture frame ที่ 10 วินาที- เก็บ thumbnail เป็น JPG ใน folder เดียวกับวิดีโอ#### 3. Image Gallery Display- Responsive Grid Layout- Layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`- ใช้ Next.js Image component พร้อม `unoptimized` prop---## Database Schema### Core Models#### Schoolmodel School {  id        BigInt   @id @default(autoincrement())  sc_id     BigInt   @unique  name      String  area_name String?  province  String?  level_type String?  del       Boolean  @default(false)  // Relations  users     UserSchoolRole[]  evidence  Evidence[]  // ... other relations}#### User & Authenticationmodel User {  id        BigInt   @id @default(autoincrement())  fullName  String  email     String   @unique  password  String?  // bcrypt hash  phone     String?  schoolId  BigInt?  // Relations  schoolRoles UserSchoolRole[]  evidenceOwned Evidence[]}model Role {  id    BigInt  @id @default(autoincrement())  code  String  @unique // ADMIN, QA_LEAD, TEACHER, ASSESSOR  name  String}model UserSchoolRole {  id       BigInt  @id @default(autoincrement())  userId   BigInt  schoolId BigInt  roleId   BigInt  isActive Boolean @default(true)  @@index([userId, schoolId])}#### Evidence Systemmodel Evidence {  id            BigInt        @id @default(autoincrement())  evidenceCode  String        @unique  schoolId     BigInt  indicatorId   BigInt  academicYear  Int  title         String  description   String?  status        EvidenceStatus @default(PENDING)  privacyLevel  PrivacyLevel  @default(INTERNAL)  ownerId       BigInt  // Relations  files         EvidenceFile[]  reviews       EvidenceReview[]}model EvidenceFile {  id           BigInt              @id @default(autoincrement())  evidenceId   BigInt  fileName     String  storageType  EvidenceStorageType @default(URL)  storagePath  String?  driveFileId  String?  externalUrl  String?  thumbnailUrl String?  fileUrls     Json? // JSON array สำหรับหลายรูปภาพ  mimeType     String?  fileSize     Int?  isPrimary    Boolean             @default(false)  uploadedBy   BigInt?  // Relations  reviews      EvidenceReview[]  @@index([evidenceId, isPrimary])}enum EvidenceStorageType {  YOUTUBE  GDRIVE  URL  CANVA  LINK}enum EvidenceStatus {  MISSING  PENDING  READY  APPROVED  REJECTED}#### QA Configurationamodel EduLevel {  id        Int          @id @default(autoincrement())  code      String       @unique // EARLY_CHILDHOOD, BASIC  nameTh    String  standards QAStandard[]}model QAStandard {  id        BigInt         @id @default(autoincrement())  levelId   Int  code      String  nameTh    String  sortNo    Int  indicators QAIndicator[]  @@unique([levelId, code])}model QAIndicator {  id           BigInt           @id @default(autoincrement())  standardId   BigInt  code         String  nameTh       String  sortNo       Int  subIndicators QASubIndicator[]  @@unique([standardId, code])}model QASubIndicator {  id          BigInt   @id @default(autoincrement())  indicatorId BigInt  itemNo      Int  textTh      String  @@unique([indicatorId, itemNo])}#### Teaching Media & Lesson Plansismamodel TeachingMedia {  id           BigInt              @id @default(autoincrement())  schoolId     BigInt  title        String  description  String?  teacherName  String?  academicYear Int  files        TeachingMediaFile[]}model LessonPlan {  id           BigInt           @id @default(autoincrement())  schoolId     BigInt  title        String  description  String?  teacherName  String?  subject      String?  gradeLevel   String?  usedDate     DateTime?  academicYear Int  reflection   String?  files        LessonPlanFile[]}model LessonPlanFile {  id           BigInt              @id @default(autoincrement())  lessonPlanId BigInt  fileType     LessonPlanFileType  // ... similar to EvidenceFile}enum LessonPlanFileType {  PLAN  REFLECTION  OTHER}### Indexes- `Evidence(schoolId, academicYear, indicatorId, status)`- `EvidenceFile(evidenceId, isPrimary)`- `QAIndicator(standardId, code)` (unique)- `UserSchoolRole(userId, schoolId)`---## Functional Requirements### FR-1: Evidence Management#### FR-1.1: สร้างหลักฐาน- **Input**: School, Level, Standard, Indicator, Title, Description- **Process**:  1. เลือกโรงเรียน → ระดับการศึกษา → มาตรฐาน → ตัวชี้วัด  2. ระบบสร้างรหัสหลักฐานอัตโนมัติ: `${indicator.code}-${running2digits}`  3. ระบบกำหนดปีการศึกษาอัตโนมัติ: พ.ค.–ธ.ค. = ปีค.ศ. + 543, ม.ค.–เม.ย. = ปีค.ศ. + 542  4. สถานะเริ่มต้น = PENDING  5. เจ้าของหลักฐาน = ผู้ใช้ปัจจุบัน (สำหรับ TEACHER)- **Output**: Evidence record พร้อม evidenceCode#### FR-1.2: แนบไฟล์- **Storage Types**:  - **URL**: อัปโหลดไฟล์โดยตรง    - รูปภาพ: หลายรูป (ไม่เกิน 20 รูป), รูปแรกเป็น thumbnail    - วิดีโอ: 1 ไฟล์ (ไม่เกิน 1000 MB), สร้าง thumbnail อัตโนมัติ    - PDF/อื่น: อัปโหลดได้ตามปกติ  - **YOUTUBE**: ฝังวิดีโอ YouTube  - **GDRIVE**: ฝังไฟล์ Google Drive  - **CANVA**: ฝังไฟล์ Canva  - **LINK**: เก็บลิงก์ URL- **Primary File**: ตั้งไฟล์หลักได้ (เฉพาะรูปภาพ), reset ตัวอื่นเมื่อตั้ง primary#### FR-1.3: เปลี่ยนสถานะ- **TEACHER**: PENDING, READY- **QA_LEAD, ASSESSOR**: READY, APPROVED, REJECTED- **ADMIN**: ทุกสถานะ#### FR-1.4: รีวิวหลักฐาน- **Reviewer**: ASSESSOR, QA_LEAD- **Fields**: reviewStatus (NEED_MORE, ACCEPTED, REJECTED), score (optional), comment (optional)- **Binding**: รีวิวสามารถผูกกับไฟล์เฉพาะ (evidenceFileId) หรือหลักฐานทั้งหมด### FR-2: Dashboard & Reports#### FR-2.1: Dashboard- Bar chart: ความพร้อม % ต่อมาตรฐาน- KPI cards: Overall Readiness %, Total Evidence, Pending Reviews, Missing Evidence- Tables: รีวิวล่าสุด (10 รายการ), รายการที่รอการดำเนินการ (10 รายการ)- Filters: School, Academic Year#### FR-2.2: Readiness Report- แสดง % ความพร้อมต่อมาตรฐาน- Filter: School, Academic Year- Table: มาตรฐาน, จำนวนตัวชี้วัดทั้งหมด, จำนวนที่ Ready, จำนวนที่ Approved, เปอร์เซ็นต์#### FR-2.3: Missing Report- แสดงรายการตัวชี้วัดที่ยังไม่มีหลักฐาน- Filter: School, Academic Year, Level, Standard- Action: "เพิ่มหลักฐาน" (link ไป `/evidence/new?indicatorId=...`)#### FR-2.4: Files Report- แสดงรายการหลักฐานพร้อมไฟล์หลัก- Filter: School, Academic Year- Link: เปิดไฟล์หลัก (ตาม storage type)### FR-3: Setup (QA Configuration)#### FR-3.1: CRUD Operations- **EduLevels**: CRUD ระดับการศึกษา- **QAStandards**: CRUD มาตรฐาน (dependent: level)- **QAIndicators**: CRUD ตัวชี้วัด (dependent: standard)- **QASubIndicators**: CRUD ตัวชี้วัดย่อย (dependent: indicator)- **Permission**: ADMIN, QA_LEAD#### FR-3.2: CSV Import- Bulk import สำหรับตัวชี้วัดย่อย- Format: CSV with columns: indicatorCode, itemNo, textTh### FR-4: Teaching Media System#### FR-4.1: CRUD Operations- สร้าง/แก้ไข/ลบ/ดู สื่อการสอน- Fields: title, description, teacherName, academicYear- อัปโหลดภาพ/วิดีโอการนำสื่อไปใช้- Routes: `/teaching-media` (list), `/teaching-media/new` (create), `/teaching-media/[id]` (detail)### FR-5: Lesson Plan System#### FR-5.1: CRUD Operations- สร้าง/แก้ไข/ลบ/ดู แผนการสอน- Fields: title, description, teacherName, subject, gradeLevel, usedDate, academicYear, reflection- อัปโหลดไฟล์: PLAN, REFLECTION, OTHER- Routes: `/lesson-plans` (list), `/lesson-plans/new` (create), `/lesson-plans/[id]` (detail)---## API Specifications### Evidence APIs#### POST /api/evidenceสร้างหลักฐานใหม่- **Body**:  {    schoolId: bigint,    indicatorId: bigint,    academicYear: number,    title: string,    description?: string,    ownerUserId?: bigint,    privacyLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'  }  - **Response**: `{ id, evidenceCode, ... }`- **Auto-generate**: evidenceCode#### GET /api/evidenceรายการหลักฐาน- **Query**: `schoolId`, `academicYear`, `indicatorId`, `status`, `page`, `limit`- **Response**: `{ data: Evidence[], total, page, limit }`#### PATCH /api/evidence/[id]/statusเปลี่ยนสถานะ- **Body**: `{ status: EvidenceStatus }`- **Permission**: QA_LEAD, ASSESSOR- **Audit log**: UPDATE_EVIDENCE_STATUS### Evidence Files APIs#### POST /api/evidence/[id]/filesเพิ่มไฟล์- **Body**: FormDatapescript  {    fileName: string,    storageType: 'URL' | 'YOUTUBE' | 'GDRIVE' | 'CANVA' | 'LINK',    storagePath?: string,    driveFileId?: string,    externalUrl?: string,    isPrimary?: boolean,    files?: File[] // สำหรับ URL type  }  - **Process**:  - สำหรับรูปภาพ: อัปโหลดหลายไฟล์, เก็บใน `fileUrls` (JSON array)  - สำหรับวิดีโอ: อัปโหลด 1 ไฟล์, สร้าง thumbnail  - สำหรับอื่น: อัปโหลดตามปกติ- **Audit log**: UPLOAD_FILE#### PATCH /api/evidence/[id]/files/[fileId]แก้ไขไฟล์- **Body**: `{ isPrimary?: boolean, note?: string }`- **Process**: ถ้า isPrimary = true, reset ตัวอื่น### Reviews APIs#### POST /api/reviewsสร้างรีวิว- **Body**:script  {    evidenceId: bigint,    evidenceFileId?: bigint,    reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED',    score?: number,    comment?: string  }  - **Auto-set**: reviewerId = current user- **Audit log**: CREATE_REVIEW### Reports APIs#### GET /api/reports/readinessรายงานความพร้อม- **Query**: `schoolId`, `academicYear`- **Response**:ipt  Array<{    standardId: bigint,    standardName: string,    total: number,    ready: number,    approved: number,    percentage: number  }>  #### GET /api/reports/missingรายการ Missing- **Query**: `schoolId`, `academicYear`- **Response**:    Array<{    indicatorId: bigint,    indicatorCode: string,    indicatorName: string,    standardName: string  }>  ### Setup APIs#### GET /api/setup/standards?levelIdรายการมาตรฐาน- **Query**: `levelId`- **Response**: `QAStandard[]`#### POST /api/setup/indicatorsสร้างตัวชี้วัด- **Body**: `{ standardId, code, nameTh, sortNo }`- **Permission**: ADMIN, QA_LEAD---## UI/UX Specifications### Design System#### Typography- **Primary Font**: Kanit (สำหรับภาษาไทย)- **Secondary Font**: System font stack (สำหรับภาษาอังกฤษ)- **Font Sizes**: ตาม Tailwind default scale#### Colors- ใช้ Tailwind default colors + shadcn/ui theme- Primary: blue- Success: green- Warning: yellow- Error: red#### Components- ใช้ shadcn/ui components- Icons: lucide-react- Charts: recharts### Key Pages#### 1. Evidence Form (`/evidence/new`)- **Dependent Dropdowns**: Level → Standard → Indicator- **Auto-filled Fields**: Academic Year, Evidence Code- **Validation**: Zod schema- **Actions**: Submit, Cancel, Save & Add Files#### 2. Evidence Files Form (`/evidence/[id]/files`)- **Storage Type Switcher**: Radio buttons หรือ Tabs- **Dynamic Fields**: เปลี่ยนตาม storage type- **Primary Toggle**: Toggle switch- **File List**: Grid หรือ Table#### 3. Dashboard (`/dashboard`)- **Layout**: Grid 2 columns (desktop), 1 column (mobile)- **Sections**:  1. Readiness Chart (Bar chart)  2. KPI Cards (4 cards)  3. Recent Reviews Table  4. Pending Items Table- **Filters**: School, Academic Year#### 4. Evidence Detail (`/evidence/[id]`)- **Layout**: Header + Tabs (Overview, Files, Reviews)- **Tabs**:  - Overview: Information card + Actions  - Files: File list + Add File button  - Reviews: Review list + Add Review button### Responsive Design- **Breakpoints**: Mobile (< 640px), Tablet (640px - 1024px), Desktop (> 1024px)- **Mobile Adaptations**: Single column, Stacked form fields, Collapsible sections### Accessibility (WCAG AA)- Semantic HTML- ARIA labels- Keyboard navigation- Focus indicators- Color contrast ≥ 4.5:1- Alt text สำหรับ images---## Security & Authorization### Authentication- **Provider**: NextAuth.js (Credentials)- **Password**: bcrypt hash (10 rounds)- **Session**: JWT-based### RBAC (Role-Based Access Control)#### Permission Matrix| Route | ADMIN | QA_LEAD | TEACHER | ASSESSOR ||-------|-------|---------|---------|----------|| `/admin/*` | ✅ | ❌ | ❌ | ❌ || `/setup/*` | ✅ | ✅ | ❌ | ❌ || `/evidence/new` | ✅ | ✅ | ✅ | ❌ || `/evidence/[id]/edit` | ✅ | ✅ | ✅* | ❌ || `/evidence/[id]/status` | ✅ | ✅ | ❌ | ✅ || `/evidence/[id]/reviews` | ✅ | ✅ | ❌ | ✅ |*TEACHER แก้ไขได้เฉพาะหลักฐานของตนเอง### School Scoping- ผู้ใช้เห็นเฉพาะข้อมูลของโรงเรียนที่ตนเองมีสิทธิ์ (`UserSchoolRole`)- Server actions ตรวจสอบ school access ก่อนดำเนินการ- Helper functions:    async function getUserSchools(userId: bigint): Promise<bigint[]>  async function canAccessSchool(userId: bigint, schoolId: bigint): Promise<boolean>  ### Audit Logging- **Events**:  - CREATE_EVIDENCE  - UPDATE_EVIDENCE_STATUS  - UPLOAD_FILE  - CREATE_REVIEW  - LOGIN  - LOGOUT- **Fields**: actor, action, target, targetId, schoolId, payload, timestamp- **View**: `/admin/audit` (ADMIN only)---## File Management System### Storage Types#### 1. URL (Local Upload)- **รูปภาพ**:  - อัปโหลดได้หลายรูป (ไม่เกิน 20 รูป)  - รูปแรกเป็น thumbnail  - เก็บใน `fileUrls` (JSON array)  - เก็บใน `/public/uploads/evidence/[id]/images/`- **วิดีโอ**:  - อัปโหลดได้ 1 ไฟล์ (ไม่เกิน 1000 MB)  - สร้าง thumbnail อัตโนมัติ (ffmpeg, frame ที่ 10 วินาที)  - เก็บใน `/public/uploads/evidence/[id]/videos/`- **PDF/อื่น**:  - อัปโหลดได้ตามปกติ  - เก็บใน `/public/uploads/evidence/[id]/files/`#### 2. YOUTUBE- ฝังวิดีโอ YouTube- เก็บ YouTube URL ใน `externalUrl`#### 3. GDRIVE- ฝังไฟล์ Google Drive- เก็บ Drive File ID ใน `driveFileId`- เก็บชื่อไฟล์ใน `fileName`#### 4. CANVA- ฝังไฟล์ Canva- เก็บ Canva Share Link ใน `externalUrl`#### 5. LINK- เก็บลิงก์ URL ภายนอก- เก็บ URL ใน `externalUrl`### File Upload Flow1. **Client Side** (`ui-files-form.tsx`):   - ตรวจสอบประเภทไฟล์   - Validation (จำนวนไฟล์, ขนาด)   - ส่ง FormData ไปยัง API route2. **API Route** (`app/api/evidence/[id]/files/route.ts`):   - ตรวจสอบ authentication และ authorization   - Parse FormData   - แยกไฟล์ตามประเภท   - อัปโหลดไฟล์ไปยัง `/public/uploads/`   - สร้าง thumbnail (สำหรับวิดีโอ)   - บันทึกข้อมูลลงฐานข้อมูล   - Revalidate paths3. **Database**:   - `EvidenceFile.fileUrls`: JSON array สำหรับหลายรูปภาพ   - `EvidenceFile.thumbnailUrl`: URL ของ thumbnail   - `EvidenceFile.externalUrl`: URL หลัก### Primary File- เฉพาะรูปภาพเท่านั้นที่สามารถตั้งเป็น primary ได้- เมื่อตั้ง primary → reset ตัวอื่นในหลักฐานเดียวกัน---## Testing Requirements### Unit Tests- **Framework**: Vitest- **Coverage**: ≥ 70% สำหรับ helpers- **Test Files**:  - `lib/__tests__/evidence.test.ts`: `thaiAcademicYear()`, `nextEvidenceCode()`### E2E Tests- **Framework**: Playwright- **Scenarios**:  1. Login → Add Evidence → Attach File → Mark READY → Review ACCEPTED  2. Dashboard → Reports → Missing → Add Evidence  3. Seed Idempotent### Test Data- Seed scripts แบบ idempotent- Demo users สำหรับแต่ละบทบาท- Demo school---## Deployment & DevOps### Environment VariablesDATABASE_URL="mysql://username:password@localhost:3306/qa_external?schema=public"NEXTAUTH_SECRET="generate-random-secret-here"NEXTAUTH_URL="http://localhost:3000"### Docker Setup- **MySQL 8.0**: Database service- **Next.js**: Web service- **Volumes**: Database data, Uploads folder- **Dependencies**: ffmpeg (สำหรับ video thumbnail)### Scripts{  "dev": "node scripts/run-dev.cjs",  "build": "next build",  "start": "next start",  "lint": "next lint",  "db:generate": "prisma generate",  "db:migrate": "prisma migrate dev",  "db:seed": "tsx prisma/seed.ts",  "db:reset": "prisma migrate reset --force && npm run db:seed",  "db:studio": "prisma studio",  "test": "vitest",  "test:e2e": "playwright test"}### Production Considerations- Disk space สำหรับไฟล์ที่อัปโหลด- External storage (S3, Google Cloud Storage) สำหรับไฟล์ขนาดใหญ่- Reverse proxy (Nginx) ให้รองรับไฟล์ขนาดใหญ่- Database backups---## Development Guidelines### Code Style- TypeScript strict mode- ESLint (no errors, no warnings)- Prettier formatted- async/await (no callbacks)- const/let (no var)- Named exports### File Structure
User & Authentication
model User {  id        BigInt   @id @default(autoincrement())  fullName  String  email     String   @unique  password  String?  // bcrypt hash  phone     String?  schoolId  BigInt?  // Relations  schoolRoles UserSchoolRole[]  evidenceOwned Evidence[]}model Role {  id    BigInt  @id @default(autoincrement())  code  String  @unique // ADMIN, QA_LEAD, TEACHER, ASSESSOR  name  String}model UserSchoolRole {  id       BigInt  @id @default(autoincrement())  userId   BigInt  schoolId BigInt  roleId   BigInt  isActive Boolean @default(true)  @@index([userId, schoolId])}imit 10MB  **วิธีแก้**: เพิ่ม `middlewareClientMaxBodySize: '1000mb'` ใน next.config.js### Issue 3: Video thumbnail ไม่ถูกสร้าง**สาเหตุ**: `ffmpeg` ไม่ได้ติดตั้ง  **วิธีแก้**: ตรวจสอบว่า `ffmpeg` ติดตั้งใน Docker image### Issue 4: Manifest.json syntax error**สาเหตุ**: Content-Type header ไม่ถูกต้อง  **วิธีแก้**: สร้าง API route เพื่อ serve manifest.json ด้วย Content-Type ที่ถูกต้อง### Issue 5: ไฟล์อัปโหลดแสดง 404**สาเหตุ**: Next.js dev server ไม่ detect ไฟล์ใหม่  **วิธีแก้**: Restart dev server หรือใช้ API route เพื่อ serve ไฟล์---## Acceptance Criteria### Functional- ✅ E2E flow: เพิ่มหลักฐาน → แนบไฟล์หลัก → mark READY → review ACCEPTED- ✅ Dashboard readiness แสดงผลถูกต้อง- ✅ Filter ปีการศึกษา/โรงเรียน ทำงาน- ✅ Autocode ทำงานถูกต้อง### Technical- ✅ TypeScript strict mode- ✅ ESLint clean (no errors, no warnings)- ✅ Lighthouse score ≥ 85- ✅ Seeds idempotent- ✅ Unit tests ผ่าน (coverage ≥ 70%)- ✅ E2E smoke test ผ่าน### Non-Functional- ✅ Page load time < 3 seconds- ✅ API response time < 500ms- ✅ WCAG AA accessibility- ✅ Responsive design---## Appendix### Helper Functions#### thaiAcademicYear(d?: Date): numberคำนวณปีการศึกษาไทย- พ.ค.–ธ.ค.: ปีค.ศ. + 543- ม.ค.–เม.ย.: ปีค.ศ. + 542#### nextEvidenceCode(indicatorId: bigint, academicYear: number): Promise<string>สร้างรหัสหลักฐานอัตโนมัติ- Format: `${indicator.code}-${running2digits}`- Logic: Count existing evidence + 1### Seed Data- **Roles**: ADMIN, QA_LEAD, TEACHER, ASSESSOR- **EduLevels**: EARLY_CHILDHOOD, BASIC- **QAStandards**: ตาม level (ดู seed-data.ts)- **QAIndicators**: ตาม standard (ดู seed-data.ts)- **QASubIndicators**: ตาม indicator (ดู seed-data.ts)- **Demo School**: โรงเรียนตัวอย่าง- **Demo Users**: admin@example.com / admin123---**End of PRD**
Evidence System
model Evidence {  id            BigInt        @id @default(autoincrement())  evidenceCode  String        @unique  schoolId     BigInt  indicatorId   BigInt  academicYear  Int  title         String  description   String?  status        EvidenceStatus @default(PENDING)  privacyLevel  PrivacyLevel  @default(INTERNAL)  ownerId       BigInt  // Relations  files         EvidenceFile[]  reviews       EvidenceReview[]}model EvidenceFile {  id           BigInt              @id @default(autoincrement())  evidenceId   BigInt  fileName     String  storageType  EvidenceStorageType @default(URL)  storagePath  String?  driveFileId  String?  externalUrl  String?  thumbnailUrl String?  fileUrls     Json? // JSON array สำหรับหลายรูปภาพ  mimeType     String?  fileSize     Int?  isPrimary    Boolean             @default(false)  uploadedBy   BigInt?  // Relations  reviews      EvidenceReview[]  @@index([evidenceId, isPrimary])}enum EvidenceStorageType {  YOUTUBE  GDRIVE  URL  CANVA  LINK}enum EvidenceStatus {  MISSING  PENDING  READY  APPROVED  REJECTED}
QA Configuration
model EduLevel {  id        Int          @id @default(autoincrement())  code      String       @unique // EARLY_CHILDHOOD, BASIC  nameTh    String  standards QAStandard[]}model QAStandard {  id        BigInt         @id @default(autoincrement())  levelId   Int  code      String  nameTh    String  sortNo    Int  indicators QAIndicator[]  @@unique([levelId, code])}model QAIndicator {  id           BigInt           @id @default(autoincrement())  standardId   BigInt  code         String  nameTh       String  sortNo       Int  subIndicators QASubIndicator[]  @@unique([standardId, code])}model QASubIndicator {  id          BigInt   @id @default(autoincrement())  indicatorId BigInt  itemNo      Int  textTh      String  @@unique([indicatorId, itemNo])}
Teaching Media & Lesson Plans
model TeachingMedia {  id           BigInt              @id @default(autoincrement())  schoolId     BigInt  title        String  description  String?  teacherName  String?  academicYear Int  files        TeachingMediaFile[]}model LessonPlan {  id           BigInt           @id @default(autoincrement())  schoolId     BigInt  title        String  description  String?  teacherName  String?  subject      String?  gradeLevel   String?  usedDate     DateTime?  academicYear Int  reflection   String?  files        LessonPlanFile[]}model LessonPlanFile {  id           BigInt              @id @default(autoincrement())  lessonPlanId BigInt  fileType     LessonPlanFileType  // ... similar to EvidenceFile}enum LessonPlanFileType {  PLAN  REFLECTION  OTHER}
Indexes
Evidence(schoolId, academicYear, indicatorId, status)
EvidenceFile(evidenceId, isPrimary)
QAIndicator(standardId, code) (unique)
UserSchoolRole(userId, schoolId)
Functional Requirements
FR-1: Evidence Management
FR-1.1: สร้างหลักฐาน
Input: School, Level, Standard, Indicator, Title, Description
Process:
เลือกโรงเรียน → ระดับการศึกษา → มาตรฐาน → ตัวชี้วัด
ระบบสร้างรหัสหลักฐานอัตโนมัติ: ${indicator.code}-${running2digits}
ระบบกำหนดปีการศึกษาอัตโนมัติ: พ.ค.–ธ.ค. = ปีค.ศ. + 543, ม.ค.–เม.ย. = ปีค.ศ. + 542
สถานะเริ่มต้น = PENDING
เจ้าของหลักฐาน = ผู้ใช้ปัจจุบัน (สำหรับ TEACHER)
Output: Evidence record พร้อม evidenceCode
FR-1.2: แนบไฟล์
Storage Types:
URL: อัปโหลดไฟล์โดยตรง
รูปภาพ: หลายรูป (ไม่เกิน 20 รูป), รูปแรกเป็น thumbnail
วิดีโอ: 1 ไฟล์ (ไม่เกิน 1000 MB), สร้าง thumbnail อัตโนมัติ
PDF/อื่น: อัปโหลดได้ตามปกติ
YOUTUBE: ฝังวิดีโอ YouTube
GDRIVE: ฝังไฟล์ Google Drive
CANVA: ฝังไฟล์ Canva
LINK: เก็บลิงก์ URL
Primary File: ตั้งไฟล์หลักได้ (เฉพาะรูปภาพ), reset ตัวอื่นเมื่อตั้ง primary
FR-1.3: เปลี่ยนสถานะ
TEACHER: PENDING, READY
QA_LEAD, ASSESSOR: READY, APPROVED, REJECTED
ADMIN: ทุกสถานะ
FR-1.4: รีวิวหลักฐาน
Reviewer: ASSESSOR, QA_LEAD
Fields: reviewStatus (NEED_MORE, ACCEPTED, REJECTED), score (optional), comment (optional)
Binding: รีวิวสามารถผูกกับไฟล์เฉพาะ (evidenceFileId) หรือหลักฐานทั้งหมด
FR-2: Dashboard & Reports
FR-2.1: Dashboard
Bar chart: ความพร้อม % ต่อมาตรฐาน
KPI cards: Overall Readiness %, Total Evidence, Pending Reviews, Missing Evidence
Tables: รีวิวล่าสุด (10 รายการ), รายการที่รอการดำเนินการ (10 รายการ)
Filters: School, Academic Year
FR-2.2: Readiness Report
แสดง % ความพร้อมต่อมาตรฐาน
Filter: School, Academic Year
Table: มาตรฐาน, จำนวนตัวชี้วัดทั้งหมด, จำนวนที่ Ready, จำนวนที่ Approved, เปอร์เซ็นต์
FR-2.3: Missing Report
แสดงรายการตัวชี้วัดที่ยังไม่มีหลักฐาน
Filter: School, Academic Year, Level, Standard
Action: "เพิ่มหลักฐาน" (link ไป /evidence/new?indicatorId=...)
FR-2.4: Files Report
แสดงรายการหลักฐานพร้อมไฟล์หลัก
Filter: School, Academic Year
Link: เปิดไฟล์หลัก (ตาม storage type)
FR-3: Setup (QA Configuration)
FR-3.1: CRUD Operations
EduLevels: CRUD ระดับการศึกษา
QAStandards: CRUD มาตรฐาน (dependent: level)
QAIndicators: CRUD ตัวชี้วัด (dependent: standard)
QASubIndicators: CRUD ตัวชี้วัดย่อย (dependent: indicator)
Permission: ADMIN, QA_LEAD
FR-3.2: CSV Import
Bulk import สำหรับตัวชี้วัดย่อย
Format: CSV with columns: indicatorCode, itemNo, textTh
FR-4: Teaching Media System
FR-4.1: CRUD Operations
สร้าง/แก้ไข/ลบ/ดู สื่อการสอน
Fields: title, description, teacherName, academicYear
อัปโหลดภาพ/วิดีโอการนำสื่อไปใช้
Routes: /teaching-media (list), /teaching-media/new (create), /teaching-media/[id] (detail)
FR-5: Lesson Plan System
FR-5.1: CRUD Operations
สร้าง/แก้ไข/ลบ/ดู แผนการสอน
Fields: title, description, teacherName, subject, gradeLevel, usedDate, academicYear, reflection
อัปโหลดไฟล์: PLAN, REFLECTION, OTHER
Routes: /lesson-plans (list), /lesson-plans/new (create), /lesson-plans/[id] (detail)
API Specifications
Evidence APIs
POST /api/evidence
สร้างหลักฐานใหม่
Body:
  {    schoolId: bigint,    indicatorId: bigint,    academicYear: number,    title: string,    description?: string,    ownerUserId?: bigint,    privacyLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'  }
Response: { id, evidenceCode, ... }
Auto-generate: evidenceCode
GET /api/evidence
รายการหลักฐาน
Query: schoolId, academicYear, indicatorId, status, page, limit
Response: { data: Evidence[], total, page, limit }
PATCH /api/evidence/[id]/status
เปลี่ยนสถานะ
Body: { status: EvidenceStatus }
Permission: QA_LEAD, ASSESSOR
Audit log: UPDATE_EVIDENCE_STATUS
Evidence Files APIs
POST /api/evidence/[id]/files
เพิ่มไฟล์
Body: FormData
  {    fileName: string,    storageType: 'URL' | 'YOUTUBE' | 'GDRIVE' | 'CANVA' | 'LINK',    storagePath?: string,    driveFileId?: string,    externalUrl?: string,    isPrimary?: boolean,    files?: File[] // สำหรับ URL type  }
Process:
สำหรับรูปภาพ: อัปโหลดหลายไฟล์, เก็บใน fileUrls (JSON array)
สำหรับวิดีโอ: อัปโหลด 1 ไฟล์, สร้าง thumbnail
สำหรับอื่น: อัปโหลดตามปกติ
Audit log: UPLOAD_FILE
PATCH /api/evidence/[id]/files/[fileId]
แก้ไขไฟล์
Body: { isPrimary?: boolean, note?: string }
Process: ถ้า isPrimary = true, reset ตัวอื่น
Reviews APIs
POST /api/reviews
สร้างรีวิว
Body:
  {    evidenceId: bigint,    evidenceFileId?: bigint,    reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED',    score?: number,    comment?: string  }
Auto-set: reviewerId = current user
Audit log: CREATE_REVIEW
Reports APIs
GET /api/reports/readiness
รายงานความพร้อม
Query: schoolId, academicYear
Response:
  Array<{    standardId: bigint,    standardName: string,    total: number,    ready: number,    approved: number,    percentage: number  }>
GET /api/reports/missing
รายการ Missing
Query: schoolId, academicYear
Response:
  Array<{    indicatorId: bigint,    indicatorCode: string,    indicatorName: string,    standardName: string  }>
Setup APIs
GET /api/setup/standards?levelId
รายการมาตรฐาน
Query: levelId
Response: QAStandard[]
POST /api/setup/indicators
สร้างตัวชี้วัด
Body: { standardId, code, nameTh, sortNo }
Permission: ADMIN, QA_LEAD
UI/UX Specifications
Design System
Typography
Primary Font: Kanit (สำหรับภาษาไทย)
Secondary Font: System font stack (สำหรับภาษาอังกฤษ)
Font Sizes: ตาม Tailwind default scale
Colors
ใช้ Tailwind default colors + shadcn/ui theme
Primary: blue
Success: green
Warning: yellow
Error: red
Components
ใช้ shadcn/ui components
Icons: lucide-react
Charts: recharts
Key Pages
1. Evidence Form (/evidence/new)
Dependent Dropdowns: Level → Standard → Indicator
Auto-filled Fields: Academic Year, Evidence Code
Validation: Zod schema
Actions: Submit, Cancel, Save & Add Files
2. Evidence Files Form (/evidence/[id]/files)
Storage Type Switcher: Radio buttons หรือ Tabs
Dynamic Fields: เปลี่ยนตาม storage type
Primary Toggle: Toggle switch
File List: Grid หรือ Table
3. Dashboard (/dashboard)
Layout: Grid 2 columns (desktop), 1 column (mobile)
Sections:
Readiness Chart (Bar chart)
KPI Cards (4 cards)
Recent Reviews Table
Pending Items Table
Filters: School, Academic Year
4. Evidence Detail (/evidence/[id])
Layout: Header + Tabs (Overview, Files, Reviews)
Tabs:
Overview: Information card + Actions
Files: File list + Add File button
Reviews: Review list + Add Review button
Responsive Design
Breakpoints: Mobile (< 640px), Tablet (640px - 1024px), Desktop (> 1024px)
Mobile Adaptations: Single column, Stacked form fields, Collapsible sections
Accessibility (WCAG AA)
Semantic HTML
ARIA labels
Keyboard navigation
Focus indicators
Color contrast ≥ 4.5:1
Alt text สำหรับ images
Security & Authorization
Authentication
Provider: NextAuth.js (Credentials)
Password: bcrypt hash (10 rounds)
Session: JWT-based
RBAC (Role-Based Access Control)
Permission Matrix
Route	ADMIN	QA_LEAD	TEACHER	ASSESSOR
/admin/*	✅	❌	❌	❌
/setup/*	✅	✅	❌	❌
/evidence/new	✅	✅	✅	❌
/evidence/[id]/edit	✅	✅	✅*	❌
/evidence/[id]/status	✅	✅	❌	✅
/evidence/[id]/reviews	✅	✅	❌	✅
TEACHER แก้ไขได้เฉพาะหลักฐานของตนเอง
School Scoping
ผู้ใช้เห็นเฉพาะข้อมูลของโรงเรียนที่ตนเองมีสิทธิ์ (UserSchoolRole)
Server actions ตรวจสอบ school access ก่อนดำเนินการ
Helper functions:
  async function getUserSchools(userId: bigint): Promise<bigint[]>  async function canAccessSchool(userId: bigint, schoolId: bigint): Promise<boolean>
Audit Logging
Events:
CREATE_EVIDENCE
UPDATE_EVIDENCE_STATUS
UPLOAD_FILE
CREATE_REVIEW
LOGIN
LOGOUT
Fields: actor, action, target, targetId, schoolId, payload, timestamp
View: /admin/audit (ADMIN only)
File Management System
Storage Types
1. URL (Local Upload)
รูปภาพ:
อัปโหลดได้หลายรูป (ไม่เกิน 20 รูป)
รูปแรกเป็น thumbnail
เก็บใน fileUrls (JSON array)
เก็บใน /public/uploads/evidence/[id]/images/
วิดีโอ:
อัปโหลดได้ 1 ไฟล์ (ไม่เกิน 1000 MB)
สร้าง thumbnail อัตโนมัติ (ffmpeg, frame ที่ 10 วินาที)
เก็บใน /public/uploads/evidence/[id]/videos/
PDF/อื่น:
อัปโหลดได้ตามปกติ
เก็บใน /public/uploads/evidence/[id]/files/
2. YOUTUBE
ฝังวิดีโอ YouTube
เก็บ YouTube URL ใน externalUrl
3. GDRIVE
ฝังไฟล์ Google Drive
เก็บ Drive File ID ใน driveFileId
เก็บชื่อไฟล์ใน fileName
4. CANVA
ฝังไฟล์ Canva
เก็บ Canva Share Link ใน externalUrl
5. LINK
เก็บลิงก์ URL ภายนอก
เก็บ URL ใน externalUrl
File Upload Flow
Client Side (ui-files-form.tsx):
ตรวจสอบประเภทไฟล์
Validation (จำนวนไฟล์, ขนาด)
ส่ง FormData ไปยัง API route
API Route (app/api/evidence/[id]/files/route.ts):
ตรวจสอบ authentication และ authorization
Parse FormData
แยกไฟล์ตามประเภท
อัปโหลดไฟล์ไปยัง /public/uploads/
สร้าง thumbnail (สำหรับวิดีโอ)
บันทึกข้อมูลลงฐานข้อมูล
Revalidate paths
Database:
EvidenceFile.fileUrls: JSON array สำหรับหลายรูปภาพ
EvidenceFile.thumbnailUrl: URL ของ thumbnail
EvidenceFile.externalUrl: URL หลัก
Primary File
เฉพาะรูปภาพเท่านั้นที่สามารถตั้งเป็น primary ได้
เมื่อตั้ง primary → reset ตัวอื่นในหลักฐานเดียวกัน
Testing Requirements
Unit Tests
Framework: Vitest
Coverage: ≥ 70% สำหรับ helpers
Test Files:
lib/__tests__/evidence.test.ts: thaiAcademicYear(), nextEvidenceCode()
E2E Tests
Framework: Playwright
Scenarios:
Login → Add Evidence → Attach File → Mark READY → Review ACCEPTED
Dashboard → Reports → Missing → Add Evidence
Seed Idempotent
Test Data
Seed scripts แบบ idempotent
Demo users สำหรับแต่ละบทบาท
Demo school
Deployment & DevOps
Environment Variables
DATABASE_URL="mysql://username:password@localhost:3306/qa_external?schema=public"NEXTAUTH_SECRET="generate-random-secret-here"NEXTAUTH_URL="http://localhost:3000"
Docker Setup
MySQL 8.0: Database service
Next.js: Web service
Volumes: Database data, Uploads folder
Dependencies: ffmpeg (สำหรับ video thumbnail)
Scripts
{  "dev": "node scripts/run-dev.cjs",  "build": "next build",  "start": "next start",  "lint": "next lint",  "db:generate": "prisma generate",  "db:migrate": "prisma migrate dev",  "db:seed": "tsx prisma/seed.ts",  "db:reset": "prisma migrate reset --force && npm run db:seed",  "db:studio": "prisma studio",  "test": "vitest",  "test:e2e": "playwright test"}
Production Considerations
Disk space สำหรับไฟล์ที่อัปโหลด
External storage (S3, Google Cloud Storage) สำหรับไฟล์ขนาดใหญ่
Reverse proxy (Nginx) ให้รองรับไฟล์ขนาดใหญ่
Database backups
Development Guidelines
Code Style
TypeScript strict mode
ESLint (no errors, no warnings)
Prettier formatted
async/await (no callbacks)
const/let (no var)
Named exports
File Structure
app/  ├── actions/          # Server Actions  ├── api/              # API Routes  ├── [routes]/         # Pages  └── layout.tsx        # Root layoutlib/  ├── auth/             # Authentication  ├── validations/      # Zod schemas  ├── queries/          # Database queries  └── evidence.ts       # Helper functionsprisma/  ├── schema.prisma     # Database schema  ├── seed.ts          # Seed script  └── migrations/       # Migrationscomponents/  └── ui/               # shadcn/ui componentspublic/  └── uploads/          # Uploaded files
Best Practices
ใช้ Server Actions สำหรับ form submissions
ใช้ API Routes สำหรับ file uploads
Validate ทุก input ด้วย Zod
ตรวจสอบ RBAC และ school scoping ในทุก route
Log critical actions ไปยัง AuditLog
ใช้ try-catch สำหรับ async operations
Return proper HTTP status codes
แสดง user-friendly error messages
Known Issues & Solutions
Issue 1: "Failed to parse body as FormData"
สาเหตุ: Middleware อ่าน request body ไปแล้ว
วิธีแก้: Exclude API route จาก middleware matcher
Issue 2: "Request body exceeded 10MB"
สาเหตุ: Middleware มี body size limit 10MB
วิธีแก้: เพิ่ม middlewareClientMaxBodySize: '1000mb' ใน next.config.js
Issue 3: Video thumbnail ไม่ถูกสร้าง
สาเหตุ: ffmpeg ไม่ได้ติดตั้ง
วิธีแก้: ตรวจสอบว่า ffmpeg ติดตั้งใน Docker image
Issue 4: Manifest.json syntax error
สาเหตุ: Content-Type header ไม่ถูกต้อง
วิธีแก้: สร้าง API route เพื่อ serve manifest.json ด้วย Content-Type ที่ถูกต้อง
Issue 5: ไฟล์อัปโหลดแสดง 404
สาเหตุ: Next.js dev server ไม่ detect ไฟล์ใหม่
วิธีแก้: Restart dev server หรือใช้ API route เพื่อ serve ไฟล์
Acceptance Criteria
Functional
✅ E2E flow: เพิ่มหลักฐาน → แนบไฟล์หลัก → mark READY → review ACCEPTED
✅ Dashboard readiness แสดงผลถูกต้อง
✅ Filter ปีการศึกษา/โรงเรียน ทำงาน
✅ Autocode ทำงานถูกต้อง
Technical
✅ TypeScript strict mode
✅ ESLint clean (no errors, no warnings)
✅ Lighthouse score ≥ 85
✅ Seeds idempotent
✅ Unit tests ผ่าน (coverage ≥ 70%)
✅ E2E smoke test ผ่าน
Non-Functional
✅ Page load time < 3 seconds
✅ API response time < 500ms
✅ WCAG AA accessibility
✅ Responsive design
Appendix
Helper Functions
thaiAcademicYear(d?: Date): number
คำนวณปีการศึกษาไทย
พ.ค.–ธ.ค.: ปีค.ศ. + 543
ม.ค.–เม.ย.: ปีค.ศ. + 542
nextEvidenceCode(indicatorId: bigint, academicYear: number): Promise<string>
สร้างรหัสหลักฐานอัตโนมัติ
Format: ${indicator.code}-${running2digits}
Logic: Count existing evidence + 1
Seed Data
Roles: ADMIN, QA_LEAD, TEACHER, ASSESSOR
EduLevels: EARLY_CHILDHOOD, BASIC
QAStandards: ตาม level (ดู seed-data.ts)
QAIndicators: ตาม standard (ดู seed-data.ts)
QASubIndicators: ตาม indicator (ดู seed-data.ts)
Demo School: โรงเรียนตัวอย่าง
Demo Users: admin@example.com / admin123
End of PRD
ไฟล์ PRD นี้ครอบคลุม:1. Executive Summary2. Product Overview3. Technical Architecture4. Database Schema5. Functional Requirements6. API Specifications7. UI/UX Specifications8. Security & Authorization9. File Management System10. Testing Requirements11. Deployment & DevOps12. Development Guidelines13. Known Issues & Solutions14. Acceptance Criteria