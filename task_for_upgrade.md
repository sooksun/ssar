# PRD: ระบบพอร์ตโฟลิโอหลักฐาน การประเมินความพร้อม และการสร้าง PowerPoint

**เวอร์ชัน:** 1.0  
**วันที่:** 24 ก.พ. 2568  
**วัตถุประสงค์:** สรุป logic การบันทึกข้อมูลพอร์ตโฟลิโอ (รูปภาพ/วิดีโอ/AI วิเคราะห์) การจัดเก็บตามกลุ่มตัวชี้วัด การประเมินความพร้อม และการสร้าง PowerPoint เพื่อส่งต่อให้ application อื่นนำไปพัฒนาเป็น feature ใหม่

---

## 1. สรุปภาพรวม (Executive Summary)

ระบบประกอบด้วย **4 ขั้นหลัก** ที่เชื่อมกันเป็น pipeline:

1. **การรับและจัดเก็บหลักฐาน** — รูปภาพ, ไฟล์, วิดีโอ (ลิงก์) → บันทึกเป็นรายการพอร์ตโฟลิโอ (Evidence Portfolio) พร้อม tag ตัวชี้วัด
2. **การวิเคราะห์ด้วย AI** — สรุปเนื้อหา, แนะนำตัวชี้วัด, ตรวจคุณภาพ, (ตัวเลือก) ตรวจ PDPA
3. **การประเมินความพร้อม** — คำนวณความสมบูรณ์ตามตัวชี้วัด (completeness) และเกณฑ์ผ่าน/ไม่ผ่าน (pass criteria) ตามรอบการประเมิน
4. **การสร้าง PowerPoint** — สรุปผลพัฒนาอย่างเข้ม (Development Summary) แล้ว generate ไฟล์ .pptx จาก template

แอปพลิเคชันอื่นสามารถรับ PRD นี้เป็นสเปกแล้ว implement ได้ทั้งแบบใช้ API เดิม หรือ replicate logic ใน stack ใหม่

---

## 2. โมเดลข้อมูลหลัก (Data Model Summary)

### 2.1 ตัวชี้วัด (Indicators)

- **Indicator** — ตัวชี้วัดหลัก (เช่น PRO_1, PRO_2, SOC, PER_1, PER_2) มี `code`, `name`, `aspect` (PROFESSIONAL | SOCIAL | PERSONAL), `section`, `assessmentRounds` (JSON array เช่น [1,2,3,4])
- **SubIndicator** — ตัวชี้วัดย่อย (เช่น PRO_1.1, PRO_1.2) มี `code`, `name`, `requirements`, `assessmentRounds`
- ตัวชี้วัดใช้ **รหัส code** เป็นตัวอ้างอิงในทั้งพอร์ตโฟลิโอ การประเมิน และสไลด์ (เช่น PRO_1.1, SOC_2, PER_1.1)

### 2.2 หลักฐานพอร์ตโฟลิโอ (Evidence Portfolio)

แต่ละรายการเป็น **EvidencePortfolio** (หรือเทียบเท่า) มีฟิลด์หลัก:

| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|----------|
| id | string (UUID) | รหัสเฉพาะ |
| teacherId | string | ครูเจ้าของหลักฐาน |
| itemType | enum | FILE \| VIDEO_LINK |
| **FILE:** originalFilename, standardFilename, fileUrl, fileSize, mimeType | - | ข้อมูลไฟล์ (รูป/PDF/DOC/PPT ฯลฯ) |
| **VIDEO_LINK:** videoUrl, videoTitle, videoDescription, videoPlatform | - | ลิงก์วิดีโอ (YouTube, Google Drive ฯลฯ) |
| evidenceType | enum | LESSON_PLAN, TEACHING_MEDIA, ASSESSMENT, STUDENT_WORK, CLASSROOM_PHOTO, REFLECTION, ACTION_RESEARCH, OTHER |
| indicatorCodes | JSON (array) | รหัสตัวชี้วัดที่หลักฐานนี้สนับสนุน เช่น ["PRO_1.1","PRO_1.2"] — อาจเป็น main/sub ตามที่ normalize แล้ว |
| aiSummary | text | สรุปเนื้อหา 3–5 บรรทัด (จาก AI) |
| aiKeywords | JSON | คำสำคัญ (จาก AI) |
| aiQualityCheck | JSON | ตรวจคุณภาพเบื้องต้น (จาก AI) |
| aiSuggestions | text | ข้อเสนอแนะปรับปรุง (จาก AI) |
| uploadedBy | string | user_id ผู้อัปโหลด |
| pdpaChecked, pdpaRiskLevel | bool, enum | ตรวจ PDPA (ถ้าเปิดใช้) |
| selfAssessmentId | string? | (optional) เชื่อมกับแบบประเมินตนเอง |

