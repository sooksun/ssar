# Acceptance Criteria - QA Evidence Center

## Functional Requirements

### 1. Evidence Management

#### 1.1 สร้างหลักฐาน
- ✅ **AC-1.1.1**: ผู้ใช้สามารถเลือกโรงเรียน → ระดับการศึกษา → มาตรฐาน → ตัวชี้วัด ได้
- ✅ **AC-1.1.2**: ระบบสร้างรหัสหลักฐานอัตโนมัติในรูปแบบ `${indicator.code}-${running2digits}` (เช่น 2.3-01, 2.3-02)
- ✅ **AC-1.1.3**: ระบบกำหนดปีงบประมาณอัตโนมัติตามวันที่ปัจจุบัน (ต.ค.–ธ.ค. = ปีค.ศ. + 544, ม.ค.–ก.ย. = ปีค.ศ. + 543)
- ✅ **AC-1.1.4**: สถานะเริ่มต้น = PENDING
- ✅ **AC-1.1.5**: เจ้าของหลักฐานเริ่มต้น = ผู้ใช้ปัจจุบัน (สำหรับ TEACHER)

#### 1.2 แนบไฟล์
- ✅ **AC-1.2.1**: ผู้ใช้สามารถเลือกประเภทการเก็บ: LOCAL / Google Drive / URL
- ✅ **AC-1.2.2**: ระบบแสดง fields ที่เกี่ยวข้องตามประเภทที่เลือก
- ✅ **AC-1.2.3**: ผู้ใช้สามารถกำหนดไฟล์หลัก (primary file) ได้
- ✅ **AC-1.2.4**: เมื่อตั้งไฟล์เป็น primary → ระบบ reset ไฟล์อื่นในหลักฐานเดียวกันให้ไม่เป็น primary
- ✅ **AC-1.2.5**: ผู้ใช้สามารถเปิดไฟล์หลักได้:
  - LOCAL: ดาวน์โหลดหรือเปิดผ่าน path
  - GDRIVE: เปิดลิงก์ `https://drive.google.com/file/d/[id]`
  - URL: เปิด external URL

#### 1.3 เปลี่ยนสถานะ
- ✅ **AC-1.3.1**: TEACHER สามารถเปลี่ยนสถานะเป็น PENDING, READY
- ✅ **AC-1.3.2**: QA_LEAD, ASSESSOR สามารถเปลี่ยนสถานะเป็น READY, APPROVED, REJECTED
- ✅ **AC-1.3.3**: ADMIN สามารถเปลี่ยนสถานะได้ทุกสถานะ

#### 1.4 รีวิวหลักฐาน
- ✅ **AC-1.4.1**: ASSESSOR, QA_LEAD สามารถสร้างรีวิวได้
- ✅ **AC-1.4.2**: รีวิวประกอบด้วย: reviewStatus (NEED_MORE, ACCEPTED, REJECTED), score (optional), comment (optional)
- ✅ **AC-1.4.3**: ระบบแสดงประวัติรีวิวทั้งหมดในหลักฐาน
- ✅ **AC-1.4.4**: เมื่อรีวิวเป็น ACCEPTED → ระบบสามารถเปลี่ยนสถานะหลักฐานเป็น APPROVED (optional)

### 2. Dashboard & Reports

#### 2.1 Dashboard
- ✅ **AC-2.1.1**: แสดง Bar chart: ความพร้อม % ต่อมาตรฐาน
- ✅ **AC-2.1.2**: แสดง KPI cards: Overall Readiness %, Total Evidence, Pending Reviews, Missing Evidence
- ✅ **AC-2.1.3**: แสดงตาราง: รีวิวล่าสุด (10 รายการ)
- ✅ **AC-2.1.4**: แสดงตาราง: รายการที่รอการดำเนินการ (10 รายการ)
- ✅ **AC-2.1.5**: Filter ตามโรงเรียนและปีงบประมาณ

