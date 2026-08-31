import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { checkRateLimit, clientKeyFrom } from '@/lib/rate-limit';

type RbacRule = {
  pattern: RegExp;
  allowedRoles: string[];
  methods?: string[];
};

// หมายเหตุ: '/uploads' และ '/api/serve-upload' **ไม่ใช่** public — เป็นไฟล์หลักฐานรายโรงเรียน
// การตรวจสิทธิ์ทำใน app/api/serve-upload/[...path]/route.ts (auth + canAccessUploadPath)
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/public',
  '/manifest.json',
  '/icon.png',
];

// ระดับโรงเรียน: TEACHER, SCHOOL_DIRECTOR, SCHOOL_ADMIN | ระดับเขต: AREA_HEAD_OFFICE, AREA_ADMIN (ดูได้หลายโรงเรียนในเขต)
const RBAC_RULES: RbacRule[] = [
  {
    pattern: /^\/work-collection(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN', 'AREA_HEAD_OFFICE', 'AREA_ADMIN'],
  },
  { pattern: /^\/admin(\/|$)/, allowedRoles: ['ADMIN'] },
  { pattern: /^\/api\/admin(\/|$)/, allowedRoles: ['ADMIN'] },
  { pattern: /^\/setup(\/|$)/, allowedRoles: ['ADMIN', 'QA_LEAD'] },
  { pattern: /^\/api\/setup(\/|$)/, allowedRoles: ['ADMIN', 'QA_LEAD'] },
  {
    pattern: /^\/evidence\/new(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'],
  },
  {
    pattern: /^\/evidence\/[^/]+\/edit(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'],
  },
  {
    pattern: /^\/evidence\/[^/]+\/files(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'],
  },
  {
    pattern: /^\/api\/evidence\/?$/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'TEACHER', 'SCHOOL_DIRECTOR', 'SCHOOL_ADMIN'],
    methods: ['POST'],
  },
  {
    pattern: /^\/api\/evidence\/[^/]+\/status(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'ASSESSOR'],
    methods: ['PATCH', 'POST'],
  },
  {
    pattern: /^\/evidence\/[^/]+\/reviews(\/|$)/,
    allowedRoles: ['ADMIN', 'QA_LEAD', 'ASSESSOR'],
  },
  { pattern: /^\/api\/reviews(\/|$)/, allowedRoles: ['ADMIN', 'QA_LEAD', 'ASSESSOR'] },
];

/**
 * เพดานจำนวนคำขอต่อ IP — ใช้กับเส้นทางที่ถูกยิงซ้ำได้/แพง
 * ลำดับสำคัญ: entry แรกที่ pattern ตรงจะถูกใช้
 */
const RATE_LIMITS: Array<{
  pattern: RegExp;
  limit: number;
  windowMs: number;
  bucket: string;
}> = [
  // brute-force login / การขอและตรวจ token ของโปรแกรมเสริม
  { pattern: /^\/api\/auth\/(callback|signin|token|verify)(\/|$)/, limit: 20, windowMs: 60_000, bucket: 'auth' },
  // งานแพง: เรียก AI และ generate PPTX
  { pattern: /^\/api\/evidence\/[^/]+\/analyze(\/|$)/, limit: 10, windowMs: 5 * 60_000, bucket: 'ai' },
  { pattern: /\/pptx(\/|$)/, limit: 10, windowMs: 5 * 60_000, bucket: 'pptx' },
];

function enforceRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const rule = RATE_LIMITS.find((r) => r.pattern.test(pathname));
  if (!rule) return null;

  const result = checkRateLimit(
    clientKeyFrom(request.headers, rule.bucket),
    rule.limit,
    rule.windowMs
  );
  if (result.allowed) return null;

  return NextResponse.json(
    { error: 'มีคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function respondUnauthorized(request: NextRequest, message: string) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.nextUrl.origin);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

function respondForbidden(request: NextRequest, message: string) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const redirectUrl = new URL('/dashboard', request.nextUrl.origin);
  redirectUrl.searchParams.set('error', 'forbidden');
  redirectUrl.searchParams.set('reason', message);
  return NextResponse.redirect(redirectUrl);
}

export default auth(async function middleware(request) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const session = request.auth;

  // จำกัดอัตราคำขอก่อนทุกอย่าง — รวมถึงเส้นทาง public เช่น /api/auth (จุดที่ถูก brute-force)
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  // Skip middleware สำหรับ POST requests ที่มี multipart/form-data (file uploads)
  // เพื่อหลีกเลี่ยงปัญหา "Unexpected end of form" เมื่อ body size ใหญ่
  const contentType = request.headers.get('content-type') || '';
  if (
    request.method === 'POST' &&
    contentType.includes('multipart/form-data') &&
    (pathname.includes('/files') || pathname.includes('/api/evidence'))
  ) {
    // ตรวจสอบ authentication เท่านั้น ไม่ต้องตรวจสอบ RBAC (จะตรวจสอบใน API route)
    if (!session?.user) {
      return respondUnauthorized(request, 'กรุณาเข้าสู่ระบบ');
    }
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (session?.user) {
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session?.user) {
    return respondUnauthorized(request, 'กรุณาเข้าสู่ระบบ');
  }

  const roleCodes = new Set<string>((session.user.roles || []).map((role) => role.role));
  const isAdmin = roleCodes.has('ADMIN');

  if (isAdmin) {
    return NextResponse.next();
  }

  for (const rule of RBAC_RULES) {
    if (!rule.pattern.test(pathname)) {
      continue;
    }

    if (rule.methods && !rule.methods.includes(request.method.toUpperCase())) {
      continue;
    }

    const hasRequiredRole = rule.allowedRoles.some((role) => roleCodes.has(role));
    if (!hasRequiredRole) {
      return respondForbidden(request, 'คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้');
    }
  }

  return NextResponse.next();
});

export const config = {
  // ยกเว้นเฉพาะ static asset ของ Next, และเส้นทางไฟล์ที่ "ตรวจสิทธิ์เองในโค้ด route" เท่านั้น:
  //  - uploads/ + api/serve-upload/ → ตรวจใน serve-upload route (auth + canAccessUploadPath)
  //  - api/evidence/<id>/files      → ต้องยกเว้นเพื่อไม่ให้ middleware อ่าน body ของ multipart ไปก่อน
  // เดิมยกเว้น "ทุก path ที่ลงท้ายด้วย .png/.pdf/.mp4/..." ซึ่งทำให้ route ใดก็ตามที่ลงท้ายนามสกุลเหล่านี้
  // ข้าม RBAC ทั้งหมด — ตัดทิ้งแล้ว
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|manifest\\.json|uploads/|api/serve-upload/|api/evidence/[^/]+/files).*)',
  ],
};


