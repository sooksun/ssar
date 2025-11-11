import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-center">
        <h1 className="text-4xl font-bold mb-8">
          QA Evidence Center (สมศ.)
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          ระบบจัดการหลักฐานการประกันคุณภาพภายนอก
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