การจัดเก็บตามกลุ่มตัวชี้วัด = การกรอง/จัดกลุ่มรายการ EvidencePortfolio ตาม `indicatorCodes` (และตามรอบการประเมินที่ตัวชี้วัดนั้นใช้)

### 2.3 การวิเคราะห์วิดีโอ/ชิ้นงาน (Analysis Job)

สำหรับวิดีโอหรือชิ้นงานที่ส่งเข้าไปวิเคราะห์ด้วย AI (ASR + สรุป + ประเมิน):

- **AnalysisJob** — หนึ่ง job ต่อหนึ่งวิดีโอ/ชิ้นงาน  
  - สถานะ: UPLOADING → UPLOADED → QUEUED → PROCESSING_ASR → ASR_DONE → (ถ้า FULL) PROCESSING_FRAMES → ANALYZING → DONE / FAILED  
  - เก็บ: teacherId, originalFilename, mimeType, sourceType (UPLOAD | GDRIVE | YOUTUBE | IMAGES), analysisMode (TEXT_ONLY | FULL)  
  - ผล AI: transcriptSummary, analysisReport, evaluationResult, aiAdvice  
  - **indicatorCodes** (JSON) — ตัวชี้วัดที่หลักฐานนี้สนับสนุน (สำหรับนำไปใช้ใน completeness และ PowerPoint)

หลักฐานจาก AnalysisJob ถือเป็นอีกแหล่งหนึ่ง (เช่น “AI วิเคราะห์ชิ้นงาน”) นอกเหนือจาก FILE และ VIDEO_LINK ในพอร์ตโฟลิโอ

### 2.4 การประเมินความพร้อม (Completeness & Pass Criteria)

- **Completeness** (คำนวณจาก logic ไม่จำเป็นต้องเป็นตารางเดียว):
  - รวบรวมหลักฐานทั้งหมดของครู: **EvidencePortfolio** (FILE + VIDEO_LINK) + **AnalysisJob** (status = DONE) + (ถ้ามี) reflective journals, PLC, mentoring visits ฯลฯ
  - แต่ละตัวชี้วัดมี “checks” (EvidenceCheck) เช่น ต้องมีวิดีโอ/ไฟล์/บันทึกสะท้อน/PLC ฯลฯ
  - จับคู่หลักฐานกับตัวชี้วัดผ่าน `indicatorCodes`: ว่า portfolio item / analysis job ใด tag ตัวชี้วัดนั้น
  - คำนวณ **score ต่อตัวชี้วัด** (เช่น 0–100) จากว่า through checks ครบหรือไม่
  - คำนวณ **domain score** (PROFESSIONAL, SOCIAL, PERSONAL) จากค่าเฉลี่ยตัวชี้วัดใน domain นั้น
  - **Pass criteria ตามรอบ (round):**
    - รอบ 1–2: ด้านวิชาชีพผ่าน ≥ 9 ข้อ, ด้านบุคคล ≥ 7 ข้อ → overall = ผ่านทั้งสอง
    - รอบ 3–4: วิชาชีพ ≥ 11, สังคม ≥ 3, บุคคล ≥ 11 → overall = ผ่านทั้งสาม
  - ตัวชี้วัดบางตัวใช้เฉพาะบางรอบ (เช่น SOC ใช้รอบ 3–4, PER_2 ใช้รอบ 3–4)

