# การดำเนินการตาม PRD (task_for_upgrade.md)

เอกสารนี้สรุปการ implement ตาม PRD ระบบพอร์ตโฟลิโอหลักฐาน การประเมินความพร้อม และการสร้าง PowerPoint

---

## 1. โมเดลข้อมูล (Data Model)

### Evidence (เพิ่มฟิลด์)
- `indicatorCodes` (JSON) — รหัสตัวชี้วัดเพิ่มเติม เช่น ["1.1","2.1"]
- `evidenceType` (String) — LESSON_PLAN, TEACHING_MEDIA, ASSESSMENT, STUDENT_WORK, CLASSROOM_PHOTO, REFLECTION, ACTION_RESEARCH, OTHER
- `aiSummary` (Text) — สรุปเนื้อหา 3–5 บรรทัด (จาก AI)
- `aiKeywords` (JSON) — คำสำคัญ (จาก AI)
- `aiQualityCheck` (JSON) — ตรวจคุณภาพเบื้องต้น (จาก AI)
- `aiSuggestions` (Text) — ข้อเสนอแนะปรับปรุง (จาก AI)
- `pdpaChecked` (Boolean) — ตรวจ PDPA
- `pdpaRiskLevel` (String) — ระดับความเสี่ยง PDPA

### DevelopmentSummary (ตารางใหม่)
- เก็บสรุปผลพัฒนาอย่างเข้ม ต่อโรงเรียน/ครู/ปีงบ/รอบ
- ฟิลด์: overallScore, overallPassed, professional/social/personal score และ passed/total, totalEvidence, totalFiles, totalVideoLinks, evidenceByIndicator, aiInsights, indicatorNarratives, summaryNarrative, passCriteria

### Config เกณฑ์ผ่าน (lib/indicators/pass-criteria.ts)
- รอบ 1–2: วิชาชีพ ≥ 9 ข้อ, บุคคล ≥ 7 ข้อ
- รอบ 3–4: วิชาชีพ ≥ 11, สังคม ≥ 3, บุคคล ≥ 11

---

## 2. Logic การบันทึก (ข้อ 3)

### 3.1 การรับรูปภาพ/ไฟล์ (FILE) — ทำแล้ว
- Validation: ประเภท PDF, image (jpeg, png, gif, webp), Word, Excel, PowerPoint; ขนาดสูงสุด 10 MB; ตรวจนามสกุลตรง MIME
- ชื่อไฟล์มาตรฐาน: UUID + extension
- รูปภาพ: resize ด้านยาวไม่เกิน 1028px + บีบอัด (lib/image-process.ts)

### 3.2 การรับวิดีโอ (VIDEO_LINK)
- ใช้ flow เดิม (YOUTUBE, GDRIVE, CANVA, LINK) ในฟอร์มหลักฐาน

### 3.3 การวิเคราะห์ด้วย AI
- **POST /api/evidence/[id]/analyze** — วิเคราะห์หลักฐาน แล้วอัปเดต aiSummary, aiKeywords, indicatorCodes (stub; ถ้ามี GEMINI_API_KEY สามารถเชื่อม AI จริงได้)

### 3.4 การจัดกลุ่มตามตัวชี้วัด
- ใช้ indicatorId และ indicatorCodes บน Evidence; completeness จัดกลุ่มตาม indicator

---

## 3. การประเมินความพร้อม (Completeness & Pass Criteria)

### Service: lib/indicators/completeness.ts
- `gatherEvidenceByIndicator()` — รวบรวมหลักฐานตามโรงเรียน/ปี/ผู้ใช้
- `computeCompleteness(schoolId, fiscalYear, assessmentRound, userId?)` — คำนวณ score ต่อตัวชี้วัด, ต่อ domain, และประเมินเกณฑ์ผ่านตาม round

### API
- **GET /api/completeness?schoolId=&fiscalYear=&round=&userId=**
  - คืนค่า: indicators (รายตัวชี้วัด + score, status, evidenceCount), domains, passCriteria, overallScore, overallPassed

---

## 4. Development Summary และ PowerPoint

### Service: lib/indicators/development-summary.ts
- `getDevelopmentSummaryData(schoolId, userId, fiscalYear, assessmentRound)` — รวบรวมข้อมูลสำหรับสรุปและ PPTX
- `upsertDevelopmentSummary(...)` — บันทึก/อัปเดตลงตาราง DevelopmentSummary

### Service: lib/indicators/pptx-generator.ts
- `generateDevelopmentSummaryPptx(data)` — สร้างไฟล์ .pptx จาก DevelopmentSummaryData
- สไลด์: หน้าปก → ข้อมูลครู → ภาพรวมความพร้อม → แบ่ง domain → ตัวชี้วัด → AI insights → สรุป → ขอบคุณ

### API
- **GET /api/development-summary?schoolId=&userId=&fiscalYear=&round=&save=1**
  - คืนค่า Development Summary Data; ถ้า save=1 จะบันทึกลง DB
- **POST /api/development-summary/pptx**
  - Body: `{ schoolId, userId?, fiscalYear, assessmentRound? }`
  - คืนค่า: ไฟล์ .pptx (attachment)

---

## 5. API อื่นที่เกี่ยวข้อง

