/**
 * PA (Performance Agreement) Utilities — PQA องค์ประกอบที่ ๒–๓
 * การเชื่อมหลักฐานกับ PA (PAEvidenceMapping) ทำให้หลักฐานหนึ่งชิ้นใช้ได้ทั้ง QA และ PA
 * กระบวนการประเมิน PA ใช้หลักฐานชุดเดียวกันกับที่ใช้ในความพร้อม QA
 * @see docs/PQA_FRAMEWORK.md
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from './db';

// =============================================================================
// Types
// =============================================================================

export type PAPositionType = 'TEACHER' | 'PRINCIPAL';

export interface PACalculationResult {
  part1Score: number;
  part2Score: number;
  totalScore: number;
  isPassed: boolean;
  positionType: PAPositionType;
  details: {
    aspectScores: Record<string, number>;
    c1Score: number;
    c21Score: number;
    c22Score: number;
  };
}

export interface EvidenceMappingOptions {
  evidenceId: bigint;
  agreementItemId?: bigint;
  challengeConsiderationId?: bigint;
  note?: string;
  relevanceLevel?: 1 | 2 | 3 | 4;
  createdBy?: bigint;
}

// =============================================================================
// Score Calculation
// =============================================================================

/**
 * แบ่งกลุ่มตัวชี้วัดตามด้าน (aspect)
 * - ผู้บริหาร (PRINCIPAL): P1(6) + P2(3) + P3(2) + P4(2) + P5(2) = 15
 * - ครู (TEACHER): T1(8) + T2(4) + T3(3) = 15
 */
const ASPECT_SPLIT: Record<PAPositionType, { code: string; count: number }[]> = {
  PRINCIPAL: [
    { code: 'P1', count: 6 },
    { code: 'P2', count: 3 },
    { code: 'P3', count: 2 },
    { code: 'P4', count: 2 },
    { code: 'P5', count: 2 },
  ],
  TEACHER: [
    { code: 'T1', count: 8 },
    { code: 'T2', count: 4 },
    { code: 'T3', count: 3 },
  ],
};

/**
 * คำนวณคะแนน PA จากคะแนนดิบ — รองรับทั้งครูและผู้บริหาร
 *
 * สูตรการคำนวณ (เหมือนกันทั้ง 2 ตำแหน่ง):
 * - ส่วนที่ 1: (คะแนนเฉลี่ย 15 ตัวชี้วัด / 4) * 60
 * - ส่วนที่ 2:
 *   - C1: คะแนน * 5 (สูงสุด 20)
 *   - C2.1: คะแนน * 2.5 (สูงสุด 10)
 *   - C2.2: คะแนน * 2.5 (สูงสุด 10)
 * - รวม 100 คะแนน — เกณฑ์ผ่าน >= 70
 */
export function calculatePAScore(params: {
  indicatorScores: number[];
  c1MethodScore: number;
  c21QuantScore: number;
  c22QualScore: number;
  positionType?: PAPositionType;
}): PACalculationResult {
  const { indicatorScores, c1MethodScore, c21QuantScore, c22QualScore } = params;
  const positionType = params.positionType ?? 'PRINCIPAL';

  if (indicatorScores.length !== 15) {
    throw new Error('ต้องระบุคะแนนครบ 15 ตัวชี้วัด');
  }

  const avgIndicatorScore = indicatorScores.reduce((a, b) => a + b, 0) / 15;
  const part1Score = (avgIndicatorScore / 4) * 60;

  const c1Score = Math.min(c1MethodScore * 5, 20);
  const c21Score = Math.min(c21QuantScore * 2.5, 10);
  const c22Score = Math.min(c22QualScore * 2.5, 10);
  const part2Score = c1Score + c21Score + c22Score;

  const totalScore = part1Score + part2Score;
  const isPassed = totalScore >= 70;

  const aspectScores: Record<string, number> = {};
  let offset = 0;
  for (const { code, count } of ASPECT_SPLIT[positionType]) {
    const slice = indicatorScores.slice(offset, offset + count);
    aspectScores[code] = Number((slice.reduce((a, b) => a + b, 0) / count).toFixed(2));
    offset += count;
  }

  return {
    part1Score: Number(part1Score.toFixed(2)),
    part2Score: Number(part2Score.toFixed(2)),
    totalScore: Number(totalScore.toFixed(2)),
    isPassed,
    positionType,
    details: {
      aspectScores,
      c1Score: Number(c1Score.toFixed(2)),
      c21Score: Number(c21Score.toFixed(2)),
      c22Score: Number(c22Score.toFixed(2)),
    },
  };
}

// =============================================================================
// Evidence Mapping
// =============================================================================

/**
 * เชื่อมหลักฐานเข้ากับตัวชี้วัด PA
 */
