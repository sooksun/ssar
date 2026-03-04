# Tasks - QA Evidence Center

## Overview
เอกสารนี้รวม Prompt สำหรับเอเจนต์ย่อยแต่ละบทบาทในการพัฒนา QA Evidence Center

---

## 1. Database & Seed Engineer

### Objective
สร้าง Prisma migrations และ seed scripts แบบ idempotent สำหรับ populate ข้อมูลเริ่มต้น

### Tasks

#### 1.1 Prisma Migrations
- สร้าง initial migration จาก `schema.prisma`
- ตรวจสอบ indexes:
  - `Evidence(schoolId, academicYear, indicatorId, status)`
  - `EvidenceFile(evidenceId, isPrimary)`
  - `QAIndicator(standardId, code)` (unique constraint)
  - `UserSchoolRole(userId, schoolId)`

#### 1.2 Seed Script (`prisma/seed.ts`)
สร้าง seed แบบ idempotent สำหรับ:

**Roles** (4 roles):
- ADMIN: "ผู้ดูแลระบบ"
- QA_LEAD: "ผู้นำระบบ QA"
- TEACHER: "ครู"
- ASSESSOR: "ผู้ประเมิน"

**EduLevels** (2 levels):
- EARLY_CHILDHOOD: "ปฐมวัย"
- BASIC: "ขั้นพื้นฐาน"

**QAStandards** (สำหรับแต่ละ level):
- Level EARLY_CHILDHOOD: Standards 1-3 (ตัวอย่าง)
  - Standard 1: "มาตรฐานที่ 1"
  - Standard 2: "มาตรฐานที่ 2"
  - Standard 3: "มาตรฐานที่ 3"
- Level BASIC: Standards 1-3 (ตัวอย่าง)
  - Standard 1: "มาตรฐานที่ 1"
  - Standard 2: "มาตรฐานที่ 2"
  - Standard 3: "มาตรฐานที่ 3"

**QAIndicators** (สำหรับแต่ละ standard):
- Standard 1: Indicators 1.1, 1.2, 1.3 (ตัวอย่าง)
- Standard 2: Indicators 2.1, 2.2, 2.3 (ตัวอย่าง)
- Standard 3: Indicators 3.1, 3.2, 3.3 (ตัวอย่าง)

**QASubIndicators** (สำหรับแต่ละ indicator):
- Indicator 1.1: Sub-indicators 1, 2, 3 (ตัวอย่าง)
- Indicator 1.2: Sub-indicators 1, 2 (ตัวอย่าง)
- ... (ตามความเหมาะสม)

**Demo Data**:
- 1 demo school: "โรงเรียนบ้านพญาไพร"
- 1 admin user: email="admin@example.com", password="admin123" (hash ด้วย bcrypt)

### Implementation Notes
- ใช้ `upsert` สำหรับ idempotent operations
- ตรวจสอบ existence ก่อน insert
- ใช้ `findUnique` + `create` หรือ `upsert` ตามความเหมาะสม
- ใช้ transaction สำหรับ operations ที่เกี่ยวข้องกัน

### CLI Script
- สร้าง script `npm run db:reset` ใน `package.json`:
  ```json
  "db:reset": "prisma migrate reset --force && prisma db seed"
  ```

### Deliverables
- ✅ `prisma/migrations/[timestamp]_init/migration.sql`
- ✅ `prisma/seed.ts` (idempotent)
- ✅ `package.json` script: `db:reset`

---

## 2. Backend Engineer

### Objective
สร้าง server utilities สำหรับ evidence management

### Tasks

#### 2.1 Helper Functions (`lib/evidence.ts`)

**`thaiAcademicYear(d?: Date): number`**
- คำนวณปีการศึกษาไทย
- Logic: พ.ค.–ธ.ค. = ปีค.ศ. + 543, ม.ค.–เม.ย. = ปีค.ศ. + 542
- Default parameter: `new Date()`

**`nextEvidenceCode(indicatorId: bigint, academicYear: number): Promise<string>`**
- สร้างรหัสหลักฐานอัตโนมัติ
- Format: `${indicator.code}-${running2digits}`
- Logic:
  1. Query indicator เพื่อดึง `code`
  2. Count existing evidence สำหรับ indicator + academicYear (exclude deleted)
  3. Next number = count + 1
  4. Format: `String(nextNumber).padStart(2, '0')`
  5. Return: `${indicator.code}-${runningCode}`

