# คู่มือการออกแบบ Database สำหรับ PA (Performance Agreement)

## ภาพรวม

เอกสารนี้อธิบายการออกแบบ database สำหรับรองรับการประเมินผลการพัฒนางานตามข้อตกลง (PA) ควบคู่กับระบบประกันคุณภาพการศึกษา (QA) ที่มีอยู่เดิม

## โครงสร้าง PA

### ส่วนที่ 1: ข้อตกลงในการพัฒนางานตามมาตรฐานตำแหน่ง (60 คะแนน)

มี **5 ด้าน** รวม **15 ตัวชี้วัด**:

| ด้าน | ชื่อ | จำนวนตัวชี้วัด |
|------|------|----------------|
| P1 | ด้านการบริหารวิชาการและความเป็นผู้นำทางวิชาการ | 6 |
| P2 | ด้านการบริหารจัดการสถานศึกษา | 3 |
| P3 | ด้านการบริหารการเปลี่ยนแปลงเชิงกลยุทธ์และนวัตกรรม | 2 |
| P4 | ด้านการบริหารงานชุมชนและเครือข่าย | 2 |
| P5 | ด้านการพัฒนาตนเองและวิชาชีพ | 2 |

### ส่วนที่ 2: ข้อตกลงประเด็นท้าทาย (40 คะแนน)

มี **3 ข้อพิจารณา**:

| รหัส | ชื่อ | คะแนน |
|------|------|--------|
| C1 | วิธีดำเนินการ | 20 |
| C2.1 | ผลลัพธ์การพัฒนา - เชิงปริมาณ | 10 |
| C2.2 | ผลลัพธ์การพัฒนา - เชิงคุณภาพ | 10 |

### ระดับการประเมิน

| คะแนน | ระดับ | คำอธิบาย |
|--------|-------|----------|
| 1 | ปฏิบัติได้ต่ำกว่าระดับที่คาดหวังมาก | ต้องปรับปรุงอย่างมาก |
| 2 | ปฏิบัติได้ต่ำกว่าระดับที่คาดหวัง | ต้องปรับปรุงเพิ่มเติม |
| 3 | ปฏิบัติได้ตามระดับที่คาดหวัง | ดำเนินการตามเกณฑ์ |
| 4 | ปฏิบัติได้สูงกว่าระดับที่คาดหวัง | มีนวัตกรรม/แนวปฏิบัติดีเยี่ยม |

---

## โครงสร้าง Database

