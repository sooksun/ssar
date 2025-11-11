import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { thaiFiscalYear } from '@/lib/evidence';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';

export default async function MissingReportPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const roles = user.roles ?? [];

  // ดึง school IDs ที่ user มีสิทธิ์
  const schoolIds = roles.map((role) => BigInt(role.schoolId));

  // ใช้ปีงบประมาณปัจจุบัน
  const currentFiscalYear = thaiFiscalYear();

  // ดึงตัวชี้วัดทั้งหมด
  const indicators = await prisma.qAIndicator.findMany({
    include: {
      standard: {
        include: {
          level: true,
        },
      },
      evidence: {
        where: {
          schoolId: {
            in: schoolIds,
          },
          fiscalYear: currentFiscalYear,
          del: false,
        },
      },
    },
    orderBy: [
      {
        standard: {
          levelId: 'asc',
        },
      },
      {
        standard: {
          sortNo: 'asc',
        },
      },
      {
        sortNo: 'asc',
      },
    ],
  });

  // กรองเฉพาะตัวชี้วัดที่ยังไม่มีหลักฐาน หรือมีแต่ status = MISSING
  const missingIndicators = indicators.filter((indicator) => {
    if (indicator.evidence.length === 0) {
      return true; // ยังไม่มีหลักฐานเลย
    }
    // มีหลักฐานแต่ทุกตัวเป็น MISSING
    return indicator.evidence.every((e) => e.status === 'MISSING');
  });

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">รายการ Missing</h1>
        <p className="text-muted-foreground mt-1">
          ดูรายการหลักฐานที่ยังขาด
        </p>
      </div>

      {/* Summary Card */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              ตัวชี้วัดที่ยังขาดหลักฐาน
            </h3>
            <p className="text-3xl font-bold mt-2">
              {missingIndicators.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              จากทั้งหมด {indicators.length} ตัวชี้วัด
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">ปีงบประมาณ</p>
            <p className="text-xl font-semibold">{currentFiscalYear}</p>
          </div>
        </div>
      </div>

      {/* Missing Indicators List */}
      {missingIndicators.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            ไม่มีตัวชี้วัดที่ยังขาดหลักฐาน
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            ทุกตัวชี้วัดมีหลักฐานแล้ว
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">รายการตัวชี้วัดที่ยังขาด</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">
                    รหัสตัวชี้วัด
                  </th>
                  <th className="p-4 text-left text-sm font-medium">
                    ชื่อตัวชี้วัด
                  </th>
                  <th className="p-4 text-left text-sm font-medium">
                    มาตรฐาน
                  </th>
                  <th className="p-4 text-left text-sm font-medium">ระดับ</th>
                  <th className="p-4 text-center text-sm font-medium">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {missingIndicators.map((indicator) => (
                  <tr key={indicator.id.toString()} className="border-b">
                    <td className="p-4">
                      <span className="font-medium">{indicator.code}</span>
                    </td>
                    <td className="p-4">{indicator.nameTh}</td>
                    <td className="p-4">
                      <div>
                        <span className="font-medium">
                          {indicator.standard.code} -{' '}
                          {indicator.standard.nameTh}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {indicator.standard.level.nameTh}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/evidence/new?indicatorId=${indicator.id}`}
                        className="inline-flex w-full justify-end gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 md:w-auto"
                      >
                        เพิ่มหลักฐาน
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <BackLink href="/dashboard" label="ย้อนกลับแดชบอร์ด" />
      </div>
    </div>
  );
}

