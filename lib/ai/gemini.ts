import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { getIndicatorCatalog } from './indicator-mapping';

const GEMINI_MODEL = 'gemini-2.0-flash';

/** ตัวชี้วัดที่ AI แนะนำ แยกตามมุมมอง (หลักฐาน 1 ชิ้นเชื่อมโยงได้หลายมุมมอง) */
export type QAIndicatorsByLevel = {
  EARLY_CHILDHOOD?: { code: string; reason: string }[];
  BASIC?: { code: string; reason: string }[];
  ASSISTANT_TEACHER?: { code: string; reason: string }[];
};

export interface AnalysisResult {
  summary: string;
  keywords: string[];
  /** ตัวชี้วัด QA แยกตามมุมมอง: ปฐมวัย / ขั้นพื้นฐาน / ครูผู้ช่วย */
  qaIndicatorsByLevel?: QAIndicatorsByLevel;
  /** @deprecated ใช้ qaIndicatorsByLevel.BASIC แทน (คงไว้เพื่อ backward compat) */
  qaIndicators: { code: string; reason: string }[];
  paTeacherIndicators: { code: string; reason: string }[];
  paPrincipalIndicators: { code: string; reason: string }[];
  qualityScore: number;
  suggestions: string[];
}

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(key);
}

/** เพดานขนาดไฟล์ที่ส่ง inline ให้ Gemini — ต่ำกว่าขีดจำกัด ~20MB ของ API เผื่อ overhead ของ base64 + prompt */
export const MAX_INLINE_FILE_BYTES = 15 * 1024 * 1024;

/** ชนิดไฟล์ที่ส่ง inline ได้ — วิดีโอต้องผ่าน Files API ซึ่งยังไม่รองรับในระบบนี้ */
const INLINE_ANALYZABLE_MIME_PREFIXES = ['image/'];
const INLINE_ANALYZABLE_MIME_EXACT = new Set(['application/pdf']);

/**
 * ตรวจว่าไฟล์ส่งให้ Gemini แบบ inline ได้หรือไม่ ก่อนอ่านเข้าหน่วยความจำ
 * โยน Error พร้อมข้อความภาษาไทยเมื่อไม่ผ่าน — ผู้เรียกต้องแปลงเป็น response ให้ผู้ใช้
 */
export function assertFileAnalyzable(filePath: string, mimeType: string): void {
  const normalized = (mimeType || '').toLowerCase();
  const supported =
    INLINE_ANALYZABLE_MIME_EXACT.has(normalized) ||
    INLINE_ANALYZABLE_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));

  if (!supported) {
    throw new Error(
      `ไม่รองรับการวิเคราะห์ไฟล์ชนิด ${mimeType || 'ไม่ทราบชนิด'} ด้วย AI — รองรับเฉพาะรูปภาพและ PDF`
    );
  }

  let size: number;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    throw new Error('ไม่พบไฟล์สำหรับวิเคราะห์');
  }

  if (size > MAX_INLINE_FILE_BYTES) {
    const limitMb = Math.floor(MAX_INLINE_FILE_BYTES / (1024 * 1024));
    throw new Error(`ไฟล์ใหญ่เกินขีดจำกัดการวิเคราะห์ด้วย AI (สูงสุด ${limitMb} MB)`);
  }
}

function fileToBase64Part(filePath: string, mimeType: string): Part {
  const data = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: data.toString('base64'),
      mimeType,
    },
  };
}

