# Routes - QA Evidence Center

## Pages (App Router)

### Authentication
- `/login` - หน้าเข้าสู่ระบบ (NextAuth Credentials)
- `/logout` - ออกจากระบบ

### Dashboard
- `/dashboard` - หน้าแรกหลัง login
  - Bar chart: readiness % ต่อมาตรฐาน
  - KPI card: overall readiness %
  - Table: last 10 reviews
  - Table: pending items

### Setup (QA Configuration)
- `/setup/levels` - จัดการระดับการศึกษา (EARLY_CHILDHOOD, BASIC)
- `/setup/standards` - จัดการมาตรฐาน (dependent: level)
- `/setup/indicators` - จัดการตัวชี้วัด (dependent: standard)
- `/setup/subs` - จัดการตัวชี้วัดย่อย (dependent: indicator)
  - Bulk import CSV

### Evidence Center
- `/evidence` - รายการหลักฐาน
  - Filter: school, academic year, status, indicator
  - Search: title, evidence_code
- `/evidence/new` - เพิ่มหลักฐานใหม่
  - Dependent dropdown: level → standard → indicator
  - Auto-generate evidence_code
  - Auto-set academic year
- `/evidence/[id]` - รายละเอียดหลักฐาน
  - แสดงข้อมูลหลักฐาน
  - แสดงไฟล์ที่แนบ
  - แสดงรีวิว
  - เปลี่ยนสถานะ (ตามสิทธิ์)
- `/evidence/[id]/files` - จัดการไฟล์
  - เพิ่มไฟล์ (LOCAL/GDRIVE/URL)
  - กำหนด primary file
  - ลบไฟล์
- `/evidence/[id]/reviews` - รีวิวหลักฐาน
  - สร้างรีวิวใหม่
  - แสดงประวัติรีวิว

### Evaluation
- `/evaluation` - การประเมิน
  - Self evaluation
  - External evaluation
  - Filter: school, academic year, standard, indicator

### Reports
- `/reports/readiness` - รายงานความพร้อม
  - Filter: school, academic year
  - แสดง % ต่อมาตรฐาน
- `/reports/missing` - รายการ Missing
  - รายการตัวชี้วัดที่ยังไม่มีหลักฐาน
  - Filter: school, academic year
- `/reports/files` - รายการไฟล์หลัก
  - รายการหลักฐานพร้อมลิงก์เปิดไฟล์หลัก
  - Filter: school, academic year

### SAR
- `/sar` - รายการ SAR Reports
- `/sar/new` - สร้าง SAR Report ใหม่
- `/sar/[id]` - ดู/แก้ไข SAR Report

### Admin
- `/admin/users` - จัดการผู้ใช้
- `/admin/roles` - จัดการบทบาท
- `/admin/schools` - จัดการโรงเรียน
- `/admin/mappings` - จัดการ UserSchoolRole mapping
- `/admin/audit` - Audit logs
  - Filter: action, user, school, date range
  - Export logs

---

## API Routes (Route Handlers)

### Evidence
- `POST /api/evidence` - สร้างหลักฐานใหม่
  - Body: `{ schoolId, indicatorId, academicYear, title, description, ownerUserId, privacyLevel }`
  - Response: `{ id, evidenceCode, ... }`
  - Auto-generate evidence_code

- `GET /api/evidence` - รายการหลักฐาน
  - Query: `schoolId`, `academicYear`, `indicatorId`, `status`, `page`, `limit`
  - Response: `{ data: Evidence[], total, page, limit }`

- `GET /api/evidence/[id]` - รายละเอียดหลักฐาน
  - Response: `Evidence` with files, reviews

- `PATCH /api/evidence/[id]` - แก้ไขหลักฐาน
  - Body: `{ title?, description?, status?, privacyLevel? }`
  - Permission: owner, QA_LEAD, ASSESSOR

- `PATCH /api/evidence/[id]/status` - เปลี่ยนสถานะ
  - Body: `{ status: EvidenceStatus }`
  - Permission: QA_LEAD, ASSESSOR
  - Audit log

- `DELETE /api/evidence/[id]` - ลบหลักฐาน (soft delete)
  - Permission: owner, ADMIN

### Evidence Files
- `POST /api/evidence/[id]/files` - เพิ่มไฟล์
  - Body: `{ fileName, storageType, storagePath?, driveFileId?, externalUrl?, isPrimary, mimeType?, fileSize? }`
  - ถ้า isPrimary = true, reset ตัวอื่น
  - Audit log

