import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import jwt from 'jsonwebtoken';

/**
 * API endpoint สำหรับสร้าง JWT token สำหรับโปรแกรมเสริม
 * ใช้สำหรับ Single Login - โปรแกรมเสริมสามารถใช้ token นี้เพื่อเข้าถึงระบบได้โดยไม่ต้อง login ซ้ำ
 * 
 * GET /api/auth/token
 * 
 * Headers:
 * - Cookie: session cookie จาก NextAuth
 * 
 * Response:
 * {
 *   success: true,
 *   token: string, // JWT token
 *   expiresIn: number // เวลาหมดอายุในวินาที (24 ชั่วโมง)
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[api/auth/token] NEXTAUTH_SECRET is not set');
      return NextResponse.json(
        { success: false, error: 'การตั้งค่าระบบไม่ถูกต้อง' },
        { status: 500 }
      );
    }

    // สร้าง JWT token สำหรับโปรแกรมเสริม
    // Token นี้จะหมดอายุใน 24 ชั่วโมง
    const token = jwt.sign(
      {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        primarySchoolId: session.user.primarySchoolId,
        primarySchoolName: session.user.primarySchoolName,
        roles: session.user.roles || [],
        type: 'extra_program_token',
      },
      secret,
      {
        expiresIn: '24h',
      }
    );

    return NextResponse.json({
      success: true,
      token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[api/auth/token] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้าง token' },
      { status: 500 }
    );
  }
}

