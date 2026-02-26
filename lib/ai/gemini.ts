import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { getIndicatorCatalog } from './indicator-mapping';

const GEMINI_MODEL = 'gemini-2.0-flash';

export interface AnalysisResult {
  summary: string;
  keywords: string[];
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

วิเคราะห์หลักฐานเชิงประจักษ์ต่อไปนี้:
- ชื่อหลักฐาน: ${context.title}
${context.description ? `- รายละเอียด: ${context.description}` : ''}

ตัวชี้วัดที่มีในระบบ:

## QA ขั้นพื้นฐาน
${catalog.qaBasic.map((i) => `- ${i.code}: ${i.nameTh}`).join('\n')}

## PA ครู (TEACHER)
${catalog.paTeacher.map((i) => `- ${i.aspectCode}.${i.code}: ${i.nameTh}`).join('\n')}

## PA ผู้บริหาร (PRINCIPAL)
${catalog.paPrincipal.map((i) => `- ${i.aspectCode}.${i.code}: ${i.nameTh}`).join('\n')}

ตอบเป็น JSON เท่านั้น ตามรูปแบบนี้:
{
  "summary": "สรุปเนื้อหาหลักฐาน 2-3 ประโยค",
  "keywords": ["คำสำคัญ1", "คำสำคัญ2"],
  "qaIndicators": [{"code": "1.1", "reason": "เหตุผลสั้นๆ"}],
  "paTeacherIndicators": [{"code": "T1.1.1", "reason": "เหตุผลสั้นๆ"}],
  "paPrincipalIndicators": [{"code": "P1.1.1", "reason": "เหตุผลสั้นๆ"}],
  "qualityScore": 3,
  "suggestions": ["ข้อเสนอแนะ"]
}

กฎ:
- qualityScore เป็นจำนวนเต็ม 1-5 (1=ต่ำ, 5=ดีมาก)
- ระบุเฉพาะตัวชี้วัดที่เกี่ยวข้องจริง ไม่ต้องครบทุกตัว
- code ของ PA ครู ใช้รูปแบบ T{aspect}.{code} เช่น T1.1.1
- code ของ PA ผู้บริหาร ใช้รูปแบบ P{aspect}.{code} เช่น P1.1.1
- ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;
}

function parseJsonResponse(text: string): AnalysisResult {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary ?? '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      qaIndicators: Array.isArray(parsed.qaIndicators) ? parsed.qaIndicators : [],
      paTeacherIndicators: Array.isArray(parsed.paTeacherIndicators) ? parsed.paTeacherIndicators : [],
      paPrincipalIndicators: Array.isArray(parsed.paPrincipalIndicators) ? parsed.paPrincipalIndicators : [],
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 3,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return {
      summary: text.slice(0, 500),
      keywords: [],
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
