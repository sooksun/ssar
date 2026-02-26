import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/nextauth';

type RbacRule = {
  pattern: RegExp;
  allowedRoles: string[];
  methods?: string[];
};

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/public',
  '/uploads',
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
  // Exclude API routes สำหรับ file uploads จาก middleware เพื่อป้องกันปัญหา body consumed
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads|api/evidence/.*/files|.*\\.(?:png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|pdf)).*)',
  ],
};