#### 2.2 Unit Tests
- สร้าง `lib/__tests__/evidence.test.ts`
- Test cases:
  - `thaiFiscalYear()`: ตรวจสอบเดือนต.ค., ม.ค., ก.ย.
  - `nextEvidenceCode()`: ตรวจสอบการสร้างรหัส, running number

### Deliverables
- ✅ `lib/evidence.ts` (with both functions)
- ✅ `lib/__tests__/evidence.test.ts` (unit tests)

---

## 3. Frontend Engineer

### Objective
สร้าง UI components และ pages สำหรับ Evidence Center

### Tasks

#### 3.1 Evidence Form (`/evidence/new`)

**Dependent Dropdowns**:
- Level → Standard → Indicator
- ใช้ TanStack Query สำหรับ data fetching
- ใช้ shadcn Select component
- Disable dropdowns จนกว่าจะเลือก parent

**Auto-filled Fields**:
- Fiscal Year: ใช้ `thaiFiscalYear()` (client-side หรือ server action)
- Evidence Code: ใช้ `nextEvidenceCode()` (server action หลังเลือก indicator)

**Form Validation**:
- ใช้ Zod schema
- ใช้ shadcn Form component
- แสดง error messages

**Server Actions**:
- `createEvidence()`: สร้างหลักฐาน + autocode
- `getStandardsByLevel(levelId)`: ดึง standards
- `getIndicatorsByStandard(standardId)`: ดึง indicators

#### 3.2 Evidence Files Form (`/evidence/[id]/files`)

**Storage Type Switcher**:
- Radio buttons หรือ Tabs: LOCAL, GDRIVE, URL
- ใช้ Zustand สำหรับ state management

**Dynamic Fields**:
- เปลี่ยน storage type → แสดง fields ที่เกี่ยวข้อง
- LOCAL: storage_path
- GDRIVE: drive_file_id
- URL: external_url

**Primary Toggle**:
- Toggle switch สำหรับ isPrimary
- เมื่อตั้ง primary → server action reset ตัวอื่น

**Server Actions**:
- `addEvidenceFile()`: เพิ่มไฟล์
- `setPrimaryFile()`: ตั้ง primary + reset อื่น
- `deleteEvidenceFile()`: ลบไฟล์ (soft delete)

#### 3.3 Reviews Component (`/evidence/[id]/reviews`)

**Review Form**:
- Fields: reviewStatus, score, comment
- Auto-set reviewerId = current user

**Review List**:
- แสดงประวัติรีวิว
- Columns: Reviewer, Status, Score, Comment, Date

**Server Actions**:
- `createReview()`: สร้างรีวิว
- `getReviews(evidenceId)`: ดึงรีวิว

### Deliverables
- ✅ `/app/evidence/new/page.tsx`
- ✅ `/app/evidence/[id]/files/page.tsx`
- ✅ `/app/evidence/[id]/reviews/page.tsx`
- ✅ Server actions ใน `/app/actions/evidence.ts`
- ✅ Zod schemas ใน `/lib/validations/evidence.ts`

---

## 4. Data/Reports Engineer

### Objective
สร้าง queries และ views สำหรับรายงาน

### Tasks

#### 4.1 Readiness Report

**Prisma Query** (`lib/queries/readiness.ts`):
```typescript
async function getReadinessReport(schoolId: bigint, academicYear: number) {
  // Query evidence ตาม school + fiscal year
  // Group by standard
  // Calculate: total indicators, ready/approved count, percentage
  // Return: { standardId, standardName, total, ready, approved, percentage }[]
}
```

**API Route**: `GET /api/reports/readiness?schoolId&academicYear`

**UI Component**:
- Bar chart (recharts)
- Table with details

#### 4.2 Missing Report

**Prisma Query** (`lib/queries/missing.ts`):
```typescript
async function getMissingIndicators(schoolId: bigint, fiscalYear: number) {
  // Query all indicators for school's level
  // Left join with evidence
  // Filter: evidence is null or status = MISSING
  // Return: { indicatorId, indicatorCode, indicatorName, standardName }[]
}
```

**API Route**: `GET /api/reports/missing?schoolId&academicYear`

**UI Component**:
- Table with "Add Evidence" action

#### 4.3 Primary Files Report

**Prisma Query** (`lib/queries/files.ts`):
```typescript
async function getPrimaryFiles(schoolId: bigint, fiscalYear: number) {
  // Query evidence with primary files
  // Join EvidenceFile where isPrimary = true
  // Return: { evidenceId, evidenceCode, title, primaryFile: { storageType, url } }[]
}
```