- **IndicatorAssessment** (optional ในบางระบบ): เก็บผลการประเมินตัวชี้วัดต่อครูต่อรอบ (professionalPassed/Total, socialPassed/Total, personalPassed/Total, assessmentDetails เป็น JSON รายตัวชี้วัด)

### 2.5 สรุปผลพัฒนาอย่างเข้ม (Development Summary) และ PowerPoint

- **DevelopmentSummary** (ต่อครู ต่อรอบ ต่อปีการศึกษา):
  - เก็บ snapshot: overallScore, professional/social/personal score, overallPassed
  - จำนวนหลักฐาน: totalEvidence, totalAnalysisJobs, totalVideoLinks, totalFiles
  - JSON: evidenceByIndicator, aiInsights, domainSummaries, **indicatorNarratives** (ข้อความบรรยายต่อตัวชี้วัดสำหรับสไลด์)
  - summaryNarrative (ความเรียงสรุป)
  - deckPath, deckMarkdown (path และ markdown ของ deck สำหรับสร้างสไลด์)

- **การสร้าง PowerPoint:**
  - Input: DevelopmentSummaryData (ครู, รอบ, ปีการศึกษา, domains, indicatorNarratives, aiInsights, completeness ฯลฯ)
  - สไลด์ตัวอย่าง: หน้าปก, ข้อมูลครู, ภาพรวมความพร้อม, แบ่งตาม domain (วิชาชีพ/สังคม/บุคคล) → แต่ละตัวชี้วัดหนึ่งสไลด์ (ชื่อตัวชี้วัด, คะแนน/สถานะ, narrative, หลักฐานที่เชื่อม), สไลด์ AI insights, สรุป, ขอบคุณ
  - Output: ไฟล์ .pptx (buffer หรือ file) เช่น `สรุปผลพัฒนาอย่างเข้ม-ครั้งที่{round}-{teacherName}.pptx`

---

## 3. Logic การบันทึกข้อมูลพอร์ตโฟลิโอ

### 3.1 การรับรูปภาพ/ไฟล์ (FILE)

1. **Validation**
   - ประเภทไฟล์: อนุญาต image (jpeg, png, gif, webp), PDF, Word, Excel, PowerPoint (รวม .ppt, .pptx)
   - ขนาดสูงสุด: เช่น 10 MB
   - ตรวจนามสกุลให้ตรงกับ MIME

2. **ประมวลผลไฟล์**
   - สร้างชื่อไฟล์มาตรฐาน (เช่น UUID + extension) บันทึกลง disk/storage
   - **รูปภาพ:** resize ด้านยาวไม่เกิน 1028px (คงอัตราส่วน) + บีบอัด (ลดขนาดไฟล์) แล้วบันทึก
   - ได้ fileUrl (path หรือ URL ให้ frontend โหลดได้)

3. **AI (optional ตาม config)**
   - ถ้าเปิด “AI ตอนอัปโหลด” (เช่น ENABLE_AI_ON_UPLOAD=true): เรียก AI สรุปจากชื่อไฟล์/ประเภท → ได้ summary, keywords, suggestedIndicators, suggestedFilename, qualityCheck, suggestions
   - ถ้าปิด: ไม่เรียก AI ตอนอัปโหลด (ให้ผู้ใช้กด “AI วิเคราะห์” แยกภายหลังได้)

4. **ตัวชี้วัด (indicatorCodes)**
   - ถ้าผู้ใช้ส่ง indicatorCodes มา → normalize (main/sub ตามที่ระบบกำหนด) แล้วใช้
   - ถ้าไม่ส่งแต่มีผล AI (suggestedIndicators) → ใช้จาก AI หลัง normalize
   - ถ้าไม่มีทั้งคู่ → ใช้ค่า default (เช่น main: [], sub: [])

5. **PDPA (optional)**
   - ถ้าเปิดใช้: ตรวจข้อความที่เกี่ยวข้อง (เช่นชื่อไฟล์/คำอธิบาย) แล้วเก็บ pdpaChecked, pdpaRiskLevel

