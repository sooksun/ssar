# Roadmap - QA Evidence Center

## Epic 1: Foundation & Auth (Skeleton)

### Tasks
- [x] สร้าง Next.js 15 project (App Router)
- [x] ตั้งค่า TypeScript strict mode
- [x] ตั้งค่า ESLint + Prettier
- [x] ติดตั้งและตั้งค่า Tailwind CSS
- [x] ติดตั้งและตั้งค่า shadcn/ui
- [x] ติดตั้ง Prisma + MySQL
- [x] สร้าง Prisma schema ตาม schema.prisma
- [x] สร้าง initial migration
- [x] สร้าง seed script แบบ idempotent (roles, demo users, schools, levels, standards, indicators, sub-indicators)
- [x] ตั้งค่า NextAuth (Credentials provider)
- [x] สร้าง middleware สำหรับ RBAC
- [x] สร้าง helper functions: `thaiAcademicYear()`, `nextEvidenceCode()`
- [x] เขียน unit tests สำหรับ helpers

### Definition of Done
- ✅ Next.js app รันได้
- ✅ Prisma migrations ทำงาน
- ✅ Seed script รันซ้ำได้ (idempotent)
- ✅ Login ด้วย credentials ทำงาน
- ✅ RBAC middleware ทำงาน
- ✅ Unit tests ผ่าน

---

## Epic 2: QA Setup (Levels/Standards/Indicators/Subs)

### Tasks
- [x] หน้า CRUD สำหรับ EduLevels (`/setup/levels`)
- [x] หน้า CRUD สำหรับ QAStandards (`/setup/standards`) - dependent dropdown ตาม level
- [x] หน้า CRUD สำหรับ QAIndicators (`/setup/indicators`) - dependent dropdown ตาม standard
- [x] หน้า CRUD สำหรับ QASubIndicators (`/setup/subs`) - dependent dropdown ตาม indicator
- [x] API routes สำหรับ CRUD operations
- [x] CSV import สำหรับตัวชี้วัดย่อย (bulk upload)
- [x] Validation ด้วย Zod
- [x] Permission checks (ADMIN, QA_LEAD เท่านั้น)

### Definition of Done
- ✅ CRUD ทุกหน้าใช้งานได้
- ✅ Dependent dropdowns ทำงานถูกต้อง
- ✅ CSV import ทำงาน
- ✅ Validation ครบถ้วน
- ✅ Permission checks ทำงาน

---

## Epic 3: Evidence Center

### Tasks
- [x] หน้ารายการหลักฐาน (`/evidence`) - filter ตาม school, fiscal year, status
- [x] ฟอร์มเพิ่มหลักฐาน (`/evidence/new`):
  - Dependent dropdown: level → standard → indicator
  - Auto-generate evidence_code
  - Auto-set fiscal_year
  - Default status = PENDING
  - Default owner = current user
- [x] หน้ารายละเอียดหลักฐาน (`/evidence/[id]`)
- [x] หน้าการจัดการไฟล์ (`/evidence/[id]/files`):
  - Storage type switcher (LOCAL/GDRIVE/URL)
  - Dynamic fields ตาม storage type
  - Primary toggle (reset อื่นเมื่อตั้ง primary)
- [x] หน้ารีวิว (`/evidence/[id]/reviews`):
  - สร้างรีวิว (reviewStatus, score, comment)
  - แสดงประวัติรีวิว
- [x] API routes:
  - `POST /api/evidence` - สร้างหลักฐาน + autocode
  - `PATCH /api/evidence/:id/status` - เปลี่ยนสถานะ
  - `POST /api/evidence/:id/files` - เพิ่มไฟล์
  - `POST /api/reviews` - สร้างรีวิว
- [x] Server actions สำหรับ form submissions
- [x] Audit logging สำหรับการสร้าง/แก้ไขหลักฐาน

### Definition of Done
- ✅ ฟอร์มหลักฐานทำงานได้
- ✅ Autocode ทำงานถูกต้อง
- ✅ ไฟล์แนบได้ (LOCAL/GDRIVE/URL)
- ✅ Primary toggle ทำงาน
- ✅ รีวิวทำงาน
- ✅ Status workflow ถูกต้อง
- ✅ Audit logs บันทึก

---

## Epic 4: Evaluation & Reports

### Tasks
- [x] หน้าการประเมิน (`/evaluation`):
  - Self evaluation
  - External evaluation
  - ผูกกับ standard/indicator
- [x] Dashboard (`/dashboard`):
  - Bar chart: readiness % ต่อมาตรฐาน (recharts)
  - KPI card: overall readiness %
  - Table: last 10 reviews
  - Table: pending items
- [x] หน้ารายงานความพร้อม (`/reports/readiness`):
  - Filter ตาม school, fiscal year
  - แสดง % ต่อมาตรฐาน
- [x] หน้ารายการ Missing (`/reports/missing`):
  - รายการตัวชี้วัดที่ยังไม่มีหลักฐาน
  - Filter ตาม school, fiscal year
- [x] หน้ารายการไฟล์หลัก (`/reports/files`):
  - รายการหลักฐานพร้อมลิงก์เปิดไฟล์หลัก
