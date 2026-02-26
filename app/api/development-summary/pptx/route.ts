/**
 * PRD 6: POST generate & download PPTX
 * POST /api/development-summary/pptx
 * Body: { schoolId, userId?, fiscalYear, assessmentRound? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { getDevelopmentSummaryData } from '@/lib/indicators/development-summary';
import {
  generateDevelopmentSummaryPptx,
  getPptxFilename,
} from '@/lib/indicators/pptx-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const schoolId = body.schoolId ? BigInt(body.schoolId) : null;
    const userId = body.userId ? BigInt(body.userId) : BigInt(session.user.id);
    const fiscalYear = body.fiscalYear ? parseInt(String(body.fiscalYear), 10) : null;
    const assessmentRound = body.assessmentRound ? parseInt(String(body.assessmentRound), 10) : 1;

    if (!schoolId || !fiscalYear) {
      return NextResponse.json(
        { error: 'ต้องระบุ schoolId และ fiscalYear' },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const data = await getDevelopmentSummaryData(
      schoolId,
      userId,
      fiscalYear,
      assessmentRound
    );
    if (!data) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูล Development Summary' },
        { status: 404 }
      );
    }

    const buffer = await generateDevelopmentSummaryPptx(data);
    const filename = getPptxFilename(data.teacherName, assessmentRound);

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
    console.error('[api/development-summary/pptx]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
