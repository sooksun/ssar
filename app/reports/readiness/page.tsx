import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear } from '@/lib/evidence';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';

export default async function ReadinessReportPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

  // ดึง school IDs ที่ user มีสิทธิ์
  const schoolIds = roles.map((role) => BigInt(role.schoolId));

  // ใช้ปีการศึกษาปัจจุบัน
  const currentAcademicYear = thaiAcademicYear();

  // ดึงมาตรฐานทั้งหมด (สำหรับทุก level)
  const standards = await prisma.qAStandard.findMany({
    include: {
      level: true,
      indicators: {
        include: {
          evidence: {
            where: {
              schoolId: {
                in: schoolIds,
              },
              fiscalYear: currentAcademicYear,
              del: false,
            },
          },
        },
      },
    },
    orderBy: [
      {
        levelId: 'asc',
      },
      {
        sortNo: 'asc',
      },
    ],
  });

  // คำนวณความพร้อมต่อมาตรฐาน
  const readinessData = standards.map((standard) => {
    const totalIndicators = standard.indicators.length;
    let readyCount = 0;
    let approvedCount = 0;

    standard.indicators.forEach((indicator) => {
      const evidence = indicator.evidence;
      if (evidence.length > 0) {
        const hasReady = evidence.some(
          (e) => e.status === 'READY' || e.status === 'APPROVED'
        );
        const hasApproved = evidence.some((e) => e.status === 'APPROVED');
        if (hasReady) readyCount++;
        if (hasApproved) approvedCount++;
      }
    });

    const percentage =
      totalIndicators > 0
        ? Math.round((approvedCount / totalIndicators) * 100)
        : 0;

    return {
      standardId: standard.id.toString(),
      standardCode: standard.code,
      standardName: standard.nameTh,
      levelCode: standard.level?.code ?? '',
      levelName: standard.level?.nameTh ?? '',
      totalIndicators,
      readyCount,
      approvedCount,
      percentage,
    };
  });

  // กำหนดแท็บที่เลือกจาก query param (รวมมุมมองการประเมินครูผู้ช่วย)
  const LEVEL_TABS = [
    { code: 'EARLY_CHILDHOOD', label: 'ปฐมวัย' },
    { code: 'BASIC', label: 'ขั้นพื้นฐาน' },
    { code: 'ASSISTANT_TEACHER', label: 'ครูผู้ช่วย' },
  ] as const;
  const { level } = await searchParams;
  const activeLevel =
    LEVEL_TABS.some((t) => t.code === level) ? level! : 'EARLY_CHILDHOOD';
  const activeLabel = LEVEL_TABS.find((t) => t.code === activeLevel)?.label ?? 'ปฐมวัย';

  const filtered = readinessData.filter((d) => d.levelCode === activeLevel);

  // คำนวณ overall readiness ของแท็บที่เลือก
  const overallReady = filtered.reduce(
    (sum, item) => sum + item.approvedCount,
    0
  );
  const overallTotal = filtered.reduce(
    (sum, item) => sum + item.totalIndicators,
    0
  );
  const overallPercentage =
    overallTotal > 0 ? Math.round((overallReady / overallTotal) * 100) : 0;

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">รายงานความพร้อม</h1>
        <p className="text-muted-foreground mt-1">
          ดูความพร้อมหลักฐานต่อมาตรฐาน
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2">
        {LEVEL_TABS.map((tab) => (
          <Link
            key={tab.code}
            href={`/reports/readiness?level=${tab.code}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeLevel === tab.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Overall KPI */}
      <div className={`mb-6 rounded-lg border p-6 ${
        activeLevel === 'BASIC' ? 'bg-purple-50 border-purple-200' : activeLevel === 'ASSISTANT_TEACHER' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              ความพร้อมรวม ({activeLabel})
            </h3>
            <p className="text-3xl font-bold mt-2">{overallPercentage}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {overallReady} จาก {overallTotal} ตัวชี้วัด
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">ปีการศึกษา</p>
            <p className="text-xl font-semibold">{currentAcademicYear}</p>
          </div>
        </div>
      </div>

      {/* Readiness Chart (Simple Bar) */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">
          ความพร้อมหลักฐานต่อมาตรฐาน
        </h2>
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.standardId}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">
                    {item.standardCode} - {item.standardName}
                  </span>
                </div>
                <span className="text-sm font-medium">{item.percentage}%</span>
              </div>
              <div className={`h-4 w-full overflow-hidden rounded-full ${
                activeLevel === 'BASIC' ? 'bg-purple-100' : activeLevel === 'ASSISTANT_TEACHER' ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <div
                  className={`h-full transition-all ${
                    item.percentage >= 76
                      ? activeLevel === 'BASIC' ? 'bg-purple-400' : activeLevel === 'ASSISTANT_TEACHER' ? 'bg-amber-400' : 'bg-blue-400'
                      : item.percentage >= 51
                        ? 'bg-yellow-300'
                        : 'bg-pink-300'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                <span>
                  อนุมัติแล้ว: {item.approvedCount}/{item.totalIndicators}
                </span>
                <span>พร้อมรีวิว: {item.readyCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table View */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">รายละเอียด</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">มาตรฐาน</th>
                <th className="p-4 text-center text-sm font-medium">
                  ตัวชี้วัดทั้งหมด
                </th>
                <th className="p-4 text-center text-sm font-medium">
                  พร้อมรีวิว
                </th>
                <th className="p-4 text-center text-sm font-medium">
                  อนุมัติแล้ว
                </th>
                <th className="p-4 text-center text-sm font-medium">
                  เปอร์เซ็นต์
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.standardId} className="border-b">
                  <td className="p-4">
                    <div className="font-medium">
                      {item.standardCode} - {item.standardName}
                    </div>
                  </td>
                  <td className="p-4 text-center">{item.totalIndicators}</td>
                  <td className="p-4 text-center">{item.readyCount}</td>
                  <td className="p-4 text-center">{item.approvedCount}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`font-medium ${
                        item.percentage >= 76
                          ? activeLevel === 'BASIC' ? 'text-purple-600' : activeLevel === 'ASSISTANT_TEACHER' ? 'text-amber-600' : 'text-blue-600'
                          : item.percentage >= 51
                            ? 'text-yellow-600'
                            : 'text-pink-500'
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" />
      </div>
    </div>
  );
}