- **PATCH /api/evidence/[id]** — อัปเดตรายการหลักฐาน (indicatorCodes, evidenceType, aiSummary, aiKeywords, aiQualityCheck, aiSuggestions, pdpaChecked, pdpaRiskLevel)
- **POST /api/evidence/[id]/analyze** — วิเคราะห์หลักฐาน (อัปเดต aiSummary, aiKeywords, indicatorCodes)

---

## 6. การรัน Migration

ถ้ายังไม่มีคอลัมน์ PRD บนตาราง `evidence` ให้รัน SQL ด้านล่างก่อน (ครั้งเดียว):

```sql
ALTER TABLE `evidence` ADD COLUMN `indicatorCodes` JSON NULL;
ALTER TABLE `evidence` ADD COLUMN `evidenceType` VARCHAR(191) NULL;
ALTER TABLE `evidence` ADD COLUMN `aiSummary` TEXT NULL;
ALTER TABLE `evidence` ADD COLUMN `aiKeywords` JSON NULL;
ALTER TABLE `evidence` ADD COLUMN `aiQualityCheck` JSON NULL;
ALTER TABLE `evidence` ADD COLUMN `aiSuggestions` TEXT NULL;
ALTER TABLE `evidence` ADD COLUMN `pdpaChecked` BOOLEAN NULL;
ALTER TABLE `evidence` ADD COLUMN `pdpaRiskLevel` VARCHAR(191) NULL;
```

ตาราง `developmentsummary` ถูกสร้างจาก migration แล้ว

---

## 7. การใช้งานแบบย่อ

1. **อัปโหลดหลักฐาน** — ใช้หน้า /evidence/[id]/files (รองรับประเภทไฟล์และขนาดตาม PRD แล้ว)
2. **วิเคราะห์ AI (ถ้าต้องการ)** — เรียก POST /api/evidence/[id]/analyze
3. **ดูความพร้อม** — เรียก GET /api/completeness?schoolId=...&fiscalYear=...&round=1
4. **ดู Development Summary** — เรียก GET /api/development-summary?schoolId=...&userId=...&fiscalYear=...&round=1
5. **สร้าง PowerPoint** — เรียก POST /api/development-summary/pptx ด้วย body { schoolId, fiscalYear, userId?, assessmentRound? } แล้วดาวน์โหลดไฟล์ .pptx

---

## 8. การทดสอบ API

API ด้านล่างต้องส่ง session cookie (เข้าสู่ระบบแล้ว) ยกเว้นจะระบุไว้

### 8.1 GET /api/completeness
คำนวณความพร้อมตามโรงเรียน/ปี/รอบ (และ userId ถ้าส่ง)

```bash
# ต้อง login ก่อน แล้วใช้ cookie จาก browser หรือได้จาก /api/auth/session
curl -s "http://localhost:3000/api/completeness?schoolId=1&fiscalYear=2568&round=1" -H "Cookie: next-auth.session-token=..."
```

### 8.2 GET /api/development-summary
ดึงข้อมูล Development Summary; save=1 เพื่อบันทึกลง DB

```bash
curl -s "http://localhost:3000/api/development-summary?schoolId=1&userId=1&fiscalYear=2568&round=1" -H "Cookie: ..."
curl -s "http://localhost:3000/api/development-summary?schoolId=1&userId=1&fiscalYear=2568&round=1&save=1" -H "Cookie: ..."
```

### 8.3 POST /api/development-summary/pptx
สร้างไฟล์ PowerPoint (ส่งคืนเป็น binary)

```bash
curl -X POST "http://localhost:3000/api/development-summary/pptx" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d "{\"schoolId\":\"1\",\"fiscalYear\":2568,\"userId\":\"1\",\"assessmentRound\":1}" \
  --output summary.pptx
```

### 8.4 PATCH /api/evidence/[id]
อัปเดตรายการหลักฐาน (indicatorCodes, evidenceType, AI fields, PDPA)

```bash
curl -X PATCH "http://localhost:3000/api/evidence/1" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d "{\"indicatorCodes\":[\"1.1\",\"2.1\"],\"evidenceType\":\"LESSON_PLAN\",\"aiSummary\":\"สรุปจาก AI\"}"
```

### 8.5 POST /api/evidence/[id]/analyze
วิเคราะห์หลักฐาน (อัปเดต aiSummary, aiKeywords, indicatorCodes)

```bash
curl -X POST "http://localhost:3000/api/evidence/1/analyze" -H "Cookie: ..."
```

### การเช็คการเรียกใช้ในโปรเจกต์
- **Evidence ฟิลด์ใหม่**: ใช้ใน `lib/indicators/development-summary.ts` (aiSummary), `lib/indicators/completeness.ts` (indicatorCodes), API PATCH/POST analyze
- **DevelopmentSummary**: ใช้ใน `getDevelopmentSummaryData` / `upsertDevelopmentSummary` และ API GET development-summary, POST pptx
- **Completeness**: เรียกจาก `development-summary.ts` และ GET /api/completeness
- **PowerPoint**: เรียกจาก POST /api/development-summary/pptx เท่านั้น (ไม่มีหน้าที่กดปุ่มสร้าง PPT ใน UI แล้วต้องเพิ่มเองได้)