### ตารางหลัก

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAAspect                                │
│                    (5 ด้านของ PA)                              │
├─────────────────────────────────────────────────────────────────┤
│ id, code, nameTh, sortNo, description, maxScore, part        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAIndicator                               │
│                  (15 ตัวชี้วัด)                                │
├─────────────────────────────────────────────────────────────────┤
│ id, aspectId, code, nameTh, description, sortNo, weight        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PAIndicatorScale                               │
│              (เกณฑ์คะแนน 1-4)                                  │
├─────────────────────────────────────────────────────────────────┤
│ id, indicatorId, score, labelTh, descriptionTh, criteriaTh     │
└─────────────────────────────────────────────────────────────────┘
```

### ตารางข้อตกลงและการประเมิน

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAAgreement                                 │
│              (ข้อตกลง PA ของแต่ละคน/ปี)                        │
├─────────────────────────────────────────────────────────────────┤
│ id, schoolId, userId, fiscalYear, status, totalScore           │
│ part1Score, part2Score, isPassed, startDate, endDate           │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ PAAgreementItem│ │PAChallengeItem │ │  PASummary     │
├────────────────┤ ├────────────────┤ ├────────────────┤
│ (รายการตัวชี้ │ │(ประเด็นท้าทาย) │ │  (สรุปผล)      │
│     วัด)       │ │   ส่วนที่ 2     │ │                │
├────────────────┤ ├────────────────┤ ├────────────────┤
│ agreementId    │ │ agreementId    │ │ userId         │
│ indicatorId    │ │ title          │ │ fiscalYear     │
│ score          │ │ c1MethodScore  │ │ grandTotal     │
│ comment        │ │ c21QuantScore  │ │ isPassed       │
└────────────────┘ │ c22QualScore   │ └────────────────┘
         │        └────────────────┘
         │                  │
         │                  ▼
         │        ┌────────────────────────┐
         │        │ PAChallengeConsideration│
         │        ├────────────────────────┤
         │        │ challengeId            │
         │        │ considerationId        │
         │        │ score                  │
         │        └────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PAEvidenceMapping                              │
│           (เชื่อมหลักฐานกับรายการประเมิน)                       │
├─────────────────────────────────────────────────────────────────┤
│ id, evidenceId, agreementItemId, challengeConsiderationId       │
│ note, relevanceLevel                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## หลักการเชื่อมโยงหลักฐาน (Many-to-Many)

### แนวคิดหลัก

**หลักฐานชิ้นเดียวกัน สามารถใช้ประกอบการประเมินได้หลายมุมมอง:**

```
┌──────────────────────────────────────────────────────────────────┐
│                        Evidence (หลักฐาน)                         │
│                   (ตารางเดิมที่มีอยู่)                           │
├──────────────────────────────────────────────────────────────────┤
│ id, title, description, schoolId, fiscalYear, indicatorId      │
└──────────────────────────────────────────────────────────────────┘
         │
         │ 1 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
         │                        │
         │ N                      │ N
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│SelfAssessment    │    │  PAEvidenceMapping│
│EvidenceLink      │    │                  │
├──────────────────┤    ├──────────────────┤
│ (เชื่อม QA)      │    │   (เชื่อม PA)    │
├──────────────────┤    ├──────────────────┤
│ evidenceId       │    │ evidenceId       │
│ selfIndicatorId  │    │ agreementItemId  │
│ note             │    │ OR               │
└──────────────────┘    │ challengeConsiderationId
                        └──────────────────┘
```

### ตัวอย่างการใช้งาน

**ตัวอย่าง 1: หลักฐานชิ้นเดียวใช้ได้ทั้ง QA และ PA**

```sql
-- หลักฐาน: "แผนการพัฒนาหลักสูตรสถานศึกษา"
-- สามารถเชื่อมได้ทั้ง:
-- - QAIndicator: 2.1 (หลักสูตร)
-- - PAIndicator: 1.2 (การจัดทำและพัฒนาหลักสูตร)

-- 1. บันทึกหลักฐาน (Evidence)
INSERT INTO evidence (schoolId, indicatorId, fiscalYear, title, ...)
VALUES (1, [QAIndicator_id], 2567, 'แผนพัฒนาหลักสูตร', ...);

-- 2. เชื่อมกับ QA (ผ่าน SelfAssessmentEvidenceLink)
INSERT INTO selfassessmentevidencelink (evidenceId, selfIndicatorId, note)
VALUES ([evidence_id], [selfAssessmentIndicator_id], 'ใช้ประกอบตัวชี้วัด 2.1');

-- 3. เชื่อมกับ PA (ผ่าน PAEvidenceMapping)
INSERT INTO paevidencemapping (evidenceId, agreementItemId, note, relevanceLevel)
VALUES ([evidence_id], [paAgreementItem_id], 'ใช้ประกอบตัวชี้วัด PA 1.2', 4);
```

**ตัวอย่าง 2: การวิเคราะห์หลักฐานจากหลายมุมมอง**

```sql
-- ค้นหาหลักฐานที่เชื่อมกับทั้ง QA และ PA
SELECT 
    e.id,
    e.title,
    qa.indicator.code as qa_indicator,
    pa.indicator.code as pa_indicator,
    pa.mapping.relevanceLevel
FROM evidence e
LEFT JOIN selfassessmentevidencelink qa_link ON e.id = qa_link.evidenceId
LEFT JOIN selfassessmentindicator qa ON qa_link.selfIndicatorId = qa.id
LEFT JOIN paevidencemapping pa_link ON e.id = pa_link.evidenceId
LEFT JOIN paagreementitem pa_item ON pa_link.agreementItemId = pa_item.id
LEFT JOIN paindicator pa ON pa_item.indicatorId = pa.id
WHERE e.schoolId = 1 AND e.fiscalYear = 2567;
```

---

## การคำนวณคะแนน

### สูตรคำนวณคะแนน PA

```typescript
// ส่วนที่ 1: คะแนนเฉลี่ยจาก 15 ตัวชี้วัด (เท่ากัน)
const part1Score = (sumOfAllIndicatorScores / 15) * 60 / 4; // แปลงเป็น 60 คะแนน