function buildPrompt(context: { title: string; description?: string }): string {
  const catalog = getIndicatorCatalog();

  return `คุณเป็นผู้เชี่ยวชาญด้านการประเมินคุณภาพการศึกษาไทย (QA) และการประเมินผลการพัฒนางานตามข้อตกลง (PA)

วิเคราะห์หลักฐานเชิงประจักษ์ต่อไปนี้ (รูปภาพ/วิดีโอ/PDF ฯลฯ):
- ชื่อหลักฐาน: ${context.title}
${context.description ? `- รายละเอียด: ${context.description}` : ''}

หลักฐาน 1 ชิ้นสามารถเชื่อมโยงกับตัวชี้วัดได้หลายมุมมอง: (1) ปฐมวัย (2) ขั้นพื้นฐาน (3) ครูผู้ช่วย — ให้วิเคราะห์แล้วระบุตัวชี้วัดที่เกี่ยวข้องในแต่ละมุมมองที่เหมาะสม

ตัวชี้วัดที่มีในระบบ:

## QA ปฐมวัย (EARLY_CHILDHOOD)
${catalog.qaEarlyChildhood.map((i) => `- ${i.code}: ${i.nameTh}`).join('\n')}

## QA ขั้นพื้นฐาน (BASIC)
${catalog.qaBasic.map((i) => `- ${i.code}: ${i.nameTh}`).join('\n')}

## QA ครูผู้ช่วย (ASSISTANT_TEACHER)
${catalog.qaAssistantTeacher.map((i) => `- ${i.code}: ${i.nameTh}`).join('\n')}

## PA ครู (TEACHER)
${catalog.paTeacher.map((i) => `- ${i.aspectCode}.${i.code}: ${i.nameTh}`).join('\n')}

## PA ผู้บริหาร (PRINCIPAL)
${catalog.paPrincipal.map((i) => `- ${i.aspectCode}.${i.code}: ${i.nameTh}`).join('\n')}

ตอบเป็น JSON เท่านั้น ตามรูปแบบนี้:
{
  "summary": "สรุปเนื้อหาหลักฐาน 2-3 ประโยค",
  "keywords": ["คำสำคัญ1", "คำสำคัญ2"],
  "qaIndicatorsByLevel": {
    "EARLY_CHILDHOOD": [{"code": "1.1", "reason": "เหตุผลสั้นๆ"}],
    "BASIC": [{"code": "3.1", "reason": "เหตุผลสั้นๆ"}],
    "ASSISTANT_TEACHER": [{"code": "1.2", "reason": "เหตุผลสั้นๆ"}]
  },
  "paTeacherIndicators": [{"code": "T1.1.1", "reason": "เหตุผลสั้นๆ"}],
  "paPrincipalIndicators": [{"code": "P1.1.1", "reason": "เหตุผลสั้นๆ"}],
  "qualityScore": 3,
  "suggestions": ["ข้อเสนอแนะ"]
}

กฎ:
- qualityScore เป็นจำนวนเต็ม 1-5 (1=ต่ำ, 5=ดีมาก)
- ระบุเฉพาะตัวชี้วัดที่เกี่ยวข้องจริงในแต่ละมุมมอง ไม่ต้องครบทุกมุมมอง ถ้าไม่เกี่ยวข้องกับมุมมองนั้นให้ใช้ array ว่าง []
- qaIndicatorsByLevel: หลักฐาน 1 ชิ้นอาจเชื่อมโยงได้ทั้งปฐมวัย/ขั้นพื้นฐาน/ครูผู้ช่วย — ให้วิเคราะห์แล้วใส่ code ตามตารางด้านบนของแต่ละมุมมอง
- code ของ PA ครู ใช้รูปแบบ T{aspect}.{code} เช่น T1.1.1
- code ของ PA ผู้บริหาร ใช้รูปแบบ P{aspect}.{code} เช่น P1.1.1
- ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;
}

function parseJsonResponse(text: string): AnalysisResult {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const byLevel = parsed.qaIndicatorsByLevel;
    const qaByLevel: QAIndicatorsByLevel = {};
    if (byLevel && typeof byLevel === 'object') {
      if (Array.isArray(byLevel.EARLY_CHILDHOOD)) qaByLevel.EARLY_CHILDHOOD = byLevel.EARLY_CHILDHOOD;
      if (Array.isArray(byLevel.BASIC)) qaByLevel.BASIC = byLevel.BASIC;
      if (Array.isArray(byLevel.ASSISTANT_TEACHER)) qaByLevel.ASSISTANT_TEACHER = byLevel.ASSISTANT_TEACHER;
    }
    const qaIndicators = Array.isArray(parsed.qaIndicators)
      ? parsed.qaIndicators
      : (qaByLevel.BASIC ?? []);
    return {
      summary: parsed.summary ?? '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      qaIndicatorsByLevel: Object.keys(qaByLevel).length > 0 ? qaByLevel : undefined,
      qaIndicators,
      paTeacherIndicators: Array.isArray(parsed.paTeacherIndicators) ? parsed.paTeacherIndicators : [],
      paPrincipalIndicators: Array.isArray(parsed.paPrincipalIndicators) ? parsed.paPrincipalIndicators : [],
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 3,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return {
      summary: text.slice(0, 500),
      keywords: [],
      qaIndicatorsByLevel: undefined,
      qaIndicators: [],
      paTeacherIndicators: [],
      paPrincipalIndicators: [],
      qualityScore: 0,
      suggestions: ['ไม่สามารถแยกวิเคราะห์ผลลัพธ์ AI ได้ กรุณาลองใหม่'],
    };
  }
}

/**
 * วิเคราะห์หลักฐานจากไฟล์ (รูปภาพ / PDF) ด้วย Gemini
 */
export async function analyzeEvidenceFile(params: {
  filePath: string;
  mimeType: string;
  title: string;
  description?: string;
}): Promise<AnalysisResult> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const absolutePath = path.isAbsolute(params.filePath)
    ? params.filePath
    : path.join(process.cwd(), params.filePath);

  const parts: Part[] = [];

  if (fs.existsSync(absolutePath)) {
    assertFileAnalyzable(absolutePath, params.mimeType);
    parts.push(fileToBase64Part(absolutePath, params.mimeType));
  }

  const prompt = buildPrompt({ title: params.title, description: params.description });
  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  const text = result.response.text();

  return parseJsonResponse(text);
}

/**
 * วิเคราะห์หลักฐานจาก URL (วิดีโอ YouTube / Google Drive / ลิงก์ทั่วไป)
 */
export async function analyzeEvidenceUrl(params: {
  url: string;
  title: string;
  description?: string;
}): Promise<AnalysisResult> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt =
    buildPrompt({ title: params.title, description: params.description }) +
    `\n\nURL ของหลักฐาน: ${params.url}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseJsonResponse(text);
}

