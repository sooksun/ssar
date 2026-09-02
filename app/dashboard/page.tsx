import { auth } from '@/lib/auth/nextauth';
import { getUserSchools } from '@/lib/auth/scoping';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import BarReadinessByStandard, { ReadinessByStandardDatum } from '@/components/dashboard/BarReadinessByStandard';
import PieStatusDistribution, { StatusSlice } from '@/components/dashboard/PieStatusDistribution';
import { getEvidenceStatusLabel, getReviewStatusBadgeClass, getReviewStatusLabel } from '@/lib/status';
import BarEvaluationScoreByStandard, {
  EvaluationScoreByStandardDatum,
} from '@/components/dashboard/BarEvaluationScoreByStandard';
import AreaEvaluationMonthlyTrend, {
  EvaluationMonthlyTrendDatum,
} from '@/components/dashboard/AreaEvaluationMonthlyTrend';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const schoolIds = await getUserSchools(user.id);

  // คำนวณครั้งเดียว — ป้องกันคำขอที่ตกคร่อมเที่ยงคืน/สิ้นเดือนได้ query กับการจัดกลุ่มรายเดือนไม่ตรงกัน
  const now = new Date();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const evidenceWhere: Prisma.EvidenceWhereInput = {
    schoolId: { in: schoolIds },
    del: false,
  };

  // Metrics & datasets
  const [
    statusCounts,
    filesCount,
    reviewsCount,
    recentReviews,
    evidenceStatusByIndicator,
    evaluationTotals,
    recentEvaluations,
    evalByEvidence,
    indicatorStandards,
    evidenceIndicatorPairs,
    pendingEvidence,
    paAgreements,
  ] = await Promise.all([
    prisma.evidence.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { schoolId: { in: schoolIds }, del: false },
    }),
    prisma.evidenceFile.count({
      where: { del: false, evidence: evidenceWhere },
    }),
    prisma.evidenceReview.count({
      where: { evidence: evidenceWhere },
    }),
    prisma.evidenceReview.findMany({
      where: { evidence: evidenceWhere },
      include: {
        evidence: { select: { id: true, evidenceCode: true, title: true } },
        reviewer: { select: { fullName: true } },
      },
      orderBy: { reviewedAt: 'desc' },
      take: 10,
    }),
    // aggregate ที่ DB แทนการดึง Evidence ทุกแถวมานับใน JS
    // ผลลัพธ์มีขนาดเท่ากับ (จำนวนตัวชี้วัด x จำนวนสถานะ) ไม่ใช่จำนวนหลักฐาน
    prisma.evidence.groupBy({
      by: ['indicatorId', 'status'],
      _count: { _all: true },
      where: { schoolId: { in: schoolIds }, del: false },
    }),
    // aggregate ที่ DB แทนการดึง ExternalEvaluation ทุกแถวมานับใน JS
    // นับ/เฉลี่ยจากทุกแถวตลอดกาล (ไม่จำกัด 6 เดือน) — ต้องตรงกับ totalEvaluations/evaluationAverageScore เดิม
    prisma.externalEvaluation.aggregate({
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true },
      _avg: { score: true },
    }),
    // เฉพาะ 6 เดือนล่าสุด — ใช้กับกราฟแนวโน้มรายเดือนเท่านั้น
    prisma.externalEvaluation.findMany({
      where: { schoolId: { in: schoolIds }, evaluationDate: { gte: trendStart, lt: trendEnd } },
      select: { score: true, evaluationDate: true, evidenceId: true },
    }),
    // คะแนนต่อมาตรฐาน = ตลอดกาล (ไม่จำกัด 6 เดือน) — group ที่ DB ตาม evidenceId
    // ผลลัพธ์มีขนาดเท่าจำนวนหลักฐานที่มีผลประเมิน ไม่ใช่จำนวนผลประเมิน แล้วรวมขึ้นระดับมาตรฐานใน JS
    // ใช้ _sum + _count.score เพื่อได้ค่าเฉลี่ยจริงต่อมาตรฐาน (ไม่ใช่เฉลี่ยของเฉลี่ย)
    prisma.externalEvaluation.groupBy({
      by: ['evidenceId'],
      where: { schoolId: { in: schoolIds } },
      _count: { _all: true, score: true },
      _sum: { score: true },
    }),
    // แผนที่ indicatorId -> standard (master data ขนาดคงที่ ไม่โตตามจำนวนหลักฐาน)
    prisma.qAIndicator.findMany({
      select: { id: true, standard: { select: { code: true, nameTh: true } } },
    }),
    // ตารางเทียบ evidenceId -> indicatorId เฉพาะหลักฐานในขอบเขตที่มีผลประเมินภายนอก
    prisma.evidence.findMany({
      where: { schoolId: { in: schoolIds }, externalEvaluations: { some: {} } },
      select: { id: true, indicatorId: true },
    }),
    prisma.evidence.findMany({
      where: {
        schoolId: { in: schoolIds },
        del: false,
        status: { in: ['PENDING', 'MISSING'] },
      },
      include: {
        indicator: {
          select: {
            code: true,
            standard: { select: { code: true, nameTh: true } },
          },
        },
        school: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    // where ต้องมี schoolId เสมอ — เดิมใช้ `undefined` เมื่อ schoolIds ว่าง
    // ซึ่งทำให้ผู้ใช้ที่ยังไม่มีสิทธิ์โรงเรียนใดเลย ดึงข้อตกลง PA ของ "ทุกโรงเรียน" ออกมา
    prisma.pAAgreement.findMany({
      where: { schoolId: { in: schoolIds } },
      select: { positionType: true, status: true, isPassed: true, totalScore: true },
    }),
    ]);

  const totalEvidence = statusCounts.reduce((sum, s) => sum + (s._count?._all || 0), 0);
  const missingCount = statusCounts.find((s) => s.status === 'MISSING')?._count?._all ?? 0;
  const readyCount = statusCounts.find((s) => s.status === 'READY')?._count?._all ?? 0;
  const approvedCount = statusCounts.find((s) => s.status === 'APPROVED')?._count?._all ?? 0;
  const pendingCount = statusCounts.find((s) => s.status === 'PENDING')?._count?._all ?? 0;
  const rejectedCount = statusCounts.find((s) => s.status === 'REJECTED')?._count?._all ?? 0;

  // Charts data — รวมผลจากแถวที่ groupBy คืนมา (ไม่ใช่จากหลักฐานรายชิ้น)
  const standardByIndicator = new Map(
    indicatorStandards.map((ind) => [
      ind.id.toString(),
      { code: ind.standard?.code ?? 'N/A', nameTh: ind.standard?.nameTh ?? 'ไม่ระบุ' },
    ]),
  );

  const byStandardMap = new Map<string, { ready: number; total: number }>();
  for (const row of evidenceStatusByIndicator) {
    const code = standardByIndicator.get(row.indicatorId.toString())?.code ?? 'N/A';
    const count = row._count?._all ?? 0;
    const cur = byStandardMap.get(code) || { ready: 0, total: 0 };
    cur.total += count;
    if (row.status === 'READY') cur.ready += count;
    byStandardMap.set(code, cur);
  }
  const readinessData: ReadinessByStandardDatum[] = Array.from(byStandardMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([standardCode, v]) => ({ standardCode, ready: v.ready, total: v.total }));

  const statusPie: StatusSlice[] = [
    { status: 'APPROVED', label: getEvidenceStatusLabel('APPROVED'), value: approvedCount },
    { status: 'READY', label: getEvidenceStatusLabel('READY'), value: readyCount },
    { status: 'PENDING', label: getEvidenceStatusLabel('PENDING'), value: pendingCount },
    { status: 'REJECTED', label: getEvidenceStatusLabel('REJECTED'), value: rejectedCount },
    { status: 'MISSING', label: getEvidenceStatusLabel('MISSING'), value: missingCount },
  ];

  const totalEvaluations = evaluationTotals._count._all;
  const evaluationAverageScore =
    evaluationTotals._avg.score !== null ? Number(evaluationTotals._avg.score) : null;

  const evaluationByStandardMap = new Map<
    string,
    { standardName: string; total: number; scored: number; sumScore: number }
  >();
  const indicatorByEvidence = new Map(
    evidenceIndicatorPairs.map((e) => [e.id.toString(), e.indicatorId.toString()]),
  );
  // คะแนนต่อมาตรฐานคิดจากผลประเมินตลอดกาล (ทุกช่วงเวลา) — รวมจากกลุ่มที่ group ตาม evidenceId
  for (const grp of evalByEvidence) {
    const indicatorId = indicatorByEvidence.get(grp.evidenceId.toString());
    const standard = indicatorId ? standardByIndicator.get(indicatorId) : undefined;
    const standardCode = standard?.code || 'ไม่ทราบ';
    const standardName = standard?.nameTh || 'ไม่ระบุ';
    const current = evaluationByStandardMap.get(standardCode) || {
      standardName,
      total: 0,
      scored: 0,
      sumScore: 0,
    };
    current.total += grp._count._all;
    current.scored += grp._count.score;
    current.sumScore += grp._sum.score !== null ? Number(grp._sum.score) : 0;
    evaluationByStandardMap.set(standardCode, current);
  }

  const evaluationScoreByStandardData: EvaluationScoreByStandardDatum[] = Array.from(
    evaluationByStandardMap.entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([standardCode, value]) => ({
      standardCode,
      standardName: value.standardName,
      evaluationCount: value.total,
      averageScore: value.scored > 0 ? Number((value.sumScore / value.scored).toFixed(2)) : 0,
    }));

  const monthKeys: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    monthKeys.push({ key, label });
  }
  const monthMap = new Map<
    string,
    { label: string; evaluations: number; sumScore: number; scored: number }
  >(monthKeys.map((item) => [item.key, { label: item.label, evaluations: 0, sumScore: 0, scored: 0 }]));

  for (const ev of recentEvaluations) {
    const date = new Date(ev.evaluationDate);
    if (date < trendStart) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthMap.get(key);
    if (!bucket) continue;
    bucket.evaluations += 1;
    if (ev.score !== null && ev.score !== undefined) {
      bucket.sumScore += Number(ev.score);
      bucket.scored += 1;
    }
  }

  const evaluationMonthlyTrendData: EvaluationMonthlyTrendDatum[] = monthKeys.map(({ key, label }) => {
    const bucket = monthMap.get(key)!;
    return {
      monthLabel: label,
      evaluationCount: bucket.evaluations,
      averageScore: bucket.scored > 0 ? Number((bucket.sumScore / bucket.scored).toFixed(2)) : 0,
    };
  });

  // PA Summary stats
  const paTeacherCount = paAgreements.filter((a) => a.positionType === 'TEACHER').length;
  const paPrincipalCount = paAgreements.filter((a) => a.positionType === 'PRINCIPAL').length;
  const paPassedCount = paAgreements.filter((a) => a.isPassed === true).length;
  const paPendingCount = paAgreements.filter((a) => a.isPassed === null).length;
  const paTotal = paAgreements.length;

  const quickLinkCards = [
    {
      title: 'เก็บงาน',
      description: 'เพิ่มหลักฐาน + AI เชื่อมโยงตัวชี้วัด QA/PA อัตโนมัติ',
      href: '/work-collection',
      gradient: 'from-emerald-50 via-white to-white',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      iconSrc: '/evidance_icon.png',
      iconAlt: 'ไอคอนเก็บงาน',
    },
    {
      title: 'หลักฐาน',
      description: 'จัดการหลักฐานการประกันคุณภาพ',
      href: '/evidence',
      gradient: 'from-violet-50 via-white to-white',
      border: 'border-violet-200',
      text: 'text-violet-700',
      iconSrc: '/evidance_icon.png',
      iconAlt: 'ไอคอนจัดการหลักฐาน',
    },
    {
      title: 'รายงานความพร้อม',
      description: 'ดูความพร้อมหลักฐานต่อมาตรฐาน',
      href: '/reports/readiness',
      gradient: 'from-sky-50 via-white to-white',
      border: 'border-sky-200',
      text: 'text-sky-700',
      iconSrc: '/percent_complete_icon.png',
      iconAlt: 'ไอคอนรายงานความพร้อม',
    },
    {
      title: 'รายการ Missing',
      description: 'ดูรายการหลักฐานที่ยังขาด',
      href: '/reports/missing',
      gradient: 'from-rose-50 via-white to-white',
      border: 'border-rose-200',
      text: 'text-rose-700',
      iconSrc: '/loss_doc_icon.png',
      iconAlt: 'ไอคอนรายการหลักฐานที่ยังขาด',
    },
    {
      title: 'โปรแกรมเสริม',
      description: 'ระบบเพิ่มเติมสำหรับศูนย์กลางหลักฐาน',
      href: '/extra-programs',
      gradient: 'from-indigo-50 via-white to-white',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      iconSrc: '/extra_program.png',
      iconAlt: 'ไอคอนโปรแกรมเสริม',
    },
    {
      title: 'การประเมิน PA',
      description: 'การประเมินผลการพัฒนางานตามข้อตกลง (PA)',
      href: '/pa',
      gradient: 'from-teal-50 via-white to-white',
      border: 'border-teal-200',
      text: 'text-teal-700',
      iconSrc: '/icon_plan.png',
      iconAlt: 'ไอคอน PA',
    },
  ];

  const kpiCards = [
    {
      label: 'หลักฐานทั้งหมด',
      value: totalEvidence,
      gradient: 'from-fuchsia-50 via-white to-white',
      border: 'border-fuchsia-200',
      text: 'text-fuchsia-700',
    },
    {
      label: getEvidenceStatusLabel('READY'),
      value: readyCount,
      gradient: 'from-emerald-50 via-white to-white',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
    },
    {
      label: 'ไฟล์ทั้งหมด',
      value: filesCount,
      gradient: 'from-amber-50 via-white to-white',
      border: 'border-amber-200',
      text: 'text-amber-700',
    },
    {
      label: 'รีวิวทั้งหมด',
      value: reviewsCount,
      gradient: 'from-indigo-50 via-white to-white',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
    },
    {
      label: 'การประเมินภายใน',
      value: totalEvaluations,
      note:
        evaluationAverageScore !== null
          ? `ค่าเฉลี่ย ${evaluationAverageScore.toFixed(2)} / 5`
          : 'ยังไม่มีข้อมูล',
      gradient: 'from-purple-50 via-white to-white',
      border: 'border-purple-200',
      text: 'text-purple-700',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">ภาพรวมระบบศูนย์กลางหลักฐาน</p>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">เมนูหลัก</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinkCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`relative block rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md bg-gradient-to-br ${card.gradient} ${card.border}`}
            >
              <div className="relative z-10">
                <h3 className={`font-semibold ${card.text}`}>{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
              </div>
              <Image
                src={card.iconSrc}
                alt={card.iconAlt}
                width={126}
                height={126}
                unoptimized
                className="pointer-events-none select-none absolute -top-8 -right-4 h-28 w-28 opacity-95 drop-shadow-md"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-6 shadow-sm bg-gradient-to-br ${card.gradient} ${card.border}`}
          >
            <p className={`text-sm font-medium ${card.text}`}>{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
            {card.note && <p className="text-xs text-muted-foreground">{card.note}</p>}
          </div>
        ))}
      </div>

      {/* PA Summary */}
      {paTotal > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">สรุป PA (ข้อตกลงพัฒนางาน)</h2>
            <a href="/pa" className="text-sm text-primary hover:underline">ดูทั้งหมด</a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">ข้อตกลงทั้งหมด</p>
              <p className="text-2xl font-bold mt-1">{paTotal}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">PA ครู</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{paTeacherCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">PA ผู้บริหาร</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">{paPrincipalCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">ผ่านการประเมิน</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{paPassedCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">รอประเมิน</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{paPendingCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">ความพร้อมตามมาตรฐาน</h2>
          </div>
          <BarReadinessByStandard data={readinessData} />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">สัดส่วนสถานะหลักฐาน</h2>
          </div>
          <PieStatusDistribution data={statusPie} />
        </div>
      </div>

      {/* Internal Evaluation Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">ค่าเฉลี่ยคะแนนการประเมินภายในต่อมาตรฐาน</h2>
          </div>
          {evaluationScoreByStandardData.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีข้อมูลการประเมินภายใน</p>
          ) : (
            <BarEvaluationScoreByStandard data={evaluationScoreByStandardData} />
          )}
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">แนวโน้มการประเมิน (6 เดือนล่าสุด)</h2>
          </div>
          {evaluationMonthlyTrendData.every((item) => item.evaluationCount === 0) ? (
            <p className="text-muted-foreground">ยังไม่มีการประเมินในช่วง 6 เดือนล่าสุด</p>
          ) : (
            <AreaEvaluationMonthlyTrend data={evaluationMonthlyTrendData} />
          )}
        </div>
      </div>

      {/* Recent reviews */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">รีวิวล่าสุด</h2>
        {recentReviews.length === 0 ? (
          <p className="text-muted-foreground">ยังไม่มีรีวิว</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">หลักฐาน</th>
                  <th className="py-2 pr-4">ผู้รีวิว</th>
                  <th className="py-2 pr-4">สถานะรีวิว</th>
                  <th className="py-2 pr-4">คะแนน</th>
                  <th className="py-2">วันที่</th>
                </tr>
              </thead>
              <tbody>
              {recentReviews.map((r) => (
                <tr key={r.id.toString()} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <a href={`/evidence/${r.evidence.id}`} className="hover:underline">
                        {r.evidence.evidenceCode}
                      </a>
                      <div className="text-muted-foreground">{r.evidence.title}</div>
                    </td>
                    <td className="py-2 pr-4">{r.reviewer.fullName}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getReviewStatusBadgeClass(r.reviewStatus)}`}>
                        {getReviewStatusLabel(r.reviewStatus)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{r.score != null ? r.score.toString() : '-'}</td>
                    <td className="py-2">{new Date(r.reviewedAt).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending items */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">หลักฐานที่ยังต้องติดตาม</h2>
        {pendingEvidence.length === 0 ? (
          <p className="text-muted-foreground">ไม่มีหลักฐานสถานะ PENDING หรือ MISSING ในขณะนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">หลักฐาน</th>
                  <th className="py-2 pr-4">โรงเรียน</th>
                  <th className="py-2 pr-4">ตัวชี้วัด</th>
                  <th className="py-2 pr-4">สถานะ</th>
                  <th className="py-2">อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {pendingEvidence.map((item) => (
                  <tr key={item.id.toString()} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <a href={`/evidence/${item.id}`} className="font-medium hover:underline">
                        {item.evidenceCode ?? item.title}
                      </a>
                      <div className="text-muted-foreground text-xs">{item.title}</div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{item.school.name}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {item.indicator?.standard?.code}-{item.indicator?.code}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        {getEvidenceStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

