import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiAcademicYear } from '@/lib/evidence';

type SearchParams = {
  schoolId?: string;
  fiscalYear?: string;
};

function formatScore(score: unknown) {
  if (score === null || score === undefined) return '-';
  const numeric = Number(score);
  if (Number.isNaN(numeric)) return '-';
  return numeric.toFixed(2).replace(/\.00$/, '');
}

export default async function EvaluationHubPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const roles = session.user.roles ?? [];

  const accessibleSchoolIds = Array.from(new Set(roles.map((role) => role.schoolId)));
  if (accessibleSchoolIds.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">ระบบการประเมิน</h1>
        <p className="mt-4 text-sm text-muted-foreground">บัญชีนี้ยังไม่มีสิทธิ์เข้าถึงโรงเรียนใด</p>
      </div>
    );
  }

  const schools = await prisma.school.findMany({
    where: {
      sc_id: { in: accessibleSchoolIds.map((id) => BigInt(id)) },
      del: false,
    },
    select: {
      sc_id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  const academicYearNow = thaiAcademicYear();
  const selectedAcademicYear =
    params?.fiscalYear && !Number.isNaN(Number(params.fiscalYear))
      ? Number(params.fiscalYear)
      : academicYearNow;

  const selectedSchoolId =
    params?.schoolId && accessibleSchoolIds.includes(params.schoolId)
      ? params.schoolId
      : 'ALL';

  const targetSchools =
    selectedSchoolId === 'ALL'
      ? accessibleSchoolIds.map((id) => BigInt(id))
      : [BigInt(selectedSchoolId)];

  const [selfEvaluations, externalEvaluations] = await Promise.all([
    prisma.evaluation.findMany({
      where: {
        schoolId: { in: targetSchools },
        fiscalYear: selectedAcademicYear,
      },
      include: {
        school: { select: { sc_id: true, name: true } },
        standard: { select: { code: true, nameTh: true } },
        indicator: { select: { code: true, nameTh: true } },
      },
      orderBy: [{ evalType: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.externalEvaluation.findMany({
      where: {
        schoolId: { in: targetSchools },
          evidence: {
            fiscalYear: selectedAcademicYear,
            del: false,
          },
      },
      include: {
        evidence: {
          select: {
            id: true,
            evidenceCode: true,
            title: true,
            fiscalYear: true,
            indicator: {
              select: {
                code: true,
                nameTh: true,
                standard: {
                  select: {
                    code: true,
                    nameTh: true,
                  },
                },
              },
            },
          },
        },
        school: {
          select: {
            sc_id: true,
            name: true,
          },
        },
      },
      orderBy: { evaluationDate: 'desc' },
    }),
  ]);

  const selfRows = selfEvaluations.filter((ev) => ev.evalType === 'SELF');
  const internalExternalRows = selfEvaluations.filter((ev) => ev.evalType === 'EXTERNAL');

  const selfScored = selfRows.filter((ev) => ev.score !== null && ev.score !== undefined);
  const selfAverage =
    selfScored.length > 0
      ? selfScored.reduce((sum, ev) => sum + Number(ev.score), 0) / selfScored.length
      : null;

  const externalCombinedCount = externalEvaluations.length + internalExternalRows.length;
  const externalScoredTotal = [
    ...externalEvaluations.filter((ev) => ev.score !== null && ev.score !== undefined),
    ...internalExternalRows.filter((ev) => ev.score !== null && ev.score !== undefined),
  ];
  const externalAverage =
    externalScoredTotal.length > 0
      ? externalScoredTotal.reduce((sum, ev) => sum + Number(ev.score), 0) / externalScoredTotal.length
      : null;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ศูนย์รวมการประเมิน</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ภาพรวมการประเมินตนเองและการประเมินภายนอกในปีการศึกษา {selectedAcademicYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">การประเมินตนเอง</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{selfRows.length}</p>
            <p className="text-xs text-slate-500">
              ค่าเฉลี่ย {selfAverage !== null ? selfAverage.toFixed(2) : '-'} / 5
            </p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">การประเมินภายนอก</p>
            <p className="mt-1 text-2xl font-semibold text-indigo-900">{externalCombinedCount}</p>
            <p className="text-xs text-indigo-600">
              ค่าเฉลี่ย {externalAverage !== null ? externalAverage.toFixed(2) : '-'} / 5
            </p>
          </div>
        </div>
      </div>

      <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="eval-school">
            โรงเรียน
          </label>
          <select
            id="eval-school"
            name="schoolId"
            defaultValue={selectedSchoolId}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">ทั้งหมด</option>
            {schools.map((school) => (
              <option key={school.sc_id.toString()} value={school.sc_id.toString()}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="eval-fiscal-year">
            ปีการศึกษา
          </label>
          <input
            id="eval-fiscal-year"
            name="fiscalYear"
            type="number"
            min={2500}
            max={3000}
            defaultValue={selectedAcademicYear}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="md:col-span-2 lg:col-span-2 flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            แสดงข้อมูล
          </button>
          <a
            href="/evaluation"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ล้างตัวกรอง
          </a>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">การประเมินตนเอง (Self Evaluation)</h2>
          <span className="text-sm text-slate-500">
            ทั้งหมด {selfRows.length} รายการ · คะแนนเฉลี่ย{' '}
            {selfAverage !== null ? selfAverage.toFixed(2) : '-'}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">มาตรฐาน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ตัวชี้วัด</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">คะแนน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">หมายเหตุ</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">โรงเรียน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">บันทึกเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selfRows.map((row) => (
                <tr key={row.id.toString()}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">
                      {row.standard.code} - {row.standard.nameTh}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.indicator ? (
                      <div>
                        <div className="font-medium text-slate-800">
                          {row.indicator.code} - {row.indicator.nameTh}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {formatScore(row.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.comment ?? '-'}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.school.name}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {row.createdAt.toLocaleDateString('th-TH')}
                  </td>
                </tr>
              ))}
              {selfRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    ยังไม่มีข้อมูลการประเมินตนเองในช่วงที่เลือก
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">การประเมินภายนอก</h2>
          <span className="text-sm text-slate-500">
            ทั้งหมด {externalCombinedCount} รายการ · คะแนนเฉลี่ย{' '}
            {externalAverage !== null ? externalAverage.toFixed(2) : '-'}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">หลักฐาน/ตัวชี้วัด</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ผู้ประเมิน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">คะแนน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">ข้อเสนอแนะ</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">โรงเรียน</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">วันที่ประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {externalEvaluations.map((row) => (
                <tr key={row.id.toString()}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">
                      {row.evidence.indicator.standard.code}-{row.evidence.indicator.code}{' '}
                      {row.evidence.indicator.nameTh}
                    </div>
                    <div className="text-xs text-slate-500">
                      หลักฐาน: {row.evidence.evidenceCode ?? row.evidence.title}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div>{row.evaluatorName}</div>
                    {row.evaluatorOrg ? <div className="text-slate-500">{row.evaluatorOrg}</div> : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {formatScore(row.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {row.recommendations || row.strengths || row.weaknesses ? (
                      <div className="space-y-1">
                        {row.strengths ? (
                          <div>
                            <span className="font-medium text-emerald-600">จุดเด่น:</span>{' '}
                            <span>{row.strengths}</span>
                          </div>
                        ) : null}
                        {row.weaknesses ? (
                          <div>
                            <span className="font-medium text-amber-600">ข้อควรพัฒนา:</span>{' '}
                            <span>{row.weaknesses}</span>
                          </div>
                        ) : null}
                        {row.recommendations ? (
                          <div>
                            <span className="font-medium text-indigo-600">ข้อเสนอแนะ:</span>{' '}
                            <span>{row.recommendations}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.school.name}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {row.evaluationDate.toLocaleDateString('th-TH')}
                  </td>
                </tr>
              ))}
              {internalExternalRows.map((row) => (
                <tr key={`internal-${row.id.toString()}`}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">
                      {row.standard.code}-{row.indicator?.code ?? '-'} {row.indicator?.nameTh ?? ''}
                    </div>
                    <div className="text-xs text-slate-500">
                      (บันทึกไว้ในระบบการประเมินภายใน ประเภท EXTERNAL)
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">-</td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {formatScore(row.score)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.comment ?? '-'}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">{row.school.name}</td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {row.createdAt.toLocaleDateString('th-TH')}
                  </td>
                </tr>
              ))}
              {externalCombinedCount === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    ยังไม่มีข้อมูลการประเมินภายนอกในช่วงที่เลือก
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


