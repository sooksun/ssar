'use client';

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void signOut({ callbackUrl: '/login' });
    });
  }

  return (
    <Button
      variant="outline"
      className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      onClick={handleLogout}
      disabled={isPending}
    >
      <LogOut className="h-4 w-4" />
      {isPending ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
    </Button>
  );
}