/**
 * วิเคราะห์หลักฐานจากข้อความ / metadata (ไม่มีไฟล์แนบ)
 */
export async function analyzeEvidenceText(params: {
  title: string;
  description?: string;
}): Promise<AnalysisResult> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = buildPrompt(params);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseJsonResponse(text);
}

// =============================================================================
// เขียนความเรียงสรุปผลงานรายตัวชี้วัด (สำหรับรายงาน PA / PowerPoint)
// =============================================================================

/**
 * ให้ AI รวบรวมข้อมูลหลักฐานที่ผูกกับตัวชี้วัดแล้วเขียนเป็นความเรียง (paragraph) ใหม่
 * ใช้รายตัวชี้วัด แล้วนำมาต่อกันทุกตัวชี้วัดสำหรับสร้าง PowerPoint
 */
export async function writeIndicatorNarrative(params: {
  indicatorCode: string;
  indicatorName: string;
  /** ข้อความจากหลักฐานที่ผูกกับตัวชี้วัดนี้ (ชื่อหลักฐาน, รายละเอียด, สรุปจาก AI) */
  evidenceTexts: string[];
}): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const evidenceBlock =
    params.evidenceTexts.length > 0
      ? params.evidenceTexts
          .map((t, i) => `[หลักฐานที่ ${i + 1}]\n${t.slice(0, 2000)}`)
          .join('\n\n')
      : '(ไม่มีรายละเอียดหลักฐาน)';

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินผลการพัฒนางานตามข้อตกลง (PA) ของข้าราชการครูและบุคลากรทางการศึกษา

ตัวชี้วัดที่ต้องเขียนความเรียง:
- รหัส: ${params.indicatorCode}
- ชื่อ: ${params.indicatorName}

ข้อมูลจากหลักฐานที่ผู้ใช้ผูกกับตัวชี้วัดนี้:
${evidenceBlock}

คำสั่ง: จากข้อมูลหลักฐานด้านบน ให้เขียนเป็น "ความเรียง" (paragraph) สรุปผลงาน/ร่องรอยการปฏิบัติงานที่สอดคล้องกับตัวชี้วัดนี้ ความยาวประมาณ 3–8 ประโยค ใช้ภาษาทางการ เหมาะสำหรับนำไปใส่ในรายงานหรือสไลด์นำเสนอ ไม่ต้องมีหัวข้อหรือ bullet

ตอบเฉพาะความเรียงเท่านั้น ไม่ต้องมีคำนำหรือคำลงท้าย`;

  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim() ?? '';
  return text.slice(0, 2000);
}
