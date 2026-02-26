/**
 * POST /api/pa/pptx/director
 * สร้าง PowerPoint สำหรับผู้อำนวยการโรงเรียน นำเสนอภาคเรียนละ 1 ครั้ง (ตาม ref2)
 * Body: { userId?, schoolId?, fiscalYear?, assessmentRound?, useAI? }
 * - useAI: true = ให้ AI รวบรวมข้อมูลรายตัวชี้วัดแล้วเขียนความเรียง ต่อกันทุกตัวชี้วัด แล้วสร้าง PPTX
 * @see docs/PRINCIPAL_PPTX_DESIGN.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { thaiFiscalYear } from '@/lib/evidence';
import { prisma } from '@/lib/db';
import { getTeacherPASummary } from '@/lib/indicators/development-summary';
import { generateNarrativesForAgreement } from '@/lib/indicators/narrative-report';
import {
  generateDirectorSemesterReportPptx,
  getDirectorSemesterReportPptxFilename,
} from '@/lib/indicators/pptx-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = body.userId ? BigInt(body.userId) : BigInt(session.user.id);
    const schoolId = body.schoolId ? BigInt(body.schoolId) : null;
    const fiscalYear = body.fiscalYear ? parseInt(String(body.fiscalYear), 10) : thaiFiscalYear();
    const assessmentRound = body.assessmentRound ? parseInt(String(body.assessmentRound), 10) : 1;
    const useAI = body.useAI === true;

    const data = await getTeacherPASummary(userId, fiscalYear, 'PRINCIPAL');
    if (!data) {
      return NextResponse.json(
        { error: 'ไม่พบข้อตกลง PA ตำแหน่งผู้อำนวยการในปีงบประมาณนี้' },
        { status: 404 }
      );
    }

    const checkSchoolId = schoolId ?? BigInt(data.schoolId);
    const hasAccess = await canAccessSchool(BigInt(session.user.id), checkSchoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    let areaName: string | undefined;
    const school = await prisma.school.findUnique({
      where: { sc_id: checkSchoolId },
      select: { area_name: true, area: { select: { nameTh: true } } },
    });
    if (school?.area?.nameTh) areaName = school.area.nameTh;
    else if (school?.area_name) areaName = school.area_name;

    // รวบรวมข้อมูลรายตัวชี้วัด → AI เขียนความเรียงทีละตัวชี้วัด → นำมาต่อกันสำหรับ PPTX
    const indicatorNarratives = await generateNarrativesForAgreement(BigInt(data.agreementId), {
      useAI,
    });

    const buffer = await generateDirectorSemesterReportPptx(data, {
      assessmentRound,
      fiscalYear,
      areaName,
      indicatorNarratives,
    });

    const filename = getDirectorSemesterReportPptxFilename(
      data.userName,
      data.schoolName,
      assessmentRound,
      fiscalYear
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('[api/pa/pptx/director]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