/**
 * PQA: เชื่อมหลักฐานกับรายการ PA (ข้อตกลงหรือประเด็นท้าทาย)
 * หลักฐานชิ้นเดียวกันอาจผูกกับหลายรายการ PA ได้
 */
export async function mapEvidenceToPA(options: EvidenceMappingOptions) {
  const { evidenceId, agreementItemId, challengeConsiderationId, note, relevanceLevel, createdBy } = options;

  // ตรวจสอบว่าต้องระบุอย่างน้อยหนึ่ง target
  if (!agreementItemId && !challengeConsiderationId) {
    throw new Error('ต้องระบุ agreementItemId หรือ challengeConsiderationId');
  }

  return await prisma.pAEvidenceMapping.create({
    data: {
      evidenceId,
      agreementItemId,
      challengeConsiderationId,
      note,
      relevanceLevel,
      createdBy
    }
  });
}

/**
 * ลบการเชื่อมหลักฐานออกจาก PA
 */
export async function unmapEvidenceFromPA(mappingId: bigint) {
  return await prisma.pAEvidenceMapping.delete({
    where: { id: mappingId }
  });
}

/**
 * ค้นหาหลักฐานที่เชื่อมกับ PA รายการใดรายการหนึ่ง
 */
export async function findEvidenceByPAItem(agreementItemId: bigint) {
  return await prisma.pAEvidenceMapping.findMany({
    where: { agreementItemId },
    include: {
      evidence: {
        include: {
          files: true,
          indicator: true
        }
      }
    }
  });
}

/**
 * ค้นหาหลักฐานที่ใช้ได้ทั้ง QA และ PA (Reusable Evidence)
 */
export async function findReusableEvidence(schoolId: bigint, fiscalYear: number) {
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
      files: true,
      indicator: true,
      paMappings: {
        include: {
          agreementItem: {
            include: {
              indicator: true
            }
          }
        }
      },
      selfAssessmentLinks: {
        include: {
          selfIndicator: {
            include: {
              indicator: true
            }
          }
        }
      }
    }
  });
}

// =============================================================================
// PA Agreement Management
// =============================================================================

/**
 * สร้างข้อตกลง PA ใหม่พร้อมรายการตัวชี้วัดทั้งหมด
 */
export async function createPAAgreement(data: {
  schoolId: bigint;
  userId: bigint;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
  positionType?: PAPositionType;
  createdBy?: bigint;
}) {
  const positionType = data.positionType ?? 'PRINCIPAL';

  return await prisma.$transaction(async (tx) => {
    const agreement = await tx.pAAgreement.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        fiscalYear: data.fiscalYear,
        startDate: data.startDate,
        endDate: data.endDate,
        positionType,
        status: 'DRAFT',
        createdBy: data.createdBy,
      },
    });

    // ดึงตัวชี้วัดเฉพาะตำแหน่ง (TEACHER → T1-T3, PRINCIPAL → P1-P5)
    const indicators = await tx.pAIndicator.findMany({
      where: { aspect: { positionType } },
      orderBy: [{ aspectId: 'asc' }, { sortNo: 'asc' }],
    });

    await tx.pAAgreementItem.createMany({
      data: indicators.map((ind) => ({
        agreementId: agreement.id,
        indicatorId: ind.id,
      })),
    });

    return agreement;
  });
}

/**
 * บันทึกคะแนนการประเมิน PA และอัพเดทสรุปผล
 */