// ส่วนที่ 2: คะแนนรวม 3 ข้อพิจารณา
const c1Score = c1MethodScore * 5;     // 4 x 5 = 20 คะแนน
const c21Score = c21QuantScore * 2.5;  // 4 x 2.5 = 10 คะแนน
const c22Score = c22QualScore * 2.5;   // 4 x 2.5 = 10 คะแนน
const part2Score = c1Score + c21Score + c22Score;

// คะแนนรวม
const totalScore = part1Score + part2Score; // 100 คะแนน

// เกณฑ์ผ่าน: ร้อยละ 70 (70 คะแนน)
const isPassed = totalScore >= 70;
```

### ตาราง PASummary

ตารางนี้เก็บสรุปผลการประเมินเพื่อใช้สำหรับรายงาน:

```sql
-- อัพเดทสรุปผลหลังประเมินเสร็จ
INSERT INTO pasummary (
    schoolId, userId, fiscalYear,
    p1AcademicScore, p2ManagementScore, p3InnovationScore, 
    p4NetworkScore, p5DevelopmentScore, part1Total,
    c1MethodScore, c2QuantScore, c2QualScore, part2Total,
    grandTotal, isPassed, 
    totalEvidenceCount, qaLinkedCount, paLinkedCount
)
SELECT 
    pa.schoolId,
    pa.userId,
    pa.fiscalYear,
    -- คะแนนแยกด้าน
    AVG(CASE WHEN aspect.code = 'P1' THEN item.score END) as p1Score,
    AVG(CASE WHEN aspect.code = 'P2' THEN item.score END) as p2Score,
    -- ... ด้านอื่นๆ
    -- สถิติหลักฐาน
    COUNT(DISTINCT e.id) as totalEvidence,
    COUNT(DISTINCT qa_link.id) as qaCount,
    COUNT(DISTINCT pa_link.id) as paCount