#### 2.2 Readiness Report
- ✅ **AC-2.2.1**: แสดง % ความพร้อมต่อมาตรฐาน
- ✅ **AC-2.2.2**: Filter ตามโรงเรียนและปีงบประมาณ
- ✅ **AC-2.2.3**: แสดงตารางรายละเอียด: มาตรฐาน, จำนวนตัวชี้วัดทั้งหมด, จำนวนที่ Ready, จำนวนที่ Approved, เปอร์เซ็นต์

#### 2.3 Missing Report
- ✅ **AC-2.3.1**: แสดงรายการตัวชี้วัดที่ยังไม่มีหลักฐาน
- ✅ **AC-2.3.2**: Filter ตามโรงเรียน, ปีงบประมาณ, ระดับการศึกษา, มาตรฐาน
- ✅ **AC-2.3.3**: มีปุ่ม "เพิ่มหลักฐาน" ที่ลิงก์ไป `/evidence/new?indicatorId=...`

#### 2.4 Files Report
- ✅ **AC-2.4.1**: แสดงรายการหลักฐานพร้อมไฟล์หลัก
- ✅ **AC-2.4.2**: Filter ตามโรงเรียนและปีงบประมาณ
- ✅ **AC-2.4.3**: มีลิงก์เปิดไฟล์หลัก (ตาม storage type)

### 3. Setup (QA Configuration)

#### 3.1 CRUD Operations
- ✅ **AC-3.1.1**: ADMIN, QA_LEAD สามารถ CRUD ระดับการศึกษา, มาตรฐาน, ตัวชี้วัด, ตัวชี้วัดย่อย
- ✅ **AC-3.1.2**: Dependent dropdowns ทำงานถูกต้อง (level → standard → indicator → sub)
- ✅ **AC-3.1.3**: CSV import สำหรับตัวชี้วัดย่อย (bulk upload)

### 4. Authentication & Authorization

#### 4.1 Authentication
- ✅ **AC-4.1.1**: ผู้ใช้สามารถ login ด้วย credentials
- ✅ **AC-4.1.2**: Session ทำงานถูกต้อง
- ✅ **AC-4.1.3**: ผู้ใช้สามารถ logout ได้

#### 4.2 RBAC
- ✅ **AC-4.2.1**: ADMIN เข้าถึงทุกหน้าได้
- ✅ **AC-4.2.2**: QA_LEAD เข้าถึง `/setup/*`, `/evidence/*`, `/reports/*` ได้
- ✅ **AC-4.2.3**: TEACHER เข้าถึง `/evidence/*` (สร้าง/แก้ไขของตนเอง) ได้
- ✅ **AC-4.2.4**: ASSESSOR เข้าถึง `/evidence/*` (อ่านทั้งหมด), `/reviews/*` ได้

#### 4.3 School Scoping
- ✅ **AC-4.3.1**: ผู้ใช้เห็นเฉพาะข้อมูลของโรงเรียนที่ตนเองมีสิทธิ์ (UserSchoolRole)
- ✅ **AC-4.3.2**: Server actions ตรวจสอบ school access ก่อนดำเนินการ

### 5. Audit Logging

- ✅ **AC-5.1**: ระบบบันทึก audit log สำหรับ:
  - CREATE_EVIDENCE
  - UPDATE_EVIDENCE_STATUS
  - UPLOAD_FILE
  - CREATE_REVIEW
  - LOGIN
  - LOGOUT
- ✅ **AC-5.2**: ADMIN สามารถดู audit logs ได้ที่ `/admin/audit`
- ✅ **AC-5.3**: Audit logs แสดง: actor, action, target, timestamp

---

## Non-Functional Requirements

### 6. Code Quality

- ✅ **AC-6.1**: TypeScript strict mode เปิดใช้งาน
- ✅ **AC-6.2**: ESLint ผ่าน (no errors, no warnings)
- ✅ **AC-6.3**: Prettier formatted
- ✅ **AC-6.4**: Unit tests สำหรับ helpers (coverage ≥ 70%)