export async function savePAEvaluation(
  agreementId: bigint,
  scores: {
    itemScores: { itemId: bigint; score: number; comment?: string }[];
    c1MethodScore: number;
    c21QuantScore: number;
    c22QualScore: number;
  },
  evaluatorId?: bigint
) {
  return await prisma.$transaction(async (tx) => {
    // 1. ดึงข้อมูลข้อตกลง
    const agreement = await tx.pAAgreement.findUnique({
      where: { id: agreementId },
      include: {
        items: {
          include: {
            indicator: {
              include: { aspect: true }
            }
          }
        },
        challenge: true
      }
    });

    if (!agreement) {
      throw new Error('ไม่พบข้อตกลง PA');
    }

    // 2. อัพเดทคะแนนรายตัวชี้วัด
    for (const itemScore of scores.itemScores) {
      await tx.pAAgreementItem.update({
        where: { id: itemScore.itemId },
        data: {
          score: itemScore.score,
          scoreValue: (itemScore.score / 4) * (60 / 15), // คะแนนส่วนที่ 1 แบ่งเท่าๆ กัน
          comment: itemScore.comment
        }
      });
    }

    // 3. อัพเดทหรือสร้างข้อพิจารณา
    let challenge = agreement.challenge;
    if (!challenge) {
      challenge = await tx.pAChallengeItem.create({
        data: {
          agreementId: agreement.id,
          title: 'ประเด็นท้าทาย',
          c1MethodScore: scores.c1MethodScore,
          c21QuantScore: scores.c21QuantScore,
          c22QualScore: scores.c22QualScore,
          part2Total: scores.c1MethodScore * 5 + scores.c21QuantScore * 2.5 + scores.c22QualScore * 2.5
        }
      });
    } else {
      challenge = await tx.pAChallengeItem.update({
        where: { id: challenge.id },
        data: {
          c1MethodScore: scores.c1MethodScore,
          c21QuantScore: scores.c21QuantScore,
          c22QualScore: scores.c22QualScore,
          part2Total: scores.c1MethodScore * 5 + scores.c21QuantScore * 2.5 + scores.c22QualScore * 2.5
        }
      });
    }

    // 4. คำนวณคะแนนรวม
    const allScores = scores.itemScores.map(s => s.score);
    const calculation = calculatePAScore({
      indicatorScores: allScores,
      c1MethodScore: scores.c1MethodScore,
      c21QuantScore: scores.c21QuantScore,
      c22QualScore: scores.c22QualScore
    });

    // 5. อัพเดทข้อตกลง
    await tx.pAAgreement.update({
      where: { id: agreementId },
      data: {
        totalScore: calculation.totalScore,
        part1Score: calculation.part1Score,
        part2Score: calculation.part2Score,
        isPassed: calculation.isPassed,
        status: 'EVALUATED',
        evaluatorId
      }
    });

    // 6. อัพเดทสรุปผล
    await updatePASummary(tx, agreementId);

    return calculation;
  });
}

/**
 * อัพเดทตารางสรุปผล PA
 */
async function updatePASummary(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, agreementId: bigint) {
  const agreement = await tx.pAAgreement.findUnique({
    where: { id: agreementId },
    include: {
      items: {
        include: {
          indicator: { include: { aspect: true } }
        }
      },
      challenge: true,
      _count: {
        select: {
          items: true
        }
      }
    }
  });

  if (!agreement) return;

  // นับจำนวนหลักฐาน
  const evidenceStats = await tx.pAEvidenceMapping.groupBy({
    by: ['evidenceId'],
    where: {
      OR: [
        { agreementItem: { agreementId } },
        { challengeConsideration: { challenge: { agreementId } } }
      ]
    }
  });

  // คำนวณคะแนนแยกด้าน
  type ItemWithAspect = (typeof agreement.items)[number];
  const p1Items = agreement.items.filter((i: ItemWithAspect) => i.indicator.aspect.code === 'P1');
  const p2Items = agreement.items.filter((i: ItemWithAspect) => i.indicator.aspect.code === 'P2');
  const p3Items = agreement.items.filter((i: ItemWithAspect) => i.indicator.aspect.code === 'P3');
  const p4Items = agreement.items.filter((i: ItemWithAspect) => i.indicator.aspect.code === 'P4');
  const p5Items = agreement.items.filter((i: ItemWithAspect) => i.indicator.aspect.code === 'P5');

  const avg = (items: ItemWithAspect[]) => items.length > 0
    ? items.reduce((a, b) => a + (b.score ?? 0), 0) / items.length
    : 0;

  // อัพเดทหรือสร้างสรุปผล
  await tx.pASummary.upsert({
    where: {
      userId_fiscalYear: {
        userId: agreement.userId,
        fiscalYear: agreement.fiscalYear
      }
    },
    update: {
      p1AcademicScore: avg(p1Items),
      p2ManagementScore: avg(p2Items),
      p3InnovationScore: avg(p3Items),
      p4NetworkScore: avg(p4Items),
      p5DevelopmentScore: avg(p5Items),
      part1Total: agreement.part1Score,
      c1MethodScore: agreement.challenge?.c1MethodScore ? agreement.challenge.c1MethodScore * 5 : null,
      c2QuantScore: agreement.challenge?.c21QuantScore ? agreement.challenge.c21QuantScore * 2.5 : null,
      c2QualScore: agreement.challenge?.c22QualScore ? agreement.challenge.c22QualScore * 2.5 : null,
      part2Total: agreement.part2Score,
      grandTotal: agreement.totalScore,
      isPassed: agreement.isPassed,
      totalEvidenceCount: evidenceStats.length,
      paLinkedCount: evidenceStats.length
    },
    create: {
      schoolId: agreement.schoolId,
      userId: agreement.userId,
      fiscalYear: agreement.fiscalYear,
      p1AcademicScore: avg(p1Items),
      p2ManagementScore: avg(p2Items),
      p3InnovationScore: avg(p3Items),
      p4NetworkScore: avg(p4Items),
      p5DevelopmentScore: avg(p5Items),
      part1Total: agreement.part1Score,
      c1MethodScore: agreement.challenge?.c1MethodScore ? agreement.challenge.c1MethodScore * 5 : null,
      c2QuantScore: agreement.challenge?.c21QuantScore ? agreement.challenge.c21QuantScore * 2.5 : null,
      c2QualScore: agreement.challenge?.c22QualScore ? agreement.challenge.c22QualScore * 2.5 : null,
      part2Total: agreement.part2Score,
      grandTotal: agreement.totalScore,
      isPassed: agreement.isPassed,
      totalEvidenceCount: evidenceStats.length,
      paLinkedCount: evidenceStats.length
    }
  });
}