FROM paagreement pa
JOIN paagreementitem item ON pa.id = item.agreementId
JOIN paindicator ind ON item.indicatorId = ind.id
JOIN paaspect aspect ON ind.aspectId = aspect.id
LEFT JOIN paevidencemapping pa_link ON item.id = pa_link.agreementItemId
LEFT JOIN evidence e ON pa_link.evidenceId = e.id
LEFT JOIN selfassessmentevidencelink qa_link ON e.id = qa_link.evidenceId
WHERE pa.id = [agreement_id]
GROUP BY pa.id;
```

---

## API และ Use Cases

### 1. สร้างข้อตกลง PA ใหม่

```typescript
// สร้างข้อตกลงพร้อมรายการตัวชี้วัดทั้ง 15 รายการ
async function createPAAgreement(data: {
    schoolId: bigint;
    userId: bigint;
    fiscalYear: number;
    startDate: Date;
    endDate: Date;
}) {
    return await prisma.$transaction(async (tx) => {
        // 1. สร้างข้อตกลง
        const agreement = await tx.pAAgreement.create({
            data: {
                schoolId: data.schoolId,
                userId: data.userId,
                fiscalYear: data.fiscalYear,
                startDate: data.startDate,
                endDate: data.endDate,
                status: 'DRAFT'
            }
        });
        
        // 2. ดึงตัวชี้วัดทั้งหมด
        const indicators = await tx.pAIndicator.findMany();
        
        // 3. สร้างรายการประเมินเปล่าๆ ให้ครบ 15 รายการ
        await tx.pAAgreementItem.createMany({
            data: indicators.map(ind => ({
                agreementId: agreement.id,
                indicatorId: ind.id
            }))
        });
        
        return agreement;
    });
}
```

### 2. เชื่อมหลักฐานกับตัวชี้วัด PA

```typescript
// เชื่อมหลักฐานที่มีอยู่แล้วเข้ากับตัวชี้วัด PA
async function linkEvidenceToPA(
    evidenceId: bigint,
    agreementItemId: bigint,
    note?: string,
    relevanceLevel?: number
) {
    return await prisma.pAEvidenceMapping.create({
        data: {
            evidenceId,
            agreementItemId,
            note,
            relevanceLevel
        }
    });
}
```

### 3. ค้นหาหลักฐานที่ใช้ได้ทั้ง QA และ PA

```typescript
// หาหลักฐานที่เชื่อมกับทั้ง QA และ PA (reusable evidence)
async function findReusableEvidence(schoolId: bigint, fiscalYear: number) {
    return await prisma.evidence.findMany({
        where: {
            schoolId,
            fiscalYear,
            AND: [
                { paMappings: { some: {} } },
                { selfAssessmentLinks: { some: {} } }
            ]
        },
        include: {
            paMappings: {
                include: {
                    agreementItem: {
                        include: { indicator: true }
                    }
                }
            },
            selfAssessmentLinks: {
                include: {
                    selfIndicator: {
                        include: { indicator: true }
                    }
                }
            }
        }
    });
}
```

### 4. รายงานสรุปผล PA รายโรงเรียน

```typescript
// รายงานสรุปผลการประเมิน PA รายโรงเรียน
async function getPASummaryReport(schoolId: bigint, fiscalYear: number) {
    return await prisma.pASummary.groupBy({
        by: ['isPassed'],
        where: { schoolId, fiscalYear },
        _count: { id: true },
        _avg: { grandTotal: true }
    });
}
```

---

## Migration และการติดตั้ง

### วิธีการติดตั้ง

```bash
# 1. รัน SQL Migration
cd prisma/migrations/add_pa_tables
mysql -u root -p ssar < migration.sql

# 2. อัพเดท Prisma Client
npx prisma generate

# 3. ตรวจสอบความถูกต้อง
npx prisma db pull
npx prisma validate
```

### ข้อมูลเริ่มต้น

Migration script จะสร้างข้อมูลเริ่มต้นให้อัตโนมัติ:
- 5 ด้าน PA (PAAspect)
- 15 ตัวชี้วัด (PAIndicator)
- เกณฑ์คะแนน 1-4 สำหรับทุกตัวชี้วัด (PAIndicatorScale)
- 3 ข้อพิจารณา (PAConsideration)

---

## ความสัมพันธ์กับระบบเดิม

### ตารางที่เพิ่ม Relations

```prisma
// ใน School model
model School {
  // ... existing fields
  paAgreements PAAgreement[]
  paSummaries  PASummary[]
}

// ใน Evidence model  
model Evidence {
  // ... existing fields
  paMappings PAEvidenceMapping[]
}
```

### การใช้งานร่วมกับ QA

| ฟีเจอร์ | QA | PA | ใช้ร่วมกัน |
|---------|-----|-----|-----------|
| หลักฐาน (Evidence) | ✓ | ✓ | ✓ ใช้ชิ้นเดียวกัน |
| ตัวชี้วัด | QAIndicator | PAIndicator | ✗ แยกกัน |
| การประเมิน | SelfAssessment | PAAgreement | ✗ แยกกัน |
| ไฟล์แนบ | EvidenceFile | EvidenceFile | ✓ ใช้ชิ้นเดียวกัน |

---

## Best Practices

1. **การเชื่อมหลักฐาน**: ควรระบุ `relevanceLevel` เพื่อบอกว่าหลักฐานนี้สนับสนุนระดับใด

2. **การคำนวณคะแนน**: ใช้ Transaction เมื่อบันทึกคะแนนเพื่อความสอดคล้องกัน

3. **การสรุปผล**: อัพเดท PASummary หลังจากบันทึกคะแนนเสร็จเสมอ

4. **การค้นหา**: ใช้ Index ที่สร้างไว้เพื่อประสิทธิภาพการค้นหา

5. **การรายงาน**: ใช้ PASummary สำหรับรายงานแทนการคำนวณ real-time