6. **บันทึกลง EvidencePortfolio**
   - teacherId, itemType=FILE, originalFilename, standardFilename, fileUrl, fileSize, mimeType, evidenceType, indicatorCodes, uploadedBy
   - aiSummary, aiKeywords, aiQualityCheck, aiSuggestions (ถ้ามีจาก AI)
   - pdpaChecked, pdpaRiskLevel (ถ้ามี)

### 3.2 การรับวิดีโอ (VIDEO_LINK)

1. **Input:** teacherId, videoUrl, videoTitle, videoDescription (optional), videoPlatform (optional), evidenceType, indicatorCodes (optional), uploadedBy

2. **Validation**
   - ตรวจ teacherId มีในระบบ
   - (optional) ตรวจ URL ว่าเป็นแพลตฟอร์มที่รองรับ (YouTube, Google Drive, Vimeo ฯลฯ) และตั้ง videoPlatform อัตโนมัติถ้าไม่ส่ง

3. **PDPA (optional)**
   - ถ้าเปิด (เช่น ENABLE_PDPA_CHECK_VIDEO_LINK=true): ตรวจ videoTitle + videoDescription → เก็บ riskLevel

4. **บันทึกลง EvidencePortfolio**
   - itemType=VIDEO_LINK, videoUrl, videoTitle, videoDescription, videoPlatform, evidenceType, indicatorCodes (หรือ []), uploadedBy, pdpaChecked/pdpaRiskLevel
   - ไม่บังคับเรียก AI ใน flow เพิ่มลิงก์ (สามารถมี flow แยก “วิเคราะห์วิดีโอ” ผ่าน AnalysisJob ได้)

### 3.3 การวิเคราะห์ด้วย AI (หลังอัปโหลด หรือแยก flow)

- **สำหรับไฟล์ (ชื่อ/ประเภท):**
  - Input: filename, fileType (mimeType), userId
  - เรียก AI (เช่น Gemini): สรุปเนื้อหา, keywords, แนะนำตัวชี้วัด (suggestedIndicators), ชื่อไฟล์มาตรฐาน (suggestedFilename), qualityCheck, suggestions
  - อัปเดต EvidencePortfolio: aiSummary, aiKeywords, aiQualityCheck, aiSuggestions, indicatorCodes (จาก suggestedIndicators หลัง normalize), standardFilename

- **สำหรับวิดีโอ/ชิ้นงาน (Analysis Job):**
  - อัปโหลดหรือส่ง URL → สร้าง AnalysisJob
  - Pipeline: ASR (ถ้ามีเสียง) → ดึง frames (ถ้า mode FULL) → เรียก AI วิเคราะห์ (transcript + frames) → เก็บ transcriptSummary, analysisReport, evaluationResult, aiAdvice
  - หลัง DONE: ตั้ง indicatorCodes (จากผู้ใช้หรือจาก AI) เพื่อใช้ใน completeness และ PowerPoint

### 3.4 การจัดเก็บตามกลุ่มตัวชี้วัด

- **ไม่สร้างตารางแยก:** การ “จัดเก็บตามกลุ่มตัวชี้วัด” คือการที่แต่ละ EvidencePortfolio และ AnalysisJob มี `indicatorCodes` อยู่แล้ว
- **การจัดกลุ่มเมื่อใช้งาน:** เวลาแสดงผลหรือคำนวณ completeness / สร้าง PowerPoint จะ:
  - filter หลักฐานตาม teacherId (และตามรอบถ้าตัวชี้วัดมี assessmentRounds)
  - group by indicator code: สำหรับแต่ละตัวชี้วัด (เช่น PRO_1.1) ดึงรายการที่ indicatorCodes มีรหัสนั้นหรือขึ้นต้นด้วยรหัสนั้น

---

## 4. Logic การประเมินความพร้อม (Completeness & Pass Criteria)

1. **รวบรวมหลักฐาน (gatherEvidence)**
   - ดึง EvidencePortfolio ทั้งหมดของครู (FILE + VIDEO_LINK)
   - ดึง AnalysisJob ทั้งหมดที่ teacherId ตรง และ status = DONE
   - (ถ้ามี) ดึง reflective journals, PLC activities, mentoring visits, indicatorAssessments

