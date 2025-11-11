export type EvidenceStatusKey = 'MISSING' | 'PENDING' | 'READY' | 'APPROVED' | 'REJECTED';
export type ReviewStatusKey = 'NEED_MORE' | 'ACCEPTED' | 'REJECTED';

type EvidenceStatusInfo = {
  label: string;
  badgeClass: string;
  chartColor: string;
};

type ReviewStatusInfo = {
  label: string;
  badgeClass: string;
};

export const evidenceStatusMap: Record<EvidenceStatusKey, EvidenceStatusInfo> = {
  MISSING: {
    label: 'ยังไม่จัดทำ',
    badgeClass: 'bg-slate-100 text-slate-800',
    chartColor: '#cbd5e1',
  },
  PENDING: {
    label: 'กำลังจัดทำ',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    chartColor: '#fde68a',
  },
  READY: {
    label: 'พร้อมให้ตรวจ',
    badgeClass: 'bg-blue-100 text-blue-800',
    chartColor: '#7dd3fc',
  },
  APPROVED: {
    label: 'ผ่านการอนุมัติ',
    badgeClass: 'bg-purple-100 text-purple-800',
    chartColor: '#c084fc',
  },
  REJECTED: {
    label: 'ไม่ผ่านการอนุมัติ',
    badgeClass: 'bg-pink-100 text-pink-800',
    chartColor: '#f9a8d4',
  },
};

export const reviewStatusMap: Record<ReviewStatusKey, ReviewStatusInfo> = {
  NEED_MORE: {
    label: 'ต้องปรับปรุง',
    badgeClass: 'bg-yellow-100 text-yellow-800',
  },
  ACCEPTED: {
    label: 'ยอมรับหลักฐาน',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
  REJECTED: {
    label: 'ปฏิเสธหลักฐาน',
    badgeClass: 'bg-pink-100 text-pink-800',
  },
};

export function getEvidenceStatusLabel(status: string) {
  return evidenceStatusMap[status as EvidenceStatusKey]?.label ?? status;
}

export function getEvidenceStatusBadgeClass(status: string) {
  return evidenceStatusMap[status as EvidenceStatusKey]?.badgeClass ?? 'bg-slate-100 text-slate-800';
}

export function getEvidenceStatusColor(status: string) {
  return evidenceStatusMap[status as EvidenceStatusKey]?.chartColor ?? '#9ca3af';
}

export function getReviewStatusLabel(status: string) {
  return reviewStatusMap[status as ReviewStatusKey]?.label ?? status;
}

export function getReviewStatusBadgeClass(status: string) {
  return reviewStatusMap[status as ReviewStatusKey]?.badgeClass ?? 'bg-slate-100 text-slate-800';
}

