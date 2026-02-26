/**
 * PQA องค์ประกอบที่ ๔ (ผลลัพธ์และการพัฒนา): สรุปผลพัฒนาอย่างเข้ม
 * รวบรวมจากหลักฐานที่ผูกตัวชี้วัด QA + สรุป PA ครู/ผู้บริหาร — ใช้ผลเพื่อพัฒนา ไม่ใช่แค่รายงาน
 * @see docs/PQA_FRAMEWORK.md
 */

import { prisma } from '@/lib/db';
import { computeCompleteness, type CompletenessResult } from './completeness';
import type { PAPositionType } from '@/lib/pa-utils';

export type DevelopmentSummaryData = {
  teacherId: string;
  teacherName: string;
  schoolId: string;
  schoolName: string;
  assessmentRound: number;
  academicYear: number;
  fiscalYear: number;
  overallScore: number;
  overallStatus: string;
  overallPassed: boolean;
  totalEvidence: number;
  totalFiles: number;
  totalVideoLinks: number;
  totalAnalysisJobs: number;
  domains: Array<{
    domain: string;
    score: number;
    passedCount: number;
    itemCount: number;
    indicators: Array<{
      id: string;
      code: string;
      name: string;
      score: number;
      status: string;
      evidenceCount: number;
      evidenceIds: string[];
    }>;
  }>;
  aiInsights: {
    teachingStrengths?: string[];
    areasForImprovement?: string[];
    recommendations?: string[];
  };
  summaryNarrative?: string;
  indicatorNarratives: Record<string, string>;
  completeness: CompletenessResult;
};

export async function getDevelopmentSummaryData(
  schoolId: bigint,
  userId: bigint,
  fiscalYear: number,
  assessmentRound: number
): Promise<DevelopmentSummaryData | null> {
  const [user, school, completeness] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    }),
    prisma.school.findUnique({
      where: { sc_id: schoolId },
      select: { name: true },
    }),
    computeCompleteness(schoolId, fiscalYear, assessmentRound, userId),
  ]);

  if (!user || !school) return null;

  const evidenceList = await prisma.evidence.findMany({
    where: {
      schoolId,
      fiscalYear,
      ownerUserId: userId,
      del: false,
    },
    include: {
      files: { where: { del: false } },
    },
  });

  let totalFiles = 0;
  let totalVideoLinks = 0;
  for (const ev of evidenceList) {
    for (const f of ev.files) {
      totalFiles += 1;
      if (f.storageType === 'YOUTUBE' || f.storageType === 'GDRIVE') totalVideoLinks += 1;
    }
  }

  const academicYear = fiscalYear;

  const indicatorNarratives: Record<string, string> = {};
  for (const ind of completeness.indicators) {
    if (ind.evidenceCount > 0) {
      indicatorNarratives[ind.indicatorCode] = `มีหลักฐาน ${ind.evidenceCount} รายการที่เชื่อมกับตัวชี้วัด ${ind.indicatorName}`;
    }
  }

  const aiInsights: DevelopmentSummaryData['aiInsights'] = {};
  const summaries = evidenceList.filter((e) => e.aiSummary).map((e) => e.aiSummary as string);
  if (summaries.length > 0) {
    aiInsights.teachingStrengths = summaries.slice(0, 3);
  }
  const suggestions = evidenceList.filter((e) => e.aiSuggestions).map((e) => e.aiSuggestions as string);
  if (suggestions.length > 0) {
    aiInsights.recommendations = suggestions.slice(0, 3);
  }

  return {
    teacherId: userId.toString(),
    teacherName: user.fullName,
    schoolId: schoolId.toString(),
    schoolName: school.name,
    assessmentRound,
    academicYear,
    fiscalYear,
    overallScore: completeness.overallScore,
    overallStatus: completeness.overallPassed ? 'ผ่าน' : 'ไม่ผ่าน',
    overallPassed: completeness.overallPassed,
    totalEvidence: evidenceList.length,
    totalFiles,
    totalVideoLinks,
    totalAnalysisJobs: 0,
    domains: completeness.domains.map((d) => ({
      domain: d.domain,
      score: d.score,
      passedCount: d.passedCount,
      itemCount: d.itemCount,
      indicators: d.indicators.map((i) => ({
        id: i.indicatorId,
        code: i.indicatorCode,
        name: i.indicatorName,
        score: i.score,
        status: i.status,
        evidenceCount: i.evidenceCount,
        evidenceIds: i.evidenceIds,
      })),
    })),
    aiInsights,
    indicatorNarratives,
    completeness,
  };
}