2. **สำหรับแต่ละตัวชี้วัดที่ใช้ในรอบนั้น (isIndicatorInRound)**
   - ได้รายการ “checks” (EvidenceCheck) ของตัวชี้วัดนั้น เช่น ต้องมีวิดีโอ/ไฟล์/บันทึกสะท้อน/PLC
   - ตรวจแต่ละ check ว่าเป็นจริงหรือไม่ โดยดูจาก:
     - portfolio items ที่มี indicatorCodes ตรง/ขึ้นต้นกับตัวชี้วัด
     - analysis jobs ที่มี indicatorCodes ตรง/ขึ้นต้นกับตัวชี้วัด
     - journals / PLC / assessment details ตามประเภท check
   - คำนวณ score ต่อตัวชี้วัด (เช่น weight ต่อ check แล้วรวมเป็น 0–100)

3. **Domain & Deck**
   - Domain score = เฉลี่ยคะแนนตัวชี้วัดใน domain นั้น (PROFESSIONAL, SOCIAL, PERSONAL)
   - Deck score = เฉลี่ยคะแนนสไลด์ (หรือเฉลี่ยตัวชี้วัดทั้งหมดที่ใช้ในรอบ)
   - Pass criteria ตาม round (ตามข้อ 2.4): ผ่านด้านวิชาชีพ/สังคม/บุคคลตามจำนวนข้อที่กำหนด → overall = ผ่านทุกด้านที่ใช้ในรอบ

4. **ผลลัพธ์ที่แอปอื่นต้องได้**
   - รายตัวชี้วัด: id, name, score, status (เช่น INSUFFICIENT / SUFFICIENT / GOOD), รายการหลักฐานที่เชื่อม (sessions/files/journals)
   - ต่อ domain: score, passedCount, itemCount
   - passCriteria: professional/social/personal (required, actual, passed) และ overall

---

## 5. Logic การสร้าง PowerPoint

1. **ข้อมูลที่ต้องมี (Development Summary Data)**
   - ข้อมูลครู: teacherId, teacherName, schoolName, position, educationOffice
   - รอบและปี: assessmentRound, academicYear
   - คะแนนและสถานะ: overallScore, overallStatus, overallPassed, totalEvidence, totalFiles, totalVideoLinks, totalAnalysisJobs
   - domains: แต่ละ domain มี indicators แต่ละตัวมี score, status, files, videoLinks, aiAnalyses, highlights
   - aiInsights: teachingStrengths, areasForImprovement, recommendations, activeLearningSignals
   - summaryNarrative
   - **indicatorNarratives:** { "PRO_1.1": "ข้อความบรรยาย...", ... } สำหรับใส่ในสไลด์ตัวชี้วัด
   - completeness (รวม passCriteria)

2. **ขั้นตอนสร้าง .pptx**
   - โหลด template (ถ้ามี) หรือใช้ layout 16:9
   - สร้างสไลด์ตามลำดับ: หน้าปก → ข้อมูลครู → ภาพรวมความพร้อม (คะแนน/จำนวนหลักฐาน) → แบ่ง domain → แต่ละตัวชี้วัด (ชื่อ, คะแนน/สถานะ, narrative จาก indicatorNarratives, หลักฐานที่เชื่อม) → AI insights → สรุป → ขอบคุณ
   - Export เป็น buffer หรือไฟล์ .pptx (Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation)

3. **การได้ indicatorNarratives**
   - เก็บใน DevelopmentSummary.indicatorNarratives (จาก input ครู หรือจาก AI generate)
   - เวลา generate สรุปใหม่: ถ้ามีค่าเดิมใน DB ใช้ต่อ ไม่ลบทิ้ง; ส่วนที่ยังไม่มีอาจให้ AI สร้างจาก evidenceByIndicator + PLC takeaways

---

## 6. API / Endpoints ที่เกี่ยวข้อง (สำหรับส่งต่อให้แอปอื่น)

