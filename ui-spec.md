# UI Specification - QA Evidence Center

## Design System

### Typography
- **Primary Font**: Kanit (สำหรับข้อความภาษาไทย)
- **Secondary Font**: System font stack (สำหรับข้อความภาษาอังกฤษ)
- **Font Sizes**: ตาม Tailwind default scale

### Colors
- ใช้ Tailwind default colors + shadcn/ui theme
- Primary: blue
- Success: green
- Warning: yellow
- Error: red

### Components
- ใช้ shadcn/ui components
- Icons: lucide-react
- Charts: recharts

### i18n
- รองรับภาษาไทย (primary) และอังกฤษ
- ใช้ next-intl หรือ react-i18next (ภายหลัง)

---

## Evidence Form (`/evidence/new`)

### Layout
- Form แบบ single page
- Dependent dropdowns: level → standard → indicator
- Auto-filled fields: fiscal_year, evidence_code (หลังเลือก indicator)

### Fields

#### 1. School Selection
- **Type**: Select dropdown
- **Label**: "โรงเรียน"
- **Required**: Yes
- **Options**: ตาม UserSchoolRole ของ current user
- **Permission**: TEACHER, QA_LEAD, ADMIN

#### 2. Level Selection
- **Type**: Select dropdown
- **Label**: "ระดับการศึกษา"
- **Required**: Yes
- **Options**: EARLY_CHILDHOOD, BASIC
- **Behavior**: เมื่อเลือก level → filter standards

#### 3. Standard Selection
- **Type**: Select dropdown (dependent)
- **Label**: "มาตรฐาน"
- **Required**: Yes
- **Options**: ตาม level ที่เลือก
- **Behavior**: เมื่อเลือก standard → filter indicators
- **Disabled**: จนกว่าจะเลือก level

#### 4. Indicator Selection
- **Type**: Select dropdown (dependent)
- **Label**: "ตัวชี้วัด"
- **Required**: Yes
- **Options**: ตาม standard ที่เลือก
- **Behavior**: เมื่อเลือก indicator → auto-generate evidence_code
- **Disabled**: จนกว่าจะเลือก standard

#### 5. Fiscal Year
- **Type**: Number input (read-only)
- **Label**: "ปีงบประมาณ"
- **Default**: คำนวณจาก `thaiFiscalYear()`
- **Auto-filled**: Yes

#### 6. Evidence Code
- **Type**: Text input (read-only)
- **Label**: "รหัสหลักฐาน"
- **Format**: `${indicator.code}-${running2digits}` (เช่น 2.3-01)
- **Auto-generated**: หลังเลือก indicator
- **Helper text**: "รหัสจะถูกสร้างอัตโนมัติ"

#### 7. Title
- **Type**: Text input
- **Label**: "ชื่อหลักฐาน"
- **Required**: Yes
- **Placeholder**: "ระบุชื่อหลักฐาน"
- **Max length**: 255

#### 8. Description
- **Type**: Textarea
- **Label**: "รายละเอียด"
- **Required**: No
- **Placeholder**: "ระบุรายละเอียดเพิ่มเติม"
- **Rows**: 4

#### 9. Owner
- **Type**: Select dropdown
- **Label**: "เจ้าของหลักฐาน"
- **Default**: Current user
- **Options**: Users ในโรงเรียนที่เลือก
- **Permission**: TEACHER (read-only), QA_LEAD/ADMIN (editable)

#### 10. Status
- **Type**: Select dropdown
- **Label**: "สถานะ"
- **Default**: PENDING
- **Options**: MISSING, PENDING, READY, APPROVED, REJECTED
- **Permission**: TEACHER (PENDING, READY), QA_LEAD/ASSESSOR (all)

#### 11. Privacy Level
- **Type**: Select dropdown
- **Label**: "ระดับความลับ"
- **Default**: INTERNAL
- **Options**: PUBLIC, INTERNAL, CONFIDENTIAL