- `GET /api/evidence/[id]/files` - รายการไฟล์
  - Response: `EvidenceFile[]`

- `PATCH /api/evidence/[id]/files/[fileId]` - แก้ไขไฟล์
  - Body: `{ isPrimary?, note? }`

- `DELETE /api/evidence/[id]/files/[fileId]` - ลบไฟล์ (soft delete)

### Reviews
- `POST /api/reviews` - สร้างรีวิว
  - Body: `{ evidenceId, reviewStatus, score?, comment? }`
  - Auto-set reviewerId = current user
  - Audit log

- `GET /api/evidence/[id]/reviews` - รายการรีวิว
  - Response: `EvidenceReview[]` with reviewer info

### Setup (QA Configuration)
- `GET /api/setup/levels` - รายการระดับการศึกษา
- `POST /api/setup/levels` - สร้างระดับการศึกษา (ADMIN only)
- `GET /api/setup/standards?levelId` - รายการมาตรฐาน
- `POST /api/setup/standards` - สร้างมาตรฐาน (ADMIN, QA_LEAD)
- `GET /api/setup/indicators?standardId` - รายการตัวชี้วัด
- `POST /api/setup/indicators` - สร้างตัวชี้วัด (ADMIN, QA_LEAD)
- `GET /api/setup/subs?indicatorId` - รายการตัวชี้วัดย่อย
- `POST /api/setup/subs` - สร้างตัวชี้วัดย่อย (ADMIN, QA_LEAD)
- `POST /api/import/subs` - CSV import ตัวชี้วัดย่อย (bulk)

### Reports
- `GET /api/reports/readiness` - รายงานความพร้อม
  - Query: `schoolId`, `academicYear`
  - Response: `{ standardId, standardName, total, ready, approved, percentage }[]`

- `GET /api/reports/missing` - รายการ Missing
  - Query: `schoolId`, `academicYear`
  - Response: `{ indicatorId, indicatorCode, indicatorName, standardName }[]`

- `GET /api/reports/files` - รายการไฟล์หลัก
  - Query: `schoolId`, `academicYear`
  - Response: `{ evidenceId, evidenceCode, title, primaryFile: { storageType, url } }[]`

### Evaluation
- `GET /api/evaluation` - รายการการประเมิน
  - Query: `schoolId`, `academicYear`, `standardId`, `indicatorId`, `evalType`
- `POST /api/evaluation` - สร้างการประเมิน
  - Body: `{ schoolId, academicYear, standardId, indicatorId?, evalType, score?, comment? }`

### Admin
- `GET /api/admin/users` - รายการผู้ใช้
- `POST /api/admin/users` - สร้างผู้ใช้ (ADMIN only)
- `GET /api/admin/schools` - รายการโรงเรียน
- `POST /api/admin/schools` - สร้างโรงเรียน (ADMIN only)
- `GET /api/admin/audit` - Audit logs
  - Query: `action?`, `userId?`, `schoolId?`, `startDate?`, `endDate?`, `page`, `limit`

---

## Middleware

### Authentication
- `/api/*` (except `/api/auth/*`) - ต้อง login
- `/dashboard`, `/setup/*`, `/evidence/*`, `/evaluation`, `/reports/*`, `/sar`, `/admin/*` - ต้อง login

### RBAC
- `/setup/*` - ADMIN, QA_LEAD
- `/admin/*` - ADMIN only
- `/evidence` (index, detail) - USER must have matching school (`UserSchoolRole`)
- `/evidence/new` - TEACHER, QA_LEAD, ADMIN
- `/evidence/[id]/edit` - TEACHER, QA_LEAD, ADMIN (must belong to evidence school)
- `/evidence/[id]/files` - TEACHER, QA_LEAD, ADMIN (must belong to evidence school)
- `/evidence/[id]/reviews` - ASSESSOR, QA_LEAD, ADMIN (must belong to evidence school)
- `/evidence/[id]/status` - QA_LEAD, ASSESSOR, ADMIN (API)
- `/reviews` (API) - ASSESSOR, QA_LEAD, ADMIN (must belong to evidence school)
- `/evaluation` - [TBD: check SELECT permission vs. school membership]

### School Scoping
- `/evidence/*` - ดูได้เฉพาะโรงเรียนที่ user มีสิทธิ์ (UserSchoolRole)
- `/reports/*` - filter ตามโรงเรียนที่ user มีสิทธิ์