- **หลักฐาน**
  - POST อัปโหลดไฟล์: teacherId, file, evidenceType, indicatorCodes?, uploadedBy
  - POST สร้างวิดีโอลิงก์: teacherId, videoUrl, videoTitle, videoDescription?, videoPlatform?, evidenceType, indicatorCodes?, uploadedBy
  - GET รายการหลักฐานตามครู: teacherId, filters (evidenceType?, indicatorCode?, isVerified?)
  - PATCH/PUT อัปเดตรายการ (เช่น indicatorCodes, aiSummary หลัง AI วิเคราะห์)

- **AI**
  - POST วิเคราะห์หลักฐาน (สรุป + แนะนำตัวชี้วัด): ใช้กับ portfolio item (filename, fileType, userId) แล้วอัปเดต item
  - Analysis Job: สร้าง job → อัปโหลด/ส่ง URL → poll status → เมื่อ DONE อ่าน transcriptSummary, analysisReport, evaluationResult, aiAdvice, indicatorCodes

- **ความพร้อม**
  - GET คำนวณ completeness: teacherId, assessmentRound → DeckCompleteness + passCriteria
  - GET Development Summary: teacherId, assessmentRound, academicYear → DevelopmentSummaryData

- **PowerPoint**
  - POST generate & download PPTX: teacherId, assessmentRound, academicYear?, templateId? → ไฟล์ .pptx

---

## 7. สิ่งที่แอปพลิเคชันอื่นต้องทำเพื่อนำไปเป็น Feature ใหม่

1. **ใช้ API เดิม (ถ้ามี)**  
   เรียก endpoints ตามข้อ 6 ตาม flow: อัปโหลด/เพิ่มวิดีโอ → (optional) เรียก AI วิเคราะห์ → อัปเดต indicatorCodes → ดึง completeness → ดึง Development Summary → generate PPTX แล้วดาวน์โหลด

2. **Replicate ใน stack ใหม่**
   - สร้างเทียบเท่าโมเดล: EvidencePortfolio (FILE/VIDEO_LINK), AnalysisJob (ถ้าต้องการวิเคราะห์วิดีโอ), Indicator/SubIndicator, DevelopmentSummary
   - Implement logic ตามข้อ 3 (การบันทึก), ข้อ 4 (completeness + pass criteria), ข้อ 5 (สร้าง .pptx)
   - ใช้ config ตัวชี้วัดและ pass criteria (ราย round) ให้ตรงกับ doc_ref6 หรือสเปกที่ตกลงกัน

3. **การ sync ข้อมูลข้ามระบบ (ถ้ามีสองแอป)**
   - กำหนดว่า teacherId, indicator codes, assessmentRound, academicYear เป็น key ร่วม
   - Export/import อย่างน้อย: หลักฐาน (กับ indicatorCodes), ผล completeness / Development Summary, และถ้าต้องการ indicatorNarratives สำหรับ PPTX

---

## 8. เอกสารอ้างอิงในโปรเจกต์

- Schema: `packages/database/prisma/schema.prisma` (EvidencePortfolio, AnalysisJob, Indicator, SubIndicator, IndicatorAssessment, DevelopmentSummary)
- Evidence upload/link: `apps/api/src/evidence/evidence.service.ts`
- AI หลักฐาน: `apps/api/src/ai/evidence-ai.service.ts`
- Completeness: `apps/api/src/indicators/completeness.service.ts`
- Development Summary: `apps/api/src/indicators/development-summary.service.ts`
- PowerPoint: `apps/api/src/indicators/pptx-generator.service.ts`, `development-summary.controller.ts` (POST .../pptx)
- Config ตัวชี้วัด/checks: `packages/shared` (เช่น INDICATOR_CHECK_CONFIG, getSlidesForRound)

---

**หมายเหตุ:** PRD นี้สรุปจาก codebase ปัจจุบันของ TeacherMon เพื่อให้ทีมหรือแอปพลิเคชันอื่นสามารถนำ logic ไป implement หรือ integrate ต่อได้โดยไม่ต้องเปิด code ทั้งก้อน หากมีการเปลี่ยน business rule (เช่น เกณฑ์ผ่านหรือรายการตัวชี้วัด) ควรอัปเดตทั้ง config และเอกสารนี้ให้สอดคล้องกัน
