'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import type { Session } from 'next-auth';

/**
 * แสดง header เฉพาะเมื่อไม่ใช่หน้า login (ตัด header ออกจากหน้า login)
 */
export default function AppHeader({ session }: { session: Session | null }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/dashboard">
          <Image
            src="/logo_qa.png"
            alt="QA Evidence Center"
            width={657}
            height={120}
            priority
            unoptimized
            className="h-25 w-[657px] max-w-full object-contain"
          />
        </Link>
        {session?.user && (
          <div className="flex items-center gap-4 pr-[7px]">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {session.user?.primarySchoolName || ''}
              </p>
            </div>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
