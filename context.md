# QA Evidence Center - Product Context

## ภาพรวมระบบ

ระบบจัดการหลักฐานการประกันคุณภาพภายนอกสำหรับสำนักงานรับรองมาตรฐานและประเมินคุณภาพการศึกษา (สมศ.)

**กรอบแนวคิด: PQA (Performance–Quality Alignment)**  
ระบบออกแบบให้หลักฐานหนึ่งชิ้นเชื่อมได้ทั้ง **QA** (ตัวชี้วัดระดับองค์กร/มาตรฐาน) และ **PA** (การประเมินผลการปฏิบัติงานรายบุคคล) เพื่อให้การประเมินเป็นไปเพื่อการพัฒนาและมีหลักฐานเชิงประจักษ์รองรับ รายละเอียดกรอบ Logic อยู่ใน [docs/PQA_FRAMEWORK.md](docs/PQA_FRAMEWORK.md).

## คุณสมบัติหลัก

### 1. การจัดการหลักฐาน (Evidence Management)
- สร้างหลักฐานพร้อมระบบ autocode (เช่น 2.3-01, 2.3-02)
- จัดการหลักฐานตามปีการศึกษาไทย (พ.ค. - เม.ย.)
- รองรับ 2 ระดับการศึกษา: EARLY_CHILDHOOD และ BASIC

### 2. การจัดการไฟล์ (File Management)

#### ประเภทการเก็บไฟล์ (Storage Types)
- **URL**: อัปโหลดไฟล์โดยตรง (รูปภาพ, PDF, วิดีโอ)
- **YOUTUBE**: ฝังวิดีโอ YouTube
- **GDRIVE**: ฝังไฟล์ Google Drive
- **CANVA**: ฝังไฟล์ Canva แบบแชร์สาธารณะ
- **LINK**: เก็บลิงก์ URL ของเว็บไซต์ทั่วไป (เช่น Google Sites)

#### การอัปโหลดไฟล์ (URL Type)

**รูปภาพ:**
- อัปโหลดได้ครั้งละหลายรูป แต่ไม่เกิน 20 รูป
- รูปแรกจะถูกใช้เป็น thumbnail ของกลุ่ม
- เก็บเป็น JSON array ใน field `fileUrls` ของ record เดียว
- สามารถตั้งเป็นไฟล์หลัก (isPrimary) ได้

**วิดีโอ:**
- อัปโหลดได้เพียง 1 ไฟล์ต่อครั้ง
- ขนาดไม่เกิน 1000 MB
- ระบบจะสร้าง thumbnail อัตโนมัติจาก frame ที่ 10 วินาที
- เก็บใน folder `/uploads/evidence/[id]/videos/`
- ไม่สามารถตั้งเป็นไฟล์หลักได้

**PDF และไฟล์อื่น:**
- อัปโหลดได้ตามปกติ
- เก็บใน folder `/uploads/evidence/[id]/` ตามประเภท

#### การแสดงผลไฟล์
- รูปภาพ: แสดงในรูปแบบ Responsive Image Gallery พร้อมคำอธิบาย
- วิดีโอ: แสดงด้วย `<video>` tag พร้อม controls
- YouTube/Google Drive/Canva/Link: แสดงด้วย `<iframe>` embed

### 3. ระบบรีวิว (Review System)
- รีวิวสามารถผูกกับไฟล์เฉพาะ (evidenceFileId) หรือหลักฐานทั้งหมด
- รองรับหลายรีวิวต่อหลักฐาน
- สถานะรีวิว: PENDING, APPROVED, REJECTED

### 4. Dashboard และรายงาน
- แสดงความพร้อมหลักฐานต่อมาตรฐาน
- KPI และรายการที่รอการดำเนินการ
- รายงานไฟล์ที่ขาดหาย

### 5. ระบบความปลอดภัย
- **RBAC**: Role-Based Access Control
  - ADMIN: จัดการทุกอย่าง
  - QA_LEAD: นำระบบ QA ของโรงเรียน
  - TEACHER: สร้าง/แก้ไขหลักฐานของตนเอง
  - ASSESSOR: อ่านทั้งหมด + รีวิว/ให้คะแนน
- **School Scoping**: ผู้ใช้เห็นเฉพาะข้อมูลของโรงเรียนที่ตนเองมีสิทธิ์
- **Audit Logging**: บันทึก event สำคัญ

## Technical Architecture

### File Upload Architecture

#### ปัญหาที่พบและวิธีแก้ไข

**ปัญหา:**
1. Middleware มี body size limit 10MB โดย default
2. Middleware อ่าน request body ไปแล้วก่อนถึง API route ทำให้ `request.formData()` ไม่สามารถ parse ได้
3. Error: "Failed to parse body as FormData" และ "Request body consumed: true"

**วิธีแก้ไข:**
1. **เพิ่ม `middlewareClientMaxBodySize`** ใน `next.config.js`:
   ```javascript
   experimental: {
     middlewareClientMaxBodySize: '1000mb',
   }
   ```

2. **Exclude API route จาก middleware matcher**:
   ```typescript
   export const config = {
     matcher: [
       '/((?!_next/static|_next/image|favicon.ico|uploads|api/evidence/.*/files|.*\\.(?:png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|pdf)).*)',
     ],
   };
   ```
   - API route `/api/evidence/[id]/files` จะไม่ผ่าน middleware
   - Authentication และ authorization จะถูกตรวจสอบใน API route โดยตรง

