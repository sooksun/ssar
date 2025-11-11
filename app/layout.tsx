import type { Metadata } from 'next';
import Image from 'next/image';
import { Kanit } from 'next/font/google';
import './globals.css';
import LogoutButton from '@/components/logout-button';
import { auth } from '@/lib/auth/nextauth';

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-kanit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QA Evidence Center (สมศ.)',
  description: 'ระบบจัดการหลักฐานการประกันคุณภาพภายนอก',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="th">
      <body className={`${kanit.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-background">
          <header className="border-b bg-white">
            <div className="mx-auto flex items-center justify-between px-6 py-4">
              <Image
                src="/logo_qa.png"
                alt="QA Evidence Center"
                width={657}
                height={120}
                priority
                className="h-25 w-[657px] max-w-full object-contain"
              />
              {session && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
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
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}