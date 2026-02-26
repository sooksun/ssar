/**
 * PQA องค์ประกอบที่ ๔ (ผลลัพธ์และการพัฒนา): สร้าง PowerPoint จาก Development Summary
 * ใช้ผลจากการประเมินเพื่อสื่อสารและพัฒนา — สไลด์: หน้าปก → ข้อมูลครู → ความพร้อม → domain → ตัวชี้วัด → AI → สรุป
 * @see docs/PQA_FRAMEWORK.md
 */

import PptxGenJS from 'pptxgenjs';
import type { DevelopmentSummaryData, TeacherPASummaryData, SchoolPASummaryData } from './development-summary';

const TITLE_FONT_SIZE = 24;
const BODY_FONT_SIZE = 14;
const HEADING_FONT_SIZE = 18;

export async function generateDevelopmentSummaryPptx(
  data: DevelopmentSummaryData
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const { teacherName, schoolName, assessmentRound, fiscalYear, overallScore, overallPassed, totalEvidence, totalFiles, totalVideoLinks, domains, aiInsights, indicatorNarratives } = data;

  const addSlide = () => pptx.addSlide();

  // หน้าปก
  let slide = addSlide();
  slide.addText('สรุปผลพัฒนาอย่างเข้ม', {
    x: 0.5,
    y: 2,
    w: 12,
    h: 1,
    fontSize: TITLE_FONT_SIZE,
    bold: true,
    align: 'center',
  });
  slide.addText(`ครั้งที่ ${assessmentRound} ปีงบประมาณ ${fiscalYear}`, {
    x: 0.5,
    y: 3,
    w: 12,
    h: 0.6,
    fontSize: BODY_FONT_SIZE,
    align: 'center',
  });

  // ข้อมูลครู
  slide = addSlide();
  slide.addText('ข้อมูลครู', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  slide.addText(`ชื่อ: ${teacherName}`, { x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`สถานศึกษา: ${schoolName}`, { x: 0.5, y: 1.8, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`รอบการประเมิน: ครั้งที่ ${assessmentRound}`, { x: 0.5, y: 2.4, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`ปีงบประมาณ: ${fiscalYear}`, { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });

  // ภาพรวมความพร้อม
  slide = addSlide();
  slide.addText('ภาพรวมความพร้อม', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  slide.addText(`คะแนนรวม: ${overallScore.toFixed(1)}`, { x: 0.5, y: 1.2, w: 6, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`ผลการประเมิน: ${overallPassed ? 'ผ่าน' : 'ไม่ผ่าน'}`, { x: 0.5, y: 1.8, w: 6, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`จำนวนหลักฐาน: ${totalEvidence} รายการ`, { x: 0.5, y: 2.4, w: 6, h: 0.5, fontSize: BODY_FONT_SIZE });
  slide.addText(`ไฟล์แนบ: ${totalFiles} | ลิงก์วิดีโอ: ${totalVideoLinks}`, { x: 0.5, y: 3, w: 6, h: 0.5, fontSize: BODY_FONT_SIZE });

  // แบ่งตาม domain
  for (const domain of domains) {
    const domainLabel = domain.domain === 'professional' ? 'ด้านวิชาชีพ' : domain.domain === 'social' ? 'ด้านสังคม' : 'ด้านบุคคล';
    slide = addSlide();
    slide.addText(domainLabel, { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
    slide.addText(`คะแนน: ${domain.score.toFixed(1)} | ผ่าน ${domain.passedCount}/${domain.itemCount} ข้อ`, {
      x: 0.5,
      y: 1.1,
      w: 12,
      h: 0.5,
      fontSize: BODY_FONT_SIZE,
    });

    const rows: { text: string }[][] = domain.indicators.map((i) => [
      { text: i.code },
      { text: i.name.slice(0, 40) + (i.name.length > 40 ? '...' : '') },
      { text: String(i.score) },
      { text: i.status },
      { text: String(i.evidenceCount) },
    ]);
    slide.addTable(rows, {
      x: 0.5,
      y: 1.8,
      w: 12,
      colW: [1, 5, 1, 1.5, 1],
      fontSize: 12,
      border: { type: 'solid', pt: 0.5 },
    });
  }

  // ตัวชี้วัดละสไลด์ (สรุป narrative)
  const allIndicators = domains.flatMap((d) => d.indicators);
  for (const ind of allIndicators) {
    const narrative = indicatorNarratives[ind.code] ?? '-';
    slide = addSlide();
    slide.addText(`${ind.code} - ${ind.name}`, {
      x: 0.5,
      y: 0.5,
      w: 12,
      h: 0.8,
      fontSize: 14,
      bold: true,
    });
    slide.addText(`คะแนน: ${ind.score} | สถานะ: ${ind.status} | หลักฐาน: ${ind.evidenceCount} รายการ`, {
      x: 0.5,
      y: 1.3,
      w: 12,
      h: 0.5,
      fontSize: 12,
    });
    slide.addText(narrative, {
      x: 0.5,
      y: 2,
      w: 12,
      h: 2,
      fontSize: 12,
      valign: 'top',
    });
  }

  // AI insights
  if (aiInsights && (aiInsights.teachingStrengths?.length || aiInsights.recommendations?.length)) {
    slide = addSlide();
    slide.addText('ข้อเสนอแนะจาก AI', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
    let y = 1.2;
    if (aiInsights.teachingStrengths?.length) {
      slide.addText('จุดเด่น:', { x: 0.5, y, w: 12, h: 0.4, fontSize: BODY_FONT_SIZE, bold: true });
      y += 0.5;
      for (const s of aiInsights.teachingStrengths) {
        slide.addText(`• ${s.slice(0, 80)}${s.length > 80 ? '...' : ''}`, { x: 0.5, y, w: 12, h: 0.5, fontSize: 12 });
        y += 0.5;
      }
      y += 0.3;
    }
    if (aiInsights.recommendations?.length) {
      slide.addText('ข้อเสนอแนะ:', { x: 0.5, y, w: 12, h: 0.4, fontSize: BODY_FONT_SIZE, bold: true });
      y += 0.5;
      for (const r of aiInsights.recommendations) {
        slide.addText(`• ${r.slice(0, 80)}${r.length > 80 ? '...' : ''}`, { x: 0.5, y, w: 12, h: 0.5, fontSize: 12 });
        y += 0.5;
      }
    }
  }

  // สรุป
  slide = addSlide();
  slide.addText('สรุป', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  slide.addText(`ผลการประเมินความพร้อม: ${overallPassed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}`, {
    x: 0.5,
    y: 1.2,
    w: 12,
    h: 0.5,
    fontSize: BODY_FONT_SIZE,
  });
  slide.addText(`คะแนนรวม ${overallScore.toFixed(1)} คะแนน`, {
    x: 0.5,
    y: 1.8,
    w: 12,
    h: 0.5,
    fontSize: BODY_FONT_SIZE,
  });

  // ขอบคุณ
  slide = addSlide();
  slide.addText('ขอบคุณ', {
    x: 0.5,
    y: 3,
    w: 12,
    h: 0.8,
    fontSize: TITLE_FONT_SIZE,
    bold: true,
    align: 'center',
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

export function getPptxFilename(teacherName: string, assessmentRound: number): string {
  const safe = teacherName.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 30);
  return `สรุปผลพัฒนาอย่างเข้ม-ครั้งที่${assessmentRound}-${safe}.pptx`;
}

// =============================================================================
// PA Teacher PPTX
// =============================================================================

export async function generateTeacherPAPptx(data: TeacherPASummaryData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const positionLabel = data.positionType === 'TEACHER' ? 'ครู' : 'ผู้บริหารสถานศึกษา';
  const addSlide = () => pptx.addSlide();

  // หน้าปก
  let slide = addSlide();
  slide.addText('สรุปผลการประเมิน PA', {
    x: 0.5, y: 1.5, w: 12, h: 1,
    fontSize: TITLE_FONT_SIZE, bold: true, align: 'center',
  });
  slide.addText(`ตำแหน่ง: ${positionLabel}`, {
    x: 0.5, y: 2.8, w: 12, h: 0.6,
    fontSize: HEADING_FONT_SIZE, align: 'center',
  });
  slide.addText(`${data.userName} — ${data.schoolName}`, {
    x: 0.5, y: 3.5, w: 12, h: 0.6,
    fontSize: BODY_FONT_SIZE, align: 'center',
  });
  slide.addText(`ปีงบประมาณ ${data.fiscalYear}`, {
    x: 0.5, y: 4.2, w: 12, h: 0.6,
    fontSize: BODY_FONT_SIZE, align: 'center',
  });

  // ภาพรวมคะแนน
  slide = addSlide();
  slide.addText('ภาพรวมผลการประเมิน', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  const scoreInfo = [
    `ส่วนที่ 1 (ตัวชี้วัด 60 คะแนน): ${data.part1Score?.toFixed(1) ?? '–'}`,
    `ส่วนที่ 2 (ประเด็นท้าทาย 40 คะแนน): ${data.part2Score?.toFixed(1) ?? '–'}`,
    `คะแนนรวม: ${data.totalScore?.toFixed(1) ?? '–'} / 100`,
    `ผลการประเมิน: ${data.isPassed === true ? 'ผ่าน' : data.isPassed === false ? 'ไม่ผ่าน' : 'รอประเมิน'}`,
    `หลักฐานที่เชื่อม: ${data.totalEvidenceLinked} รายการ`,
  ];
  scoreInfo.forEach((text, i) => {
    slide.addText(text, { x: 0.5, y: 1.3 + i * 0.6, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  });

  // แต่ละด้าน
  for (const aspect of data.aspects) {
    slide = addSlide();
    slide.addText(`${aspect.code}: ${aspect.name}`, {
      x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true,
    });
    slide.addText(`คะแนนเฉลี่ย: ${aspect.averageScore.toFixed(2)} / 4`, {
      x: 0.5, y: 1.1, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE,
    });

    const header: { text: string; options?: object }[][] = [
      [
        { text: 'รหัส', options: { bold: true } },
        { text: 'ตัวชี้วัด', options: { bold: true } },
        { text: 'คะแนน', options: { bold: true } },
        { text: 'หลักฐาน', options: { bold: true } },
      ],
    ];
    const rows = aspect.indicators.map((ind) => [
      { text: ind.code },
      { text: ind.name.slice(0, 45) + (ind.name.length > 45 ? '...' : '') },
      { text: ind.score != null ? String(ind.score) : '–' },
      { text: String(ind.evidenceCount) },
    ]);

    slide.addTable([...header, ...rows], {
      x: 0.5, y: 1.8, w: 12,
      colW: [1.2, 7, 1.5, 1.5],
      fontSize: 11,
      border: { type: 'solid', pt: 0.5 },
    });
  }

  // สรุป
  slide = addSlide();
  slide.addText('สรุป', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  slide.addText(
    `ผลการประเมิน PA ${positionLabel}: ${data.isPassed === true ? 'ผ่านเกณฑ์' : data.isPassed === false ? 'ไม่ผ่านเกณฑ์' : 'รอประเมิน'}`,
    { x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE },
  );
  slide.addText(`คะแนนรวม ${data.totalScore?.toFixed(1) ?? '–'} / 100 คะแนน`, {
    x: 0.5, y: 1.8, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE,
  });

  // ขอบคุณ
  slide = addSlide();
  slide.addText('ขอบคุณ', {
    x: 0.5, y: 3, w: 12, h: 0.8,
    fontSize: TITLE_FONT_SIZE, bold: true, align: 'center',
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

// =============================================================================
// PA Principal (School Summary) PPTX
// =============================================================================

export async function generatePrincipalPAPptx(data: SchoolPASummaryData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const addSlide = () => pptx.addSlide();

  // หน้าปก
  let slide = addSlide();
  slide.addText('สรุปผล PA ระดับสถานศึกษา', {
    x: 0.5, y: 1.5, w: 12, h: 1,
    fontSize: TITLE_FONT_SIZE, bold: true, align: 'center',
  });
  slide.addText(data.schoolName, {
    x: 0.5, y: 2.8, w: 12, h: 0.6,
    fontSize: HEADING_FONT_SIZE, align: 'center',
  });
  slide.addText(`ปีงบประมาณ ${data.fiscalYear}`, {
    x: 0.5, y: 3.5, w: 12, h: 0.6,
    fontSize: BODY_FONT_SIZE, align: 'center',
  });

  // สถิติภาพรวม
  slide = addSlide();
  slide.addText('สถิติภาพรวม', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  const stats = [
    `จำนวนครูทั้งหมด: ${data.teacherCount} คน`,
    `จำนวนครูที่มี PA: ${data.teacherWithPA} คน`,
    `ผ่าน: ${data.passedCount} | ไม่ผ่าน: ${data.failedCount} | รอประเมิน: ${data.pendingCount}`,
    `อัตราผ่าน: ${data.passRate}%`,
    `คะแนนเฉลี่ย: ${data.averageScore.toFixed(1)} / 100`,
  ];
  stats.forEach((text, i) => {
    slide.addText(text, { x: 0.5, y: 1.3 + i * 0.6, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  });

  // รายชื่อครู
  if (data.teachers.length > 0) {
    slide = addSlide();
    slide.addText('รายการข้อตกลง PA ครู', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });

    const header: { text: string; options?: object }[][] = [
      [
        { text: 'ชื่อ', options: { bold: true } },
        { text: 'ตำแหน่ง', options: { bold: true } },
        { text: 'คะแนน', options: { bold: true } },
        { text: 'ผล', options: { bold: true } },
        { text: 'สถานะ', options: { bold: true } },
        { text: 'หลักฐาน', options: { bold: true } },
      ],
    ];

    const rows = data.teachers.map((t) => [
      { text: t.userName.slice(0, 25) },
      { text: t.positionType === 'TEACHER' ? 'ครู' : 'ผู้บริหาร' },
      { text: t.totalScore != null ? t.totalScore.toFixed(1) : '–' },
      { text: t.isPassed === true ? 'ผ่าน' : t.isPassed === false ? 'ไม่ผ่าน' : '–' },
      { text: t.status },
      { text: String(t.evidenceCount) },
    ]);

    slide.addTable([...header, ...rows], {
      x: 0.5, y: 1.2, w: 12,
      colW: [3.5, 1.5, 1.5, 1.5, 2, 1.5],
      fontSize: 11,
      border: { type: 'solid', pt: 0.5 },
    });
  }

  // ขอบคุณ
  slide = addSlide();
  slide.addText('ขอบคุณ', {
    x: 0.5, y: 3, w: 12, h: 0.8,
    fontSize: TITLE_FONT_SIZE, bold: true, align: 'center',
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

export function getPAPptxFilename(name: string, positionType: string, fiscalYear: number): string {
  const safe = name.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 30);
  const typeLabel = positionType === 'TEACHER' ? 'ครู' : 'ผู้บริหาร';
  return `PA-${typeLabel}-${safe}-${fiscalYear}.pptx`;
}

// =============================================================================
// ผู้อำนวยการโรงเรียน — รายงาน PA นำเสนอภาคเรียนละ 1 ครั้ง (ตาม ref2)
// @see docs/PRINCIPAL_PPTX_DESIGN.md
// =============================================================================

export type DirectorSemesterReportOptions = {
  /** ภาคเรียนที่ 1 หรือ 2 */
  assessmentRound: number;
  /** ปีการศึกษา พ.ศ. (ใช้ในหน้าปก) */
  fiscalYear: number;
  /** สังกัด เช่น สำนักงานเขตพื้นที่การศึกษาประถมศึกษา XXX */
  areaName?: string;
  /** ความเรียงที่ AI สร้างรายตัวชี้วัด (key = aspect.code + "." + indicator.code เช่น P1.1) */
  indicatorNarratives?: Record<string, string>;
};

/**
 * สร้าง PowerPoint สำหรับผู้อำนวยการโรงเรียน นำเสนอภาคเรียนละ 1 ครั้ง
 * โครงสร้างตาม ref2: หน้าปก (ภาคเรียน + ปีการศึกษา) → ข้อมูลผู้อำนวยการ → 5 ด้าน (P1–P5) → ภาพรวมคะแนน → สรุป → ขอบคุณ
 */
export async function generateDirectorSemesterReportPptx(
  data: TeacherPASummaryData,
  options: DirectorSemesterReportOptions
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const { assessmentRound, fiscalYear, areaName, indicatorNarratives = {} } = options;
  const semesterLabel = assessmentRound === 1 ? 'ภาคเรียนที่ 1' : assessmentRound === 2 ? 'ภาคเรียนที่ 2' : `ครั้งที่ ${assessmentRound}`;
  const addSlide = () => pptx.addSlide();

  // 1. หน้าปก (ตาม ref2)
  let slide = addSlide();
  slide.addText('รายงานผลการพัฒนางานตามข้อตกลง (PA)', {
    x: 0.5, y: 1, w: 12, h: 0.8,
    fontSize: 22, bold: true, align: 'center',
  });
  slide.addText('สำหรับผู้อำนวยการโรงเรียน', {
    x: 0.5, y: 1.8, w: 12, h: 0.6,
    fontSize: HEADING_FONT_SIZE, align: 'center',
  });
  slide.addText(`${semesterLabel} ปีการศึกษา ${fiscalYear}`, {
    x: 0.5, y: 2.6, w: 12, h: 0.6,
    fontSize: BODY_FONT_SIZE + 2, bold: true, align: 'center',
  });
  slide.addText(data.userName, {
    x: 0.5, y: 3.4, w: 12, h: 0.5,
    fontSize: BODY_FONT_SIZE, align: 'center',
  });
  slide.addText(`ผู้อำนวยการสถานศึกษา ${data.schoolName}`, {
    x: 0.5, y: 4, w: 12, h: 0.5,
    fontSize: BODY_FONT_SIZE, align: 'center',
  });
  if (areaName) {
    slide.addText(`สังกัด ${areaName}`, {
      x: 0.5, y: 4.6, w: 12, h: 0.5,
      fontSize: 12, align: 'center',
    });
  }

  // 2. ข้อมูลผู้อำนวยการ / สถานศึกษา
  slide = addSlide();
  slide.addText('ข้อมูลผู้อำนวยการ / สถานศึกษา', {
    x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true,
  });
  const infoLines = [
    `ชื่อ-นามสกุล: ${data.userName}`,
    `ตำแหน่ง: ผู้อำนวยการสถานศึกษา`,
    `สถานศึกษา: ${data.schoolName}`,
    ...(areaName ? [`สังกัด: ${areaName}`] : []),
    `ปีการศึกษา: ${fiscalYear}`,
    `ภาคเรียน: ${semesterLabel}`,
    `สถานะข้อตกลง: ${data.status}`,
  ];
  infoLines.forEach((text, i) => {
    slide.addText(text, { x: 0.5, y: 1.3 + i * 0.55, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  });

  // 3. ส่วนที่ 1 — 5 ด้าน (ตาม ref2: P1–P5) + สไลด์ความเรียงรายตัวชี้วัด (จาก AI)
  for (const aspect of data.aspects) {
    slide = addSlide();
    slide.addText(`ด้านที่ ${aspect.code}: ${aspect.name}`, {
      x: 0.5, y: 0.5, w: 12, h: 0.7, fontSize: HEADING_FONT_SIZE, bold: true,
    });
    slide.addText(`คะแนนเฉลี่ย: ${aspect.averageScore.toFixed(2)} / 4`, {
      x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE,
    });

    const header: { text: string; options?: object }[][] = [
      [
        { text: 'รหัส', options: { bold: true } },
        { text: 'ตัวชี้วัด', options: { bold: true } },
        { text: 'คะแนน', options: { bold: true } },
        { text: 'หลักฐาน', options: { bold: true } },
      ],
    ];
    const rows = aspect.indicators.map((ind) => [
      { text: ind.code },
      { text: ind.name.slice(0, 50) + (ind.name.length > 50 ? '...' : '') },
      { text: ind.score != null ? String(ind.score) : '–' },
      { text: String(ind.evidenceCount) },
    ]);
    slide.addTable([...header, ...rows], {
      x: 0.5, y: 1.8, w: 12,
      colW: [1.2, 7.5, 1.5, 1.5],
      fontSize: 11,
      border: { type: 'solid', pt: 0.5 },
    });

    // สไลด์ความเรียงทีละตัวชี้วัด (AI รวบรวมข้อมูลแล้วเขียนความเรียง)
    for (const ind of aspect.indicators) {
      const narrativeKey = `${aspect.code}.${ind.code}`;
      const narrative = indicatorNarratives[narrativeKey];
      if (!narrative) continue;

      slide = addSlide();
      slide.addText(`${aspect.code}.${ind.code} ${ind.name}`, {
        x: 0.5, y: 0.5, w: 12, h: 0.8, fontSize: 16, bold: true,
      });
      slide.addText(`คะแนน: ${ind.score != null ? ind.score : '–'} / 4 | หลักฐาน: ${ind.evidenceCount} รายการ`, {
        x: 0.5, y: 1.3, w: 12, h: 0.4, fontSize: 12,
      });
      slide.addText(narrative, {
        x: 0.5, y: 1.9, w: 12, h: 4.5, fontSize: 13, valign: 'top',
        wrap: true,
      });
    }
  }

  // 4. ภาพรวมคะแนน PA
  slide = addSlide();
  slide.addText('ภาพรวมผลการประเมิน PA', {
    x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true,
  });
  const scoreLines = [
    `ส่วนที่ 1 (ตัวชี้วัด 60 คะแนน): ${data.part1Score?.toFixed(1) ?? '–'}`,
    `ส่วนที่ 2 (ประเด็นท้าทาย 40 คะแนน): ${data.part2Score?.toFixed(1) ?? '–'}`,
    `คะแนนรวม: ${data.totalScore?.toFixed(1) ?? '–'} / 100`,
    `ผลการประเมิน: ${data.isPassed === true ? 'ผ่าน' : data.isPassed === false ? 'ไม่ผ่าน' : 'รอประเมิน'}`,
    `จำนวนหลักฐานที่เชื่อม: ${data.totalEvidenceLinked} รายการ`,
  ];
  scoreLines.forEach((text, i) => {
    slide.addText(text, { x: 0.5, y: 1.3 + i * 0.6, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE });
  });

  // 5. สรุป (ตาม ref2)
  slide = addSlide();
  slide.addText('สรุป', { x: 0.5, y: 0.5, w: 12, h: 0.6, fontSize: HEADING_FONT_SIZE, bold: true });
  slide.addText(
    `ผลการดำเนินงานใน${semesterLabel} ปีการศึกษา ${fiscalYear}: ${data.isPassed === true ? 'ผ่านเกณฑ์การประเมิน' : data.isPassed === false ? 'ไม่ผ่านเกณฑ์' : 'รอการประเมิน'}`,
    { x: 0.5, y: 1.2, w: 12, h: 0.8, fontSize: BODY_FONT_SIZE },
  );
  slide.addText(`คะแนนรวม ${data.totalScore?.toFixed(1) ?? '–'} / 100 คะแนน`, {
    x: 0.5, y: 2.2, w: 12, h: 0.5, fontSize: BODY_FONT_SIZE,
  });

  // 6. ขอบคุณ
  slide = addSlide();
  slide.addText('ขอบคุณ', {
    x: 0.5, y: 3, w: 12, h: 0.8,
    fontSize: TITLE_FONT_SIZE, bold: true, align: 'center',
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as ArrayBuffer);
}

export function getDirectorSemesterReportPptxFilename(
  directorName: string,
  schoolName: string,
  assessmentRound: number,
  fiscalYear: number
): string {
  const safeName = directorName.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 20);
  const safeSchool = schoolName.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 15);
  const sem = assessmentRound === 1 ? 'ภาคเรียนที่1' : assessmentRound === 2 ? 'ภาคเรียนที่2' : `ครั้งที่${assessmentRound}`;
  return `รายงานPA-ผู้อำนวยการ-${sem}-ปีการศึกษา${fiscalYear}-${safeSchool}-${safeName}.pptx`;
}
