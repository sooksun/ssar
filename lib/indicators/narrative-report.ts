/**
 * รวบรวมข้อมูลหลักฐานรายตัวชี้วัด แล้วให้ AI เขียนความเรียง (ความเรียง) ต่อตัวชี้วัด
 * นำความเรียงทั้งหมดมาต่อกันสำหรับสร้าง PowerPoint
 * @see docs/PRINCIPAL_PPTX_DESIGN.md
 */

import { prisma } from '@/lib/db';
import { writeIndicatorNarrative } from '@/lib/ai/gemini';

export type IndicatorNarrativeInput = {
  indicatorKey: string; // e.g. P1.1
  indicatorCode: string;
  indicatorName: string;
  evidenceTexts: string[];
};

/**
 * ดึงข้อความจากหลักฐานที่ผูกกับแต่ละรายการ PA (ตัวชี้วัด) ของข้อตกลง
 */
export async function getEvidenceContentByPAIndicator(
  agreementId: bigint
): Promise<IndicatorNarrativeInput[]> {
  const items = await prisma.pAAgreementItem.findMany({
    where: { agreementId },
    include: {
      indicator: { include: { aspect: true } },
      evidenceLinks: {
        include: {
          evidence: {
            select: {
              title: true,
              description: true,
              aiSummary: true,
            },
          },
        },
      },
    },
    orderBy: [
      { indicator: { aspect: { sortNo: 'asc' } } },
      { indicator: { sortNo: 'asc' } },
    ],
  });

  const result: IndicatorNarrativeInput[] = [];

  for (const item of items) {
    const aspectCode = item.indicator.aspect.code;
    const indCode = item.indicator.code;
    const indicatorKey = `${aspectCode}.${indCode}`;

    const evidenceTexts = item.evidenceLinks
      .map((link) => {
        const e = link.evidence;
        const parts: string[] = [];
        if (e.title) parts.push(`ชื่อหลักฐาน: ${e.title}`);
        if (e.description) parts.push(`รายละเอียด: ${e.description}`);
        if (e.aiSummary) parts.push(`สรุป (AI): ${e.aiSummary}`);
        return parts.join('\n');
      })
      .filter((t) => t.length > 0);

    result.push({
      indicatorKey,
      indicatorCode: indCode,
      indicatorName: item.indicator.nameTh,
      evidenceTexts: evidenceTexts.length > 0 ? evidenceTexts : ['(ยังไม่มีรายละเอียดหลักฐาน)'],
    });
  }

  return result;
}

/**
 * สำหรับแต่ละตัวชี้วัด: รวบรวมข้อมูลหลักฐาน → ให้ AI เขียนความเรียง → คืนค่า map indicatorKey → ความเรียง
 * ใช้เมื่อมี GEMINI_API_KEY; ถ้าไม่มีจะคืนความเรียง placeholder ตามข้อมูลที่มี
 */
export async function generateNarrativesForAgreement(
  agreementId: bigint,
  options: { useAI?: boolean } = {}
): Promise<Record<string, string>> {
  const inputs = await getEvidenceContentByPAIndicator(agreementId);
  const out: Record<string, string> = {};
  const useAI = options.useAI !== false && !!process.env.GEMINI_API_KEY;

  for (const input of inputs) {
    try {
      if (useAI) {
        const narrative = await writeIndicatorNarrative({
          indicatorCode: input.indicatorCode,
          indicatorName: input.indicatorName,
          evidenceTexts: input.evidenceTexts,
        });
        out[input.indicatorKey] = narrative;
      } else {
        out[input.indicatorKey] =
          input.evidenceTexts[0]?.slice(0, 500) ?? `ตัวชี้วัด ${input.indicatorName} — มีหลักฐาน ${input.evidenceTexts.length} รายการ`;
      }
    } catch (err) {
      console.error(`[narrative-report] indicator ${input.indicatorKey}:`, err);
      out[input.indicatorKey] = `สรุป: ตัวชี้วัด ${input.indicatorName} มีหลักฐานที่ผูกแล้ว ${input.evidenceTexts.length} รายการ`;
    }
  }

  return out;
}