### Actions
- **Submit**: "บันทึก" (สร้างหลักฐาน)
- **Cancel**: "ยกเลิก" (กลับไปหน้ารายการ)
- **Save & Add Files**: "บันทึกและเพิ่มไฟล์" (redirect ไป `/evidence/[id]/files`)

### Validation
- ใช้ Zod schema
- แสดง error messages ใต้ field
- Disable submit จนกว่าจะผ่าน validation

---

## Evidence Files Form (`/evidence/[id]/files`)

### Layout
- Form แบบ dynamic fields
- Storage type switcher (radio buttons หรือ tabs)
- Grid แสดงไฟล์ที่มีอยู่

### Storage Type Switcher
- **Type**: Radio buttons หรือ Tabs
- **Options**: LOCAL, Google Drive, URL
- **Behavior**: เปลี่ยน storage type → แสดง fields ที่เกี่ยวข้อง

### Fields (Dynamic ตาม Storage Type)

#### LOCAL
- **File Name**: Text input (required)
- **Storage Path**: Text input (required)
  - Placeholder: "/uploads/evidence/..."
  - Helper: "ระบุ path ของไฟล์ในระบบ"
- **MIME Type**: Select dropdown (optional)
- **File Size**: Number input (optional, bytes)

#### Google Drive
- **File Name**: Text input (required)
- **Drive File ID**: Text input (required)
  - Placeholder: "1ABC123..."
  - Helper: "ระบุ File ID จาก Google Drive"
- **MIME Type**: Select dropdown (optional)
- **File Size**: Number input (optional, bytes)

#### URL
- **File Name**: Text input (required)
- **External URL**: URL input (required)
  - Placeholder: "https://..."
  - Validation: ต้องเป็น valid URL

### Common Fields (ทุก Storage Type)
- **Is Primary**: Toggle switch
  - **Label**: "ไฟล์หลัก"
  - **Behavior**: เมื่อตั้งเป็น primary → reset ตัวอื่นในหลักฐานเดียวกัน
  - **Helper**: "ไฟล์หลักจะถูกแสดงในรายงาน"
- **Note**: Textarea (optional)
  - **Label**: "หมายเหตุ"
  - **Rows**: 2

### File List (Existing Files)
- **Layout**: Grid หรือ Table
- **Columns**: File Name, Storage Type, Is Primary, Actions
- **Actions**: Edit, Delete, Set Primary
- **Primary Badge**: แสดง badge "หลัก" สำหรับ primary file

### Actions
- **Add File**: "เพิ่มไฟล์" (เพิ่ม row ใหม่)
- **Save**: "บันทึก" (บันทึกไฟล์ทั้งหมด)
- **Cancel**: "ยกเลิก" (กลับไปหน้ารายละเอียดหลักฐาน)

---

## Dashboard (`/dashboard`)

### Layout
- Grid layout: 2 columns (desktop), 1 column (mobile)
- Section 1: Charts (full width)
- Section 2: KPI Cards (2 columns)
- Section 3: Tables (full width)

### Section 1: Readiness Chart
- **Type**: Bar chart (recharts)
- **Title**: "ความพร้อมหลักฐานต่อมาตรฐาน"
- **X-axis**: มาตรฐาน (Standard name)
- **Y-axis**: เปอร์เซ็นต์ (0-100%)
- **Data**: ตาม school และ fiscal year ที่เลือก
- **Filter**: School (dropdown), Fiscal Year (dropdown)
- **Colors**: 
  - 0-50%: red
  - 51-75%: yellow
  - 76-100%: green

### Section 2: KPI Cards
- **Card 1**: Overall Readiness %
  - **Value**: เปอร์เซ็นต์รวม
  - **Label**: "ความพร้อมรวม"
  - **Icon**: CheckCircle
  - **Color**: ตามค่า (red/yellow/green)
- **Card 2**: Total Evidence
  - **Value**: จำนวนหลักฐานทั้งหมด
  - **Label**: "จำนวนหลักฐาน"
  - **Icon**: FileText