### 7. Performance

- ✅ **AC-7.1**: Lighthouse score ≥ 85 (Performance, Accessibility, Best Practices, SEO)
- ✅ **AC-7.2**: Page load time < 3 seconds (first load)
- ✅ **AC-7.3**: API response time < 500ms (average)

### 8. Data Integrity

- ✅ **AC-8.1**: Seed scripts idempotent (รันซ้ำได้ไม่พัง)
- ✅ **AC-8.2**: `npm run db:reset` ทำงานได้
- ✅ **AC-8.3**: Migrations ทำงานถูกต้อง

### 9. Testing

- ✅ **AC-9.1**: Unit tests ผ่าน (helpers)
- ✅ **AC-9.2**: E2E smoke test ผ่าน (Playwright):
  - Login → Add Evidence → Attach File → Mark READY → Review ACCEPTED

### 10. Accessibility

- ✅ **AC-10.1**: ใช้ semantic HTML
- ✅ **AC-10.2**: ARIA labels สำหรับ interactive elements
- ✅ **AC-10.3**: Keyboard navigation ทำงาน
- ✅ **AC-10.4**: Color contrast ≥ 4.5:1

### 11. i18n

- ✅ **AC-11.1**: รองรับภาษาไทย (primary)
- ✅ **AC-11.2**: ใช้ฟอนต์ Kanit สำหรับข้อความภาษาไทย

---

## E2E Test Scenarios

### Scenario 1: สร้างหลักฐานและรีวิว
1. Login เป็น ADMIN
2. ไปที่ `/evidence/new`
3. เลือกโรงเรียน → ระดับการศึกษา → มาตรฐาน → ตัวชี้วัด
4. ตรวจสอบว่า evidence_code ถูกสร้างอัตโนมัติ
5. กรอก title, description
6. Submit
7. ไปที่ `/evidence/[id]/files`
8. เพิ่มไฟล์ (URL type)
9. ตั้งเป็น primary
10. ไปที่ `/evidence/[id]`
11. เปลี่ยนสถานะเป็น READY
12. ไปที่ `/evidence/[id]/reviews`
13. สร้างรีวิว (ACCEPTED, score: 85)
14. ตรวจสอบว่าสถานะเปลี่ยนเป็น APPROVED (ถ้ามี auto-update)

### Scenario 2: Dashboard และรายงาน
1. Login
2. ไปที่ `/dashboard`
3. ตรวจสอบว่า Bar chart แสดงข้อมูล
4. ตรวจสอบว่า KPI cards แสดงค่า
5. Filter ตามโรงเรียนและปีงบประมาณ
6. ไปที่ `/reports/readiness`
7. ตรวจสอบว่าแสดง % ต่อมาตรฐาน
8. ไปที่ `/reports/missing`
9. ตรวจสอบว่ารายการ Missing แสดงผล
10. คลิก "เพิ่มหลักฐาน" จากรายการ Missing
11. ตรวจสอบว่า indicator ถูกเลือกอัตโนมัติ

### Scenario 3: Seed Idempotent
1. รัน `npm run db:reset`
2. ตรวจสอบว่า seed ทำงานสำเร็จ
3. รัน `npm run db:seed` อีกครั้ง
4. ตรวจสอบว่าไม่เกิด error (idempotent)

---

## Definition of Done

### Functional
- ✅ E2E scenarios ทั้งหมดผ่าน
- ✅ Dashboard readiness แสดงผลถูกต้อง
- ✅ Filter ปีงบ/โรงเรียน ทำงาน
- ✅ Autocode ทำงานถูกต้อง

### Technical
- ✅ TS strict, ESLint clean
- ✅ Lighthouse ≥ 85
- ✅ Seeds idempotent
- ✅ Unit tests ผ่าน
- ✅ E2E smoke test ผ่าน

### Documentation
- ✅ README.md มีคำสั่งเริ่มต้น
- ✅ API documentation (optional)
- ✅ Code comments ครบถ้วน
