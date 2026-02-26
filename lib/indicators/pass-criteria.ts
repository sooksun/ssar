/**
 * PQA องค์ประกอบที่ ๓ (กระบวนการประเมิน) — เกณฑ์ผ่าน QA ตามรอบ
 * รอบ 1–2: วิชาชีพ ≥ 9, บุคคล ≥ 7 | รอบ 3–4: วิชาชีพ ≥ 11, สังคม ≥ 3, บุคคล ≥ 11
 * @see docs/PQA_FRAMEWORK.md
 */

export type DomainKey = 'professional' | 'social' | 'personal';

export interface PassCriteriaConfig {
  round: number;
  professional: { required: number; label: string };
  social: { required: number; label: string } | null;
  personal: { required: number; label: string };
}

export const PASS_CRITERIA_BY_ROUND: Record<number, PassCriteriaConfig> = {
  1: {
    round: 1,
    professional: { required: 9, label: 'ด้านวิชาชีพ' },
    social: null,
    personal: { required: 7, label: 'ด้านบุคคล' },
  },
  2: {
    round: 2,
    professional: { required: 9, label: 'ด้านวิชาชีพ' },
    social: null,
    personal: { required: 7, label: 'ด้านบุคคล' },
  },
  3: {
    round: 3,
    professional: { required: 11, label: 'ด้านวิชาชีพ' },
    social: { required: 3, label: 'ด้านสังคม' },
    personal: { required: 11, label: 'ด้านบุคคล' },
  },
  4: {
    round: 4,
    professional: { required: 11, label: 'ด้านวิชาชีพ' },
    social: { required: 3, label: 'ด้านสังคม' },
    personal: { required: 11, label: 'ด้านบุคคล' },
  },
};

export interface PassCriteriaResult {
  professional: { required: number; actual: number; passed: boolean };
  social: { required: number; actual: number; passed: boolean } | null;
  personal: { required: number; actual: number; passed: boolean };
  overall: boolean;
}

export function getPassCriteriaForRound(round: number): PassCriteriaConfig | null {
  return PASS_CRITERIA_BY_ROUND[round] ?? null;
}

export function evaluatePassCriteria(
  round: number,
  professionalPassed: number,
  socialPassed: number,
  personalPassed: number
): PassCriteriaResult {
  const config = getPassCriteriaForRound(round);
  if (!config) {
    return {
      professional: { required: 0, actual: professionalPassed, passed: false },
      social: null,
      personal: { required: 0, actual: personalPassed, passed: false },
      overall: false,
    };
  }

  const professional = {
    required: config.professional.required,
    actual: professionalPassed,
    passed: professionalPassed >= config.professional.required,
  };
  const personal = {
    required: config.personal.required,
    actual: personalPassed,
    passed: personalPassed >= config.personal.required,
  };
  let social: { required: number; actual: number; passed: boolean } | null = null;
  if (config.social) {
    social = {
      required: config.social.required,
      actual: socialPassed,
      passed: socialPassed >= config.social.required,
    };
  }

  const overall =
    professional.passed &&
    personal.passed &&
    (social === null || social.passed);

  return { professional, social, personal, overall };
}