export async function upsertDevelopmentSummary(
  schoolId: bigint,
  userId: bigint,
  fiscalYear: number,
  assessmentRound: number,
  data: DevelopmentSummaryData
) {
  const proDomain = data.completeness.domains.find((d) => d.domain === 'professional');
  const socialDomain = data.completeness.domains.find((d) => d.domain === 'social');
  const personalDomain = data.completeness.domains.find((d) => d.domain === 'personal');

  const payload = {
    overallScore: data.overallScore,
    overallPassed: data.overallPassed,
    totalEvidence: data.totalEvidence,
    totalFiles: data.totalFiles,
    totalVideoLinks: data.totalVideoLinks,
    professionalScore: proDomain?.score ?? null,
    professionalPassed: data.completeness.passCriteria.professional.actual,
    professionalTotal: proDomain?.itemCount ?? null,
    socialScore: socialDomain?.score ?? null,
    socialPassed: data.completeness.passCriteria.social?.actual ?? null,
    socialTotal: socialDomain?.itemCount ?? null,
    personalScore: personalDomain?.score ?? null,
    personalPassed: data.completeness.passCriteria.personal.actual,
    personalTotal: personalDomain?.itemCount ?? null,
    evidenceByIndicator: data.completeness.indicators.reduce(
      (acc, i) => ({ ...acc, [i.indicatorCode]: i.evidenceCount }),
      {} as Record<string, number>
    ),
    aiInsights: data.aiInsights as object,
    indicatorNarratives: data.indicatorNarratives as object,
    summaryNarrative: data.summaryNarrative,
    passCriteria: data.completeness.passCriteria as object,
  };

  return prisma.developmentSummary.upsert({
    where: {
      devsum_school_user_year_round: {
        schoolId,
        userId,
        fiscalYear,
        assessmentRound,
      },
    },
    update: payload,
    create: {
      schoolId,
      userId,
      fiscalYear,
      assessmentRound,
      ...payload,
    },
  });
}

// =============================================================================
// PA Summary per Teacher
// =============================================================================

export interface TeacherPASummaryData {
  userId: string;
  userName: string;
  schoolId: string;
  schoolName: string;
  fiscalYear: number;
  positionType: PAPositionType;
  agreementId: string;
  status: string;
  aspects: Array<{
    code: string;
    name: string;
    indicators: Array<{
      code: string;
      name: string;
      score: number | null;
      evidenceCount: number;
    }>;
    averageScore: number;
  }>;
  part1Score: number | null;
  part2Score: number | null;
  totalScore: number | null;
  isPassed: boolean | null;
  totalEvidenceLinked: number;
}

