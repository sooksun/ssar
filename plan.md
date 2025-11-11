# Roadmap - QA Evidence Center

## Epic 1: Foundation & Auth (Skeleton)

### Tasks
- [ ] สร้าง Next.js 15 project (App Router)
- [ ] ตั้งค่า TypeScript strict mode
- [ ] ตั้งค่า ESLint + Prettier
- [ ] ติดตั้งและตั้งค่า Tailwind CSS
- [ ] ติดตั้งและตั้งค่า shadcn/ui
- [ ] ติดตั้ง Prisma + MySQL
- [ ] สร้าง Prisma schema ตาม schema.prisma
- [ ] สร้าง initial migration
- [ ] สร้าง seed script แบบ idempotent (roles, demo users, schools, levels, standards, indicators, sub-indicators)
- [ ] ตั้งค่า NextAuth (Credentials provider)
- [ ] สร้าง middleware สำหรับ RBAC
- [ ] สร้าง helper functions: `thaiFiscalYear()`, `nextEvidenceCode()`
- [ ] เขียน unit tests สำหรับ helpers

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
- [ ] หน้า CRUD สำหรับ EduLevels (`/setup/levels`)
- [ ] หน้า CRUD สำหรับ QAStandards (`/setup/standards`) - dependent dropdown ตาม level
- [ ] หน้า CRUD สำหรับ QAIndicators (`/setup/indicators`) - dependent dropdown ตาม standard
- [ ] หน้า CRUD สำหรับ QASubIndicators (`/setup/subs`) - dependent dropdown ตาม indicator
- [ ] API routes สำหรับ CRUD operations
- [ ] CSV import สำหรับตัวชี้วัดย่อย (bulk upload)
- [ ] Validation ด้วย Zod
- [ ] Permission checks (ADMIN, QA_LEAD เท่านั้น)

### Definition of Done
- ✅ CRUD ทุกหน้าใช้งานได้
- ✅ Dependent dropdowns ทำงานถูกต้อง
- ✅ CSV import ทำงาน
- ✅ Validation ครบถ้วน
- ✅ Permission checks ทำงาน

---

## Epic 3: Evidence Center

### Tasks
- [ ] หน้ารายการหลักฐาน (`/evidence`) - filter ตาม school, fiscal year, status
- [ ] ฟอร์มเพิ่มหลักฐาน (`/evidence/new`):
  - Dependent dropdown: level → standard → indicator
  - Auto-generate evidence_code
  - Auto-set fiscal_year
  - Default status = PENDING
  - Default owner = current user
- [ ] หน้ารายละเอียดหลักฐาน (`/evidence/[id]`)
- [ ] หน้าการจัดการไฟล์ (`/evidence/[id]/files`):
  - Storage type switcher (LOCAL/GDRIVE/URL)
  - Dynamic fields ตาม storage type
  - Primary toggle (reset อื่นเมื่อตั้ง primary)
- [ ] หน้ารีวิว (`/evidence/[id]/reviews`):
  - สร้างรีวิว (reviewStatus, score, comment)
  - แสดงประวัติรีวิว
- [ ] API routes:
  - `POST /api/evidence` - สร้างหลักฐาน + autocode
  - `PATCH /api/evidence/:id/status` - เปลี่ยนสถานะ
  - `POST /api/evidence/:id/files` - เพิ่มไฟล์
  - `POST /api/reviews` - สร้างรีวิว
- [ ] Server actions สำหรับ form submissions
- [ ] Audit logging สำหรับการสร้าง/แก้ไขหลักฐาน

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
- [ ] หน้าการประเมิน (`/evaluation`):
  - Self evaluation
  - External evaluation
  - ผูกกับ standard/indicator
- [ ] Dashboard (`/dashboard`):
  - Bar chart: readiness % ต่อมาตรฐาน (recharts)
  - KPI card: overall readiness %
  - Table: last 10 reviews
  - Table: pending items
- [ ] หน้ารายงานความพร้อม (`/reports/readiness`):
  - Filter ตาม school, fiscal year
  - แสดง % ต่อมาตรฐาน
- [ ] หน้ารายการ Missing (`/reports/missing`):
  - รายการตัวชี้วัดที่ยังไม่มีหลักฐาน
  - Filter ตาม school, fiscal year
- [ ] หน้ารายการไฟล์หลัก (`/reports/files`):
  - รายการหลักฐานพร้อมลิงก์เปิดไฟล์หลัก
- [ ] API routes:
  - `GET /api/reports/readiness?schoolId&fiscalYear`
  - `GET /api/reports/missing?schoolId&fiscalYear`
  - `GET /api/reports/files?schoolId&fiscalYear`
- [ ] Prisma queries หรือ SQL views สำหรับรายงาน

### Definition of Done
- ✅ Dashboard แสดงข้อมูลถูกต้อง
- ✅ Charts ทำงาน (recharts)
- ✅ รายงานความพร้อมถูกต้อง
- ✅ รายการ Missing ถูกต้อง
- ✅ ลิงก์เปิดไฟล์หลักทำงาน

---

## Epic 5: Admin & Audit & DevOps

### Tasks
- [ ] หน้าจัดการผู้ใช้ (`/admin/users`)
- [ ] หน้าจัดการบทบาท (`/admin/roles`)
- [ ] หน้าจัดการโรงเรียน (`/admin/schools`)
- [ ] หน้าจัดการ UserSchoolRole mapping
- [ ] หน้า Audit logs (`/admin/audit`):
  - Filter ตาม action, user, school, date range
  - Export logs
- [ ] Docker compose setup
- [ ] Environment variables (.env.example)
- [ ] Scripts: `npm run db:reset`
- [ ] E2E tests (Playwright):
  - Smoke test: login → add evidence → attach file → mark READY → review
- [ ] Unit tests สำหรับ helpers

### Definition of Done
- ✅ Admin pages ทำงาน
- ✅ Audit logs แสดงผล
- ✅ Docker compose ทำงาน
- ✅ E2E tests ผ่าน
- ✅ Unit tests ผ่าน

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