// =============================================================================
// Reports
// =============================================================================

/**
 * รายงานสรุปผล PA รายโรงเรียน
 */
export async function getPASchoolSummary(schoolId: bigint, fiscalYear: number) {
  const summaries = await prisma.pASummary.groupBy({
    by: ['isPassed'],
    where: { schoolId, fiscalYear },
    _count: { id: true },
    _avg: { grandTotal: true }
  });

  const totalEvaluated = await prisma.pAAgreement.count({
    where: { schoolId, fiscalYear }
  });

  const passedCount = summaries.find(s => s.isPassed === true)?._count.id || 0;
  const failedCount = summaries.find(s => s.isPassed === false)?._count.id || 0;
  const pendingCount = totalEvaluated - passedCount - failedCount;

  return {
    total: totalEvaluated,
    passed: passedCount,
    failed: failedCount,
    pending: pendingCount,
    passRate: totalEvaluated > 0 ? (passedCount / totalEvaluated * 100).toFixed(2) : '0',
    averageScore: summaries.reduce((acc, s) => acc + (Number(s._avg.grandTotal) || 0) * s._count.id, 0) /
      (summaries.reduce((acc, s) => acc + s._count.id, 0) || 1)
  };
}

/**
 * รายงานการใช้หลักฐานร่วมกัน (Reusable Evidence Report)
 */
export async function getReusableEvidenceReport(schoolId: bigint, fiscalYear: number) {
  // หลักฐานที่เชื่อมกับทั้ง QA และ PA
  const dualMappedEvidence = await prisma.evidence.count({
    where: {
      schoolId,
      fiscalYear,
      AND: [
        { paMappings: { some: {} } },
        { selfAssessmentLinks: { some: {} } }
      ]
    }
  });

  // หลักฐานทั้งหมด
  const totalEvidence = await prisma.evidence.count({
    where: { schoolId, fiscalYear }
  });

  // หลักฐานที่เชื่อมกับ PA อย่างเดียว
  const paOnlyEvidence = await prisma.evidence.count({
    where: {
      schoolId,
      fiscalYear,
      paMappings: { some: {} },
      selfAssessmentLinks: { none: {} }
    }
  });

  // หลักฐานที่เชื่อมกับ QA อย่างเดียว
  const qaOnlyEvidence = await prisma.evidence.count({
    where: {
      schoolId,
      fiscalYear,
      paMappings: { none: {} },
      selfAssessmentLinks: { some: {} }
    }
  });

  return {
    total: totalEvidence,
    dualMapped: dualMappedEvidence,
    paOnly: paOnlyEvidence,
    qaOnly: qaOnlyEvidence,
    unmapped: totalEvidence - dualMappedEvidence - paOnlyEvidence - qaOnlyEvidence,
    reuseRate: totalEvidence > 0 ? ((dualMappedEvidence / totalEvidence) * 100).toFixed(2) : '0'
  };
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * ตรวจสอบความถูกต้องของคะแนน PA
 */
export function validatePAScore(score: number): boolean {
  return score >= 1 && score <= 4 && Number.isInteger(score);
}

/**
 * ตรวจสอบความถูกต้องของข้อมูลการประเมิน
 */
export function validatePAEvaluation(data: {
  indicatorScores: number[];
  c1MethodScore: number;
  c21QuantScore: number;
  c22QualScore: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.indicatorScores.length !== 15) {
    errors.push('ต้องระบุคะแนนครบ 15 ตัวชี้วัด');
  }

  data.indicatorScores.forEach((score, index) => {
    if (!validatePAScore(score)) {
      errors.push(`ตัวชี้วัดที่ ${index + 1}: คะแนนต้องอยู่ระหว่าง 1-4`);
    }
  });

  if (!validatePAScore(data.c1MethodScore)) {
    errors.push('C1: คะแนนต้องอยู่ระหว่าง 1-4');
  }

  if (!validatePAScore(data.c21QuantScore)) {
    errors.push('C2.1: คะแนนต้องอยู่ระหว่าง 1-4');
  }

  if (!validatePAScore(data.c22QualScore)) {
    errors.push('C2.2: คะแนนต้องอยู่ระหว่าง 1-4');
  }

  return { valid: errors.length === 0, errors };
}