**API Route**: `GET /api/reports/files?schoolId&academicYear`

**UI Component**:
- Table with "Open" links

### Deliverables
- ✅ `lib/queries/readiness.ts`
- ✅ `lib/queries/missing.ts`
- ✅ `lib/queries/files.ts`
- ✅ API routes: `/api/reports/*`
- ✅ UI pages: `/reports/readiness`, `/reports/missing`, `/reports/files`

---

## 5. Security Engineer

### Objective
Implement RBAC และ record scoping

### Tasks

#### 5.1 RBAC Middleware

**Middleware** (`middleware.ts`):
- ตรวจสอบ authentication
- ตรวจสอบ role permissions
- Redirect ถ้าไม่มีสิทธิ์

**Permission Matrix**:
- `/setup/*`: ADMIN, QA_LEAD
- `/admin/*`: ADMIN only
- `/evidence/new`: TEACHER, QA_LEAD, ADMIN
- `/evidence/[id]/status`: QA_LEAD, ASSESSOR, ADMIN
- `/reviews`: ASSESSOR, QA_LEAD, ADMIN

#### 5.2 Record Scoping

**School Scoping**:
- Query ตาม UserSchoolRole
- Filter evidence/reports ตามโรงเรียนที่ user มีสิทธิ์
- Server actions ตรวจสอบ school access

**Helper Function** (`lib/auth/scoping.ts`):
```typescript
async function getUserSchools(userId: bigint): Promise<bigint[]>
async function canAccessSchool(userId: bigint, schoolId: bigint): Promise<boolean>
```

#### 5.3 Audit Logging

**Helper Function** (`lib/audit.ts`):
```typescript
async function logAction(
  actorId: bigint,
  action: string,
  targetTable: string,
  targetId?: bigint,
  schoolId?: bigint,
  payload?: object
)
```

**Log Events**:
- CREATE_EVIDENCE
- UPDATE_EVIDENCE_STATUS
- UPLOAD_FILE
- CREATE_REVIEW
- LOGIN
- LOGOUT

### Deliverables
- ✅ `middleware.ts` (RBAC)
- ✅ `lib/auth/scoping.ts` (school scoping)
- ✅ `lib/audit.ts` (audit logging)
- ✅ Integration ใน server actions

---

## 6. DevOps Engineer

### Objective
Setup Docker และ environment configuration

### Tasks

#### 6.1 Docker Compose
- MySQL 8.0 service
- Next.js web service
- Environment variables mapping
- Volumes สำหรับ database
- Depends_on configuration

#### 6.2 Environment Variables
- `.env.example`:
  - DATABASE_URL
  - NEXTAUTH_SECRET
  - NEXTAUTH_URL
  - GOOGLE_CLIENT_ID (optional)
  - GOOGLE_CLIENT_SECRET (optional)

#### 6.3 Scripts
- `package.json` scripts:
  - `dev`: Next.js dev server
  - `build`: Production build
  - `start`: Production server
  - `lint`: ESLint
  - `db:reset`: Reset database + seed
  - `db:migrate`: Run migrations
  - `db:seed`: Run seed

#### 6.4 Dockerfile
- Multi-stage build
- Node.js 20+
- Copy package.json, install dependencies
- Copy source code
- Build Next.js app
- Run production server

### Deliverables
- ✅ `docker-compose.yml` (updated)
- ✅ `.env.example`
- ✅ `Dockerfile`
- ✅ `package.json` scripts

---

## 7. QA/Testing Engineer

### Objective
สร้าง tests สำหรับ main flows

### Tasks

#### 7.1 Unit Tests
- `lib/__tests__/evidence.test.ts`:
  - `thaiFiscalYear()` test cases
  - `nextEvidenceCode()` test cases

#### 7.2 E2E Tests (Playwright)
- Smoke test flow:
  1. Login (admin@example.com)
  2. Navigate to `/evidence/new`
  3. Fill form (select school, level, standard, indicator)
  4. Submit → verify evidence_code generated
  5. Navigate to `/evidence/[id]/files`
  6. Add file (URL type)
  7. Set as primary
  8. Navigate to `/evidence/[id]`
  9. Change status to READY
  10. Navigate to `/evidence/[id]/reviews`
  11. Create review (ACCEPTED)
  12. Verify status changed to APPROVED

### Deliverables
- ✅ Unit tests (Jest/Vitest)
- ✅ E2E tests (Playwright)
- ✅ Test configuration files

---

