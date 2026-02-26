import type { Metadata } from 'next';
import { Kanit } from 'next/font/google';
import './globals.css';
import AppHeader from '@/components/app-header';
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
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any', type: 'image/png' },
    ],
    apple: [
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${kanit.variable} font-sans antialiased`} suppressHydrationWarning>
        <div className="min-h-screen bg-background" suppressHydrationWarning>
          <AppHeader session={session} />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}