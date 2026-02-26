import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { prisma } from '@/lib/db';

/**
 * GET /api/pa/indicators
 * ดึงรายการตัวชี้วัด PA ทั้งหมด (5 ด้าน 15 ตัวชี้วัด) พร้อมเกณฑ์คะแนน
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const aspects = await prisma.pAAspect.findMany({
      where: { part: 'PART1' },
      orderBy: { sortNo: 'asc' },
      include: {
        indicators: {
          orderBy: { sortNo: 'asc' },
          include: {
            scales: {
              orderBy: { score: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json(aspects);
  } catch (error) {
    console.error('[api/pa/indicators]', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดตัวชี้วัด' },
      { status: 500 }
    );
  }
}
