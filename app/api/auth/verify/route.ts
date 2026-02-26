import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  email: string;
  name: string;
  primarySchoolId?: string;
  primarySchoolName?: string;
  roles?: Array<{
    role: string;
    schoolId: string;
    schoolName: string;
  }>;
  type: string;
  iat?: number;
  exp?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token' },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'การตั้งค่าระบบไม่ถูกต้อง' },
        { status: 500 }
      );
    }

    try {
      // ตรวจสอบ token
      const decoded = jwt.verify(token, secret) as TokenPayload;

      // ตรวจสอบว่าเป็น token ของโปรแกรมเสริมหรือไม่
      if (decoded.type !== 'extra_program_token') {
        return NextResponse.json(
          { success: false, error: 'Token ไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      // ส่งคืนข้อมูลผู้ใช้
      return NextResponse.json({
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          primarySchoolId: decoded.primarySchoolId,
          primarySchoolName: decoded.primarySchoolName,
          roles: decoded.roles,
        },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { success: false, error: 'Token หมดอายุแล้ว' },
          { status: 401 }
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { success: false, error: 'Token ไม่ถูกต้อง' },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[api/auth/verify] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ token' },
      { status: 500 }
    );
  }
}

// GET method สำหรับตรวจสอบ token จาก query parameter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token' },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'การตั้งค่าระบบไม่ถูกต้อง' },
        { status: 500 }
      );
    }

    try {
      const decoded = jwt.verify(token, secret) as TokenPayload;

      if (decoded.type !== 'extra_program_token') {
        return NextResponse.json(
          { success: false, error: 'Token ไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          primarySchoolId: decoded.primarySchoolId,
          primarySchoolName: decoded.primarySchoolName,
          roles: decoded.roles,
        },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { success: false, error: 'Token หมดอายุแล้ว' },
          { status: 401 }
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { success: false, error: 'Token ไม่ถูกต้อง' },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[api/auth/verify] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ token' },
      { status: 500 }
    );
  }
}