- [x] API routes:
  - `GET /api/reports/readiness?schoolId&fiscalYear`
  - `GET /api/reports/missing?schoolId&fiscalYear`
  - `GET /api/reports/files?schoolId&fiscalYear`
- [x] Prisma queries หรือ SQL views สำหรับรายงาน

### Definition of Done
- ✅ Dashboard แสดงข้อมูลถูกต้อง
- ✅ Charts ทำงาน (recharts)
- ✅ รายงานความพร้อมถูกต้อง
- ✅ รายการ Missing ถูกต้อง
- ✅ ลิงก์เปิดไฟล์หลักทำงาน

---

## Epic 5: Admin & Audit & DevOps

### Tasks
- [x] หน้าจัดการผู้ใช้ (`/admin/users`)
- [x] หน้าจัดการบทบาท (`/admin/roles`)
- [x] หน้าจัดการโรงเรียน (`/admin/schools`)
- [x] หน้าจัดการ UserSchoolRole mapping (`/admin/school-roles`)
- [x] หน้า Audit logs (`/admin/audit`):
  - Filter ตาม action, user, school, date range
  - Export logs
- [x] Docker compose setup
- [x] Environment variables (.env.example)
- [x] Scripts: `npm run db:reset`
- [x] E2E tests (Playwright):
  - Smoke test: login → add evidence → attach file → mark READY → review
- [x] Unit tests สำหรับ helpers

### Definition of Done
- ✅ Admin pages ทำงาน
- ✅ Audit logs แสดงผล
- ✅ Docker compose ทำงาน
- ✅ E2E tests ผ่าน
- ✅ Unit tests ผ่าน

---

## Epic 6: โปรแกรมเสริม (Extra Programs)

### Tasks
- [x] PA ครู (PA 1/ส, PA 2/ส, PA 3/ส): ครู 1 คน 1 ชุด ต่อโรงเรียน ต่อปีการศึกษา (ผูก userId, schoolId, academicYear)
- [x] API และ UI PA teacher documents: อัปโหลดไฟล์ หรือลิงก์ Google Drive; admin/ผอ. บันทึกแทนครูได้ (forUserId)
- [x] SAR ครู: ส่ง SAR ครู ต่อคน ต่อโรงเรียน ต่อปี (TeacherSarDocument)
- [x] ID plan ของครู: บันทึกรหัสแผน (TeacherIdPlan) ต่อคน ต่อโรงเรียน ต่อปี
- [x] บันทึกการสอนชุมชน: ภาคเรียนละไม่เกิน 1 ฉบับต่อคน (CommunityTeachingRecord), template pp5.pdf, อัปโหลดไฟล์หรือลิงก์ GDrive แบบ PA 1/ส
- [x] หน้าโปรแกรมเสริม (`/extra-programs`): การ์ดลิงก์ไป PA, SAR/ID plan, บันทึกการสอนชุมชน
- [x] สคริปต์ตรวจสอบตาราง DB: `npm run db:check-tables` (scripts/check-db-tables.ts, .mjs) ตรวจ table/column ครบ
- [x] Deploy docs: PA_TEACHER_DOCUMENTS_DEPLOY.md, EXTRA_COMMUNITY_TEACHING_DEPLOY.md, SQL สำหรับตารางโปรแกรมเสริม
- [x] Docker: โฟลเดอร์ upload สำหรับ pa-teacher-docs, teacher-sar, community-teaching

### Definition of Done
- ✅ PA 1/ส, 2/ส, 3/ส บันทึกได้ทั้ง upload file และ Google Drive link
- ✅ SAR ครู และ ID plan ครู ใช้งานได้; admin/ผอ. เลือกครูแล้วบันทึกแทนได้
- ✅ บันทึกการสอนชุมชน ภาคเรียนละ 1 ฉบับต่อคน; แนบไฟล์หรือลิงก์ GDrive ได้
- ✅ db:check-tables รันได้ (node ไม่ใช้ tsx บนเซิร์ฟเวอร์)
- ✅ เอกสาร deploy และ SQL สำหรับตารางครบ

---

## KPI ทางเทคนิค

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint clean (no errors, no warnings)
- ✅ Prettier formatted
- ✅ Unit test coverage ≥ 70% (helpers)

### Performance
- ✅ Lighthouse score ≥ 85 (Performance, Accessibility, Best Practices, SEO)

### Security
- ✅ RBAC ทำงานถูกต้อง
- ✅ Record scoping ตามโรงเรียน
- ✅ Audit logs บันทึกครบ

### Data Integrity
- ✅ Seed scripts idempotent
- ✅ Migrations ทำงานถูกต้อง

---

## Definition of Done (รวม)

### Functional
- ✅ e2e flow: เพิ่มหลักฐาน → แนบไฟล์หลัก → mark READY → review ACCEPTED
- ✅ Dashboard readiness แสดงผลถูกต้อง
- ✅ Filter ปีงบ/โรงเรียน ทำงาน
- ✅ Autocode ทำงานถูกต้อง

### Technical
- ✅ TS strict, ESLint clean
- ✅ Lighthouse ≥ 85
- ✅ Seeds idempotent
- ✅ Basic tests ผ่าน (unit + smoke e2e)
