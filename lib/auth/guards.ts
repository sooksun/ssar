import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/nextauth';

/**
 * ด่านสิทธิ์สำหรับหน้า RSC — ป้องกันชั้นที่สองนอกเหนือจาก middleware
 * (middleware มีประวัติช่องโหว่ bypass จึงห้ามพึ่งชั้นเดียว)
 * ไม่ผ่าน = redirect ทันที ฟังก์ชันนี้จึงไม่มีทางคืนค่าแบบ "ไม่ได้สิทธิ์"
 */
export async function requireRoles(allowed: string[]) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const roleCodes = new Set((session.user.roles ?? []).map((role) => role.role));
  const permitted = allowed.some((code) => roleCodes.has(code));

  if (!permitted) {
    redirect('/dashboard?error=forbidden&reason=' + encodeURIComponent('คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้'));
  }

  return session;
}