## 8. โปรแกรมเสริม (Extra Programs)

### Objective
ระบบบันทึก PA ครู, SAR ครู, ID plan ครู, และบันทึกการสอนชุมชน — รองรับทั้งอัปโหลดไฟล์และลิงก์ Google Drive; admin/ผอ. บันทึกแทนครูได้

### Tasks

#### 8.1 PA ครู (PA 1/ส, PA 2/ส, PA 3/ส)
- โมเดล `PATeacherDocument`: schoolId, userId, academicYear, documentType (PA1/PA2/PA3); unique ต่อคน/โรงเรียน/ปี
- API `POST/GET /api/pa/teacher-documents`: multipart (ไฟล์หรือ storageType=GDRIVE + storagePath); รองรับ forUserId
- หน้า `/pa`: section บันทึก PA 1/ส, 2/ส, 3/ส — เลือกโรงเรียน/ปี/ครู(ถ้า admin), อัปโหลดไฟล์หรือกรอกลิงก์ GDrive แล้วกดบันทึกลิงก์
- สิทธิ์: `canManageTeacherPaInSchool`, `isUserInSchool` (lib/auth/scoping.ts)

#### 8.2 SAR ครู และ ID plan ของครู
- โมเดล `TeacherSarDocument`, `TeacherIdPlan`: ต่อคน/โรงเรียน/ปี
- API: `/api/extra/teacher-sar`, `/api/extra/teacher-id-plan` (GET/POST, รองรับ forUserId)
- หน้า `/extra-programs/teacher`: section SAR ครู (อัปโหลด/ลิงก์ GDrive), section ID plan (กรอกรหัสแผน)

#### 8.3 บันทึกการสอนชุมชน
- โมเดล `CommunityTeachingRecord`: schoolId, userId, academicYear, semester (1 หรือ 2); unique ภาคเรียนละ 1 ฉบับต่อคน
- ฟิลด์: title, activityDate, location, summary, templateData, fileName, storageType, storagePath, externalUrl; template อ้างอิง docref/pp5.pdf
- API `GET/POST /api/extra/community-teaching`: รองรับ JSON (บันทึกข้อมูล) และ multipart (ไฟล์หรือ GDRIVE ลิงก์); forUserId
- หน้า `/extra-programs/community-teaching`: ฟอร์มโรงเรียน/ปี/ภาคเรียน/ครู, ชื่อกิจกรรม/วันที่/สถานที่/สรุป, บล็อกแนบไฟล์หรือลิงก์ GDrive (แบบ PA 1/ส), ลิงก์ดาวน์โหลด template pp5.pdf

#### 8.4 หน้าโปรแกรมเสริมและ Deploy
- หน้า `/extra-programs`: การ์ดลิงก์ไป PA, SAR/ID plan, บันทึกการสอนชุมชน
- สคริปต์ `scripts/check-db-tables.ts` และ `.mjs`: ตรวจตารางและคอลัมน์ที่แอปใช้ (รวม pateacherdocument, teachersardocument, teacheridplan, communityteachingrecord); รันด้วย `node scripts/check-db-tables.mjs` หรือ `npm run db:check-tables`
- เอกสาร deploy: PA_TEACHER_DOCUMENTS_DEPLOY.md, EXTRA_COMMUNITY_TEACHING_DEPLOY.md; SQL: PA_TEACHER_DOCUMENTS_ADD_USERID.sql, EXTRA_TEACHER_SAR_IDPLAN_TABLES.sql, EXTRA_COMMUNITY_TEACHING_TABLE.sql
- Dockerfile: สร้างโฟลเดอร์ public/uploads/pa-teacher-docs, teacher-sar, community-teaching

### Deliverables
- ✅ Prisma models: PATeacherDocument, TeacherSarDocument, TeacherIdPlan, CommunityTeachingRecord
- ✅ API routes: /api/pa/teacher-documents, /api/extra/teacher-sar, /api/extra/teacher-id-plan, /api/extra/community-teaching
- ✅ หน้า /pa (section PA ครู), /extra-programs/teacher, /extra-programs/community-teaching; การ์ดใน /extra-programs
- ✅ scripts/check-db-tables.ts, check-db-tables.mjs; npm run db:check-tables
- ✅ docs: PA_TEACHER_DOCUMENTS_DEPLOY.md, EXTRA_COMMUNITY_TEACHING_DEPLOY.md; SQL สำหรับตารางและ ADD_USERID
- ✅ Dockerfile โฟลเดอร์ upload ครบ
