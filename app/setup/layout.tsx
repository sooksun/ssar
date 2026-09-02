import { requireRoles } from '@/lib/auth/guards';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(['ADMIN', 'QA_LEAD']);
  return <>{children}</>;
}