export async function getTeacherPASummary(
  userId: bigint,
  fiscalYear: number,
  positionType?: PAPositionType,
): Promise<TeacherPASummaryData | null> {
  const whereClause: Record<string, unknown> = { userId, fiscalYear };
  if (positionType) whereClause.positionType = positionType;

  const agreement = await prisma.pAAgreement.findFirst({
    where: whereClause,
    include: {
      school: { select: { name: true } },
      items: {
        include: {
          indicator: { include: { aspect: true } },
          evidenceLinks: true,
        },
        orderBy: [{ indicator: { aspect: { sortNo: 'asc' } } }, { indicator: { sortNo: 'asc' } }],
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!agreement) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  const aspectMap = new Map<
    string,
    {
      code: string;
      name: string;
      indicators: { code: string; name: string; score: number | null; evidenceCount: number }[];
    }
  >();

  let totalEvidenceLinked = 0;

  for (const item of agreement.items) {
    const aspect = item.indicator.aspect;
    if (!aspectMap.has(aspect.code)) {
      aspectMap.set(aspect.code, {
        code: aspect.code,
        name: aspect.nameTh,
        indicators: [],
      });
    }
    const evCount = item.evidenceLinks.length;
    totalEvidenceLinked += evCount;
    aspectMap.get(aspect.code)!.indicators.push({
      code: item.indicator.code,
      name: item.indicator.nameTh,
      score: item.score,
      evidenceCount: evCount,
    });
  }

  const aspects = Array.from(aspectMap.values()).map((a) => ({
    ...a,
    averageScore:
      a.indicators.filter((i) => i.score != null).length > 0
        ? a.indicators.filter((i) => i.score != null).reduce((s, i) => s + (i.score ?? 0), 0) /
          a.indicators.filter((i) => i.score != null).length
        : 0,
  }));

  return {
    userId: userId.toString(),
    userName: user?.fullName ?? '',
    schoolId: agreement.schoolId.toString(),
    schoolName: agreement.school.name,
    fiscalYear,
    positionType: agreement.positionType as PAPositionType,
    agreementId: agreement.id.toString(),
    status: agreement.status,
    aspects,
    part1Score: agreement.part1Score ? Number(agreement.part1Score) : null,
    part2Score: agreement.part2Score ? Number(agreement.part2Score) : null,
    totalScore: agreement.totalScore ? Number(agreement.totalScore) : null,
    isPassed: agreement.isPassed,
    totalEvidenceLinked,
  };
}

// =============================================================================
// PA Summary per School (for Principal)
// =============================================================================

export interface SchoolPASummaryData {
  schoolId: string;
  schoolName: string;
  fiscalYear: number;
  teacherCount: number;
  teacherWithPA: number;
  averageScore: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: string;
  aspectAverages: Record<string, number>;
  teachers: Array<{
    userId: string;
    userName: string;
    positionType: PAPositionType;
    totalScore: number | null;
    isPassed: boolean | null;
    status: string;
    evidenceCount: number;
  }>;
}

export async function getPrincipalPASummary(
  schoolId: bigint,
  fiscalYear: number,
): Promise<SchoolPASummaryData | null> {
  const school = await prisma.school.findUnique({
    where: { sc_id: schoolId },
    select: { name: true },
  });
  if (!school) return null;

  const agreements = await prisma.pAAgreement.findMany({
    where: { schoolId, fiscalYear },
    include: {
      items: {
        include: {
          indicator: { include: { aspect: true } },
          evidenceLinks: true,
        },
      },
    },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: agreements.map((a) => a.userId) } },
    select: { id: true, fullName: true },
  });
  const userMap = new Map(users.map((u) => [u.id.toString(), u.fullName]));

  const teacherCount = await prisma.userSchoolRole.count({
    where: { schoolId, role: { code: 'TEACHER' } },
  });

  const aspectTotals: Record<string, { sum: number; count: number }> = {};

  const teachers = agreements.map((ag) => {
    const evCount = ag.items.reduce((s, i) => s + i.evidenceLinks.length, 0);

    for (const item of ag.items) {
      if (item.score != null) {
        const code = item.indicator.aspect.code;
        if (!aspectTotals[code]) aspectTotals[code] = { sum: 0, count: 0 };
        aspectTotals[code].sum += item.score;
        aspectTotals[code].count += 1;
      }
    }

    return {
      userId: ag.userId.toString(),
      userName: userMap.get(ag.userId.toString()) ?? '',
      positionType: ag.positionType as PAPositionType,
      totalScore: ag.totalScore ? Number(ag.totalScore) : null,
      isPassed: ag.isPassed,
      status: ag.status,
      evidenceCount: evCount,
    };
  });

  const scored = agreements.filter((a) => a.totalScore != null);
  const passedCount = agreements.filter((a) => a.isPassed === true).length;
  const failedCount = agreements.filter((a) => a.isPassed === false).length;
  const pendingCount = agreements.length - passedCount - failedCount;

  const aspectAverages: Record<string, number> = {};
  for (const [code, data] of Object.entries(aspectTotals)) {
    aspectAverages[code] = data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0;
  }

  return {
    schoolId: schoolId.toString(),
    schoolName: school.name,
    fiscalYear,
    teacherCount,
    teacherWithPA: agreements.length,
    averageScore:
      scored.length > 0
        ? Number(
            (scored.reduce((s, a) => s + Number(a.totalScore), 0) / scored.length).toFixed(2),
          )
        : 0,
    passedCount,
    failedCount,
    pendingCount,
    passRate:
      agreements.length > 0 ? ((passedCount / agreements.length) * 100).toFixed(1) : '0',
    aspectAverages,
    teachers,
  };
}
