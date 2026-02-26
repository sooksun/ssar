/**
 * PRD 6: GET คำนวณ completeness และ pass criteria
 * GET /api/completeness?schoolId=&fiscalYear=&round=&userId=
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { canAccessSchool } from '@/lib/auth/scoping';
import { computeCompleteness } from '@/lib/indicators/completeness';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get('schoolId');
    const fiscalYearParam = searchParams.get('fiscalYear');
    const roundParam = searchParams.get('round');
    const userIdParam = searchParams.get('userId');

    if (!schoolIdParam || !fiscalYearParam) {
      return NextResponse.json(
        { error: 'ต้องระบุ schoolId และ fiscalYear' },
        { status: 400 }
      );
    }

    const schoolId = BigInt(schoolIdParam);
    const fiscalYear = parseInt(fiscalYearParam, 10);
    const assessmentRound = roundParam ? parseInt(roundParam, 10) : 1;
    const userId = userIdParam ? BigInt(userIdParam) : BigInt(session.user.id);

    const hasAccess = await canAccessSchool(BigInt(session.user.id), schoolId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโรงเรียนนี้' }, { status: 403 });
    }

    const result = await computeCompleteness(schoolId, fiscalYear, assessmentRound, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/completeness]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
