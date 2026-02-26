/**
 * PQA องค์ประกอบที่ ๓ (กระบวนการประเมิน) — QA ด้านความพร้อม
 * รวบรวมหลักฐานที่ผูกกับตัวชี้วัด QA (indicatorId / indicatorCodes) → คำนวณ score ต่อตัวชี้วัดและ domain → ประเมินเกณฑ์ผ่านตาม round
 * ใช้หลักฐานชุดเดียวกันกับที่อาจถูกผูกกับ PA ผ่าน PAEvidenceMapping (หลักฐานหนึ่งชิ้นรองรับได้ทั้ง QA และ PA)
 * @see docs/PQA_FRAMEWORK.md
 */

import { prisma } from '@/lib/db';
import {
  evaluatePassCriteria,
  type PassCriteriaResult,
} from './pass-criteria';

export type IndicatorCompleteness = {
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  standardCode: string;
  standardName: string;
  domain: string; // professional | social | personal (map จาก standard)
  score: number; // 0-100
  status: 'INSUFFICIENT' | 'SUFFICIENT' | 'GOOD';
  evidenceCount: number;
  evidenceIds: string[];
};

export type DomainCompleteness = {
  domain: string;
  score: number;
  passedCount: number;
  itemCount: number;
  indicators: IndicatorCompleteness[];
};

export type CompletenessResult = {
  userId: bigint;
  schoolId: bigint;
  fiscalYear: number;
  assessmentRound: number;
  indicators: IndicatorCompleteness[];
  domains: DomainCompleteness[];
  passCriteria: PassCriteriaResult;
  overallScore: number;
  overallPassed: boolean;
};

// Map standard code -> domain (ปรับตามโครงสร้างตัวชี้วัดจริง)
const STANDARD_TO_DOMAIN: Record<string, string> = {
  '1': 'professional',
  '2': 'professional',
  '3': 'social',
  '4': 'personal',
  '5': 'personal',
};

function getDomainForStandard(code: string): string {
  return STANDARD_TO_DOMAIN[code] ?? 'professional';
}

/**
 * รวบรวมหลักฐานที่เชื่อมกับตัวชี้วัด (indicatorId หรือ indicatorCodes มีรหัสนั้น)
 */
export async function gatherEvidenceByIndicator(
  schoolId: bigint,
  userId: bigint | null,
  fiscalYear: number
) {
  const evidence = await prisma.evidence.findMany({
    where: {
      schoolId,
      fiscalYear,
      del: false,
      ...(userId != null ? { ownerUserId: userId } : {}),
    },
    select: {
      id: true,
      indicatorId: true,
      indicatorCodes: true,
      status: true,
      indicator: {
        select: { id: true, code: true, nameTh: true, standardId: true, standard: { select: { code: true, nameTh: true } } },
      },
    },
  });

  const byIndicator = new Map<
    string,
    { evidenceIds: string[]; hasReady: boolean }
  >();

  for (const ev of evidence) {
    const key = `${ev.indicator.id}`;
    let cur = byIndicator.get(key);
    if (!cur) {
      cur = { evidenceIds: [], hasReady: false };
      byIndicator.set(key, cur);
    }
    cur.evidenceIds.push(ev.id.toString());
    if (ev.status === 'READY' || ev.status === 'APPROVED') cur.hasReady = true;
  }

  return { evidence, byIndicator };
}

/**
 * คำนวณ completeness และ pass criteria
 */
export async function computeCompleteness(
  schoolId: bigint,
  fiscalYear: number,
  assessmentRound: number,
  userId?: bigint
): Promise<CompletenessResult> {
  const uid = userId ?? null;
  const { byIndicator } = await gatherEvidenceByIndicator(
    schoolId,
    uid,
    fiscalYear
  );

  const indicators = await prisma.qAIndicator.findMany({
    include: { standard: { select: { code: true, nameTh: true } } },
    orderBy: [{ standardId: 'asc' }, { sortNo: 'asc' }],
  });

  const indicatorList: IndicatorCompleteness[] = [];
  const domainMap = new Map<string, IndicatorCompleteness[]>();

  for (const ind of indicators) {
    const key = `${ind.id}`;
    const cur = byIndicator.get(key);
    const evidenceCount = cur?.evidenceIds.length ?? 0;
    const hasReady = cur?.hasReady ?? false;
    const score = evidenceCount > 0 ? (hasReady ? 100 : 50) : 0;
    const status: 'INSUFFICIENT' | 'SUFFICIENT' | 'GOOD' =
      score >= 100 ? 'GOOD' : score >= 50 ? 'SUFFICIENT' : 'INSUFFICIENT';
    const domain = getDomainForStandard(ind.standard.code);

    const item: IndicatorCompleteness = {
      indicatorId: ind.id.toString(),
      indicatorCode: ind.code,
      indicatorName: ind.nameTh,
      standardCode: ind.standard.code,
      standardName: ind.standard.nameTh,
      domain,
      score,
      status,
      evidenceCount,
      evidenceIds: cur?.evidenceIds ?? [],
    };
    indicatorList.push(item);
    if (!domainMap.has(domain)) domainMap.set(domain, []);
    domainMap.get(domain)!.push(item);
  }

  const domains: DomainCompleteness[] = [];
  let professionalPassed = 0,
    socialPassed = 0,
    personalPassed = 0;

  for (const [domain, inds] of domainMap) {
    const itemCount = inds.length;
    const passedCount = inds.filter((i) => i.status === 'GOOD' || i.status === 'SUFFICIENT').length;
    const score = itemCount > 0 ? inds.reduce((a, i) => a + i.score, 0) / itemCount : 0;
    if (domain === 'professional') professionalPassed = passedCount;
    if (domain === 'social') socialPassed = passedCount;
    if (domain === 'personal') personalPassed = passedCount;
    domains.push({ domain, score, passedCount, itemCount, indicators: inds });
  }

  const passCriteria = evaluatePassCriteria(
    assessmentRound,
    professionalPassed,
    socialPassed,
    personalPassed
  );

  const overallScore =
    indicatorList.length > 0
      ? indicatorList.reduce((a, i) => a + i.score, 0) / indicatorList.length
      : 0;

  return {
    userId: uid ?? BigInt(0),
    schoolId,
    fiscalYear,
    assessmentRound,
    indicators: indicatorList,
    domains,
    passCriteria,
    overallScore: Math.round(overallScore * 100) / 100,
    overallPassed: passCriteria.overall,
  };
}
