import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/validations/api';

const verifySchema = z.object({ token: z.string().min(1).max(8192) });

/** อัลกอริทึมที่ยอมรับ — pin ไว้ ไม่ปล่อยให้ header ของ token เป็นตัวเลือก */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

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
    const parsed = await parseJsonBody(request, verifySchema);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const { token } = parsed.data;

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'การตั้งค่าระบบไม่ถูกต้อง' },
        { status: 500 }
      );
    }

    try {
      // ตรวจสอบ token
      const decoded = jwt.verify(token, secret, {
        algorithms: ALLOWED_ALGORITHMS,
      }) as TokenPayload;

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

/**
 * GET ถูกปิดโดยตั้งใจ
 * เดิมรับ token ทาง query string (`?token=...`) ซึ่งทำให้ bearer token อายุ 24 ชม.
 * ไปโผล่ใน access log ของ reverse proxy, browser history และ Referer header
 * โปรแกรมเสริมต้องส่ง token ผ่าน POST body หรือ Authorization header แทน
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'ไม่รองรับการส่ง token ทาง query string — กรุณาใช้ POST พร้อม body { token } หรือ header Authorization: Bearer <token>',
    },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