3. **ใช้ API Route แทน Server Action** สำหรับ file uploads:
   - Server Actions มี body size limit ที่ต่ำกว่า
   - API Routes รองรับไฟล์ขนาดใหญ่ได้ดีกว่า
   - ตั้งค่า `maxDuration: 300` (5 นาที) สำหรับไฟล์ขนาดใหญ่

4. **เพิ่ม bodySizeLimit** สำหรับ Server Actions:
   ```javascript
   experimental: {
     serverActions: {
       bodySizeLimit: '1000mb',
     },
   }
   ```

#### File Upload Flow

1. **Client Side** (`ui-files-form.tsx`):
   - ตรวจสอบประเภทไฟล์ (รูปภาพ/วิดีโอ)
   - Validation client-side (จำนวนไฟล์, ขนาด)
   - ส่ง FormData ไปยัง API route `/api/evidence/[id]/files`

2. **API Route** (`app/api/evidence/[id]/files/route.ts`):
   - ตรวจสอบ authentication และ authorization
   - Parse FormData
   - แยกไฟล์ตามประเภท (รูปภาพ/วิดีโอ/อื่น)
   - อัปโหลดไฟล์ไปยัง `/public/uploads/evidence/[id]/[images|videos]/`
   - สร้าง thumbnail สำหรับวิดีโอ (ใช้ ffmpeg)
   - บันทึกข้อมูลลงฐานข้อมูล
   - Revalidate paths

3. **Database Schema**:
   - `EvidenceFile.fileUrls`: JSON array สำหรับเก็บหลายรูปภาพ
   - `EvidenceFile.thumbnailUrl`: URL ของ thumbnail (รูปแรกสำหรับรูปภาพ, frame ที่ 10 วินาทีสำหรับวิดีโอ)
   - `EvidenceFile.externalUrl`: URL หลัก (รูปแรกสำหรับรูปภาพ, ไฟล์วิดีโอสำหรับวิดีโอ)

### Video Thumbnail Generation

- ใช้ `ffmpeg` เพื่อสร้าง thumbnail จากวิดีโอ
- Capture frame ที่ 10 วินาที
- เก็บ thumbnail เป็น JPG ใน folder เดียวกับวิดีโอ
- ถ้าไม่สามารถสร้าง thumbnail ได้ ระบบจะใช้ icon default

### Image Gallery Display

- แสดงรูปภาพหลายรูปในรูปแบบ Responsive Grid
- Layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- แต่ละรูปมี hover effect และคำอธิบายด้านล่าง
- ใช้ Next.js Image component พร้อม `unoptimized` prop

## Database Schema

### EvidenceFile Model
```prisma
model EvidenceFile {
  id           BigInt   @id @default(autoincrement())
  evidenceId   BigInt
  fileName     String
  storageType  EvidenceStorageType
  storagePath  String?
  externalUrl  String?
  thumbnailUrl String?  // สำหรับวิดีโอ thumbnail และรูปแรกของกลุ่มรูปภาพ
  fileUrls     Json?     // JSON array สำหรับเก็บหลายรูปภาพ
  mimeType     String?
  fileSize     Int?
  isPrimary    Boolean  @default(false)
  // ... other fields
}
```

### EvidenceStorageType Enum
```prisma
enum EvidenceStorageType {
  YOUTUBE
  GDRIVE
  URL
  CANVA
  LINK
}
```

## Configuration Files

### next.config.js
```javascript
{
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb',
    },
    middlewareClientMaxBodySize: '1000mb',
  },
}
```

### middleware.ts
- Exclude `/api/evidence/[id]/files` จาก middleware matcher
- Authentication และ authorization ถูกตรวจสอบใน API route

## Deployment Considerations

### Docker
- ต้องติดตั้ง `ffmpeg` ใน Docker image สำหรับ video thumbnail generation
- ตั้งค่า volume สำหรับ `/public/uploads/`
- ตั้งค่า `maxDuration` สำหรับ API routes ที่อัปโหลดไฟล์

### Production
- ตรวจสอบ disk space สำหรับไฟล์ที่อัปโหลด
- พิจารณาใช้ external storage (S3, Google Cloud Storage) สำหรับไฟล์ขนาดใหญ่
- ตั้งค่า reverse proxy (Nginx) ให้รองรับไฟล์ขนาดใหญ่

## Known Issues & Solutions

### Issue: "Failed to parse body as FormData"
**สาเหตุ:** Middleware อ่าน request body ไปแล้ว  
**วิธีแก้:** Exclude API route จาก middleware matcher

### Issue: "Request body exceeded 10MB"
**สาเหตุ:** Middleware มี body size limit 10MB  
**วิธีแก้:** เพิ่ม `middlewareClientMaxBodySize` ใน `next.config.js`

### Issue: Video thumbnail ไม่ถูกสร้าง
**สาเหตุ:** `ffmpeg` ไม่ได้ติดตั้งหรือไม่สามารถเข้าถึงได้  
**วิธีแก้:** ตรวจสอบว่า `ffmpeg` ติดตั้งใน Docker image และมี permission ที่ถูกต้อง
