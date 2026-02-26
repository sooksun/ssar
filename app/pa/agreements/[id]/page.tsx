import { auth } from '@/lib/auth/nextauth';
import { redirect, notFound } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { canAccessSchool } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import Link from 'next/link';

const PA_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งแล้ว',
  IN_REVIEW: 'อยู่ระหว่างประเมิน',
  EVALUATED: 'ประเมินแล้ว',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ไม่อนุมัติ',
};

export default async function PAAgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const agreementId = BigInt(id);

  const agreement = await prisma.pAAgreement.findUnique({
    where: { id: agreementId },
    include: {
      school: { select: { sc_id: true, name: true } },
      items: {
        orderBy: [{ indicator: { aspectId: 'asc' } }, { indicator: { sortNo: 'asc' } }],
        include: {
          indicator: {
            include: {
              aspect: { select: { code: true, nameTh: true } },
              scales: { orderBy: { score: 'asc' } },
            },
          },
          evidenceLinks: {
            include: {
              evidence: {
                select: {
                  id: true,
                  title: true,
                  evidenceCode: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      challenge: {
        include: {
          considerations: {
            include: { consideration: { select: { code: true, nameTh: true, maxScore: true } } },
          },
        },
      },
    },
  });

  if (!agreement) notFound();

  const hasAccess = await canAccessSchool(BigInt(session.user.id), agreement.schoolId);
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">ไม่มีสิทธิ์เข้าถึงข้อตกลงนี้</p>
        <BackLink href="/pa" label="ย้อนกลับรายการ PA" className="mt-4" />
      </div>
    );
  }

  const byAspect = new Map<string, typeof agreement.items>();
  for (const item of agreement.items) {
    const code = item.indicator.aspect?.code ?? 'X0';
    if (!byAspect.has(code)) byAspect.set(code, []);
    byAspect.get(code)!.push(item);
  }
  const isTeacher = agreement.positionType === 'TEACHER';
  const aspectOrder = isTeacher ? ['T1', 'T2', 'T3'] : ['P1', 'P2', 'P3', 'P4', 'P5'];
  const positionLabel = isTeacher ? 'ครู' : 'ผู้บริหารสถานศึกษา';

  return (
    <div className="container mx-auto p-6 space-y-8">
      <BackLink href="/pa" label="ย้อนกลับรายการ PA" className="mb-4" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ข้อตกลง PA {positionLabel} ปีงบประมาณ {agreement.fiscalYear}</h1>
          <p className="text-muted-foreground mt-1">{agreement.school.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              agreement.status === 'EVALUATED' || agreement.status === 'APPROVED'
                ? 'bg-green-100 text-green-800'
                : agreement.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {PA_STATUS_LABEL[agreement.status] ?? agreement.status}
          </span>
          {agreement.totalScore != null && (
            <span className="font-semibold">
              คะแนนรวม {Number(agreement.totalScore).toFixed(1)} / 100
            </span>
          )}
          {agreement.isPassed !== null && (
            <span className={agreement.isPassed ? 'text-green-600' : 'text-red-600'}>
              {agreement.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
            </span>
          )}
        </div>
      </div>

      {/* ส่วนที่ 1: ตัวชี้วัด 15 รายการ */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">
          ส่วนที่ 1: ข้อตกลงตามมาตรฐานตำแหน่ง (60 คะแนน)
        </h2>
        <div className="space-y-6">
          {aspectOrder.map((code) => {
            const items = byAspect.get(code);
            if (!items?.length) return null;
            const aspectName = items[0]?.indicator.aspect?.nameTh ?? code;
            return (
              <div key={code} className="space-y-2">
                <h3 className="font-medium text-muted-foreground">{aspectName}</h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id.toString()}
                      className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                    >
                      <span className="font-mono text-sm">{item.indicator.code}</span>
                      <span className="flex-1 min-w-0">{item.indicator.nameTh}</span>
                      {item.score != null && (
                        <span className="rounded bg-muted px-2 py-0.5 text-sm">
                          ระดับ {item.score}
                        </span>
                      )}
                      {item.evidenceLinks.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          หลักฐาน {item.evidenceLinks.length} ชิ้น
                        </span>
                      )}
                      {item.evidenceLinks.length > 0 && (
                        <div className="w-full mt-2 flex flex-wrap gap-2">
                          {item.evidenceLinks.map((link) => (
                            <Link
                              key={link.id.toString()}
                              href={`/evidence/${link.evidence.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {link.evidence.evidenceCode ?? link.evidence.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ส่วนที่ 2: ประเด็นท้าทาย */}
      {agreement.challenge && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            ส่วนที่ 2: ข้อตกลงประเด็นท้าทาย (40 คะแนน)
          </h2>
          <p className="font-medium mb-2">{agreement.challenge.title}</p>
          {agreement.challenge.description && (
            <p className="text-sm text-muted-foreground mb-4">{agreement.challenge.description}</p>
          )}
          <div className="space-y-2">
            {agreement.challenge.c1MethodScore != null && (
              <p className="text-sm">
                C1 วิธีดำเนินการ: ระดับ {agreement.challenge.c1MethodScore}
              </p>
            )}
            {agreement.challenge.c21QuantScore != null && (
              <p className="text-sm">
                C2.1 เชิงปริมาณ: ระดับ {agreement.challenge.c21QuantScore}
              </p>
            )}
            {agreement.challenge.c22QualScore != null && (
              <p className="text-sm">
                C2.2 เชิงคุณภาพ: ระดับ {agreement.challenge.c22QualScore}
              </p>
            )}
            {agreement.challenge.part2Total != null && (
              <p className="font-medium mt-2">
                คะแนนส่วนที่ 2: {Number(agreement.challenge.part2Total).toFixed(1)}
              </p>
            )}
          </div>
        </div>
      )}

      {!agreement.challenge && agreement.status === 'DRAFT' && (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
          ยังไม่ได้กรอกส่วนที่ 2 (ประเด็นท้าทาย)
        </div>
      )}
    </div>
  );
}