- **Card 3**: Pending Reviews
  - **Value**: จำนวนหลักฐานที่รอรีวิว
  - **Label**: "รอรีวิว"
  - **Icon**: Clock
- **Card 4**: Missing Evidence
  - **Value**: จำนวนตัวชี้วัดที่ยังไม่มีหลักฐาน
  - **Label**: "ยังขาด"
  - **Icon**: AlertCircle

### Section 3: Recent Reviews Table
- **Title**: "รีวิวล่าสุด"
- **Columns**: Evidence Code, Title, Reviewer, Status, Score, Date
- **Rows**: 10 rows
- **Actions**: View Evidence (link)

### Section 4: Pending Items Table
- **Title**: "รายการที่รอการดำเนินการ"
- **Columns**: Evidence Code, Title, Owner, Status, Created Date
- **Rows**: 10 rows
- **Actions**: View Evidence (link), Mark Ready (button, ถ้ามีสิทธิ์)

### Filter Bar
- **School**: Dropdown (ตาม UserSchoolRole)
- **Fiscal Year**: Dropdown (ปีงบประมาณ)
- **Apply**: Button "แสดงผล"

---

## Evidence Detail Page (`/evidence/[id]`)

### Layout
- Header: Evidence Code, Title, Status Badge
- Tabs: Overview, Files, Reviews

### Tab 1: Overview
- **Information Card**:
  - School, Level, Standard, Indicator
  - Fiscal Year, Owner, Created Date
  - Description
  - Privacy Level
- **Actions**:
  - Edit (ถ้ามีสิทธิ์)
  - Change Status (QA_LEAD, ASSESSOR)
  - Delete (owner, ADMIN)

### Tab 2: Files
- **File List**: Grid หรือ Table
  - Columns: File Name, Storage Type, Is Primary, Uploaded Date, Actions
  - Primary Badge
  - Actions: View/Open, Edit, Delete
- **Add File Button**: "เพิ่มไฟล์" (link ไป `/evidence/[id]/files`)

### Tab 3: Reviews
- **Review List**: Cards หรือ Table
  - Reviewer, Status, Score, Comment, Date
- **Add Review Button**: "เพิ่มรีวิว" (ถ้ามีสิทธิ์: ASSESSOR, QA_LEAD)

---

## Reports Pages

### Readiness Report (`/reports/readiness`)
- **Filter Bar**: School, Fiscal Year
- **Chart**: Bar chart (เหมือน Dashboard)
- **Table**: รายละเอียดต่อมาตรฐาน
  - Columns: Standard, Total Indicators, Ready, Approved, Percentage
- **Export**: Button "ส่งออก PDF" (ภายหลัง)

### Missing Report (`/reports/missing`)
- **Filter Bar**: School, Fiscal Year, Level, Standard
- **Table**: รายการตัวชี้วัดที่ยังไม่มีหลักฐาน
  - Columns: Indicator Code, Indicator Name, Standard, Level
- **Action**: "เพิ่มหลักฐาน" (link ไป `/evidence/new?indicatorId=...`)

### Files Report (`/reports/files`)
- **Filter Bar**: School, Fiscal Year
- **Table**: รายการหลักฐานพร้อมไฟล์หลัก
  - Columns: Evidence Code, Title, Primary File, Storage Type, Open Link
- **Open Link**: 
  - LOCAL: `/files/[path]` หรือ download
  - GDRIVE: `https://drive.google.com/file/d/[id]`
  - URL: external URL

---

## Responsive Design

### Breakpoints (Tailwind)
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
- Single column layout
- Stacked form fields
- Collapsible sections
- Bottom navigation (optional)

---

## Accessibility (WCAG AA)

### Requirements
- Semantic HTML
- ARIA labels สำหรับ interactive elements
- Keyboard navigation
- Focus indicators
- Color contrast ≥ 4.5:1
- Alt text สำหรับ images
- Form labels

### Testing
- Screen reader testing
- Keyboard-only navigation
- Color contrast checker