/**
 * PRD 6: GET Development Summary Data
 * GET /api/development-summary?schoolId=&userId=&fiscalYear=&round=
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { getDevelopmentSummaryData, upsertDevelopmentSummary } from '@/lib/indicators/development-summary';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const userIdParam = searchParams.get('userId');
    const fiscalYearParam = searchParams.get('fiscalYear');
    const roundParam = searchParams.get('round');
    const saveParam = searchParams.get('save'); // ?save=1 เพื่อบันทึกลง DB

    if (!schoolIdParam || !fiscalYearParam) {
      return NextResponse.json(
        { error: 'ต้องระบุ schoolId และ fiscalYear' },
        { status: 400 }
      );
    }

    const schoolId = BigInt(schoolIdParam);
    const userId = userIdParam ? BigInt(userIdParam) : BigInt(session.user.id);
    const fiscalYear = parseInt(fiscalYearParam, 10);
    const assessmentRound = roundParam ? parseInt(roundParam, 10) : 1;

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const data = await getDevelopmentSummaryData(schoolId, userId, fiscalYear, assessmentRound);
    if (!data) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลครูหรือโรงเรียน' }, { status: 404 });
    }

    if (saveParam === '1' || saveParam === 'true') {
      await upsertDevelopmentSummary(schoolId, userId, fiscalYear, assessmentRound, data);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/development-summary]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
