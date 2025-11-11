import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import EditEvidenceForm from './ui-edit-form';
import { BackLink } from '@/components/ui/back-link';
import { canAccessSchool } from '@/lib/auth/scoping';

export default async function EditEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  const roles = session.user.roles ?? [];
  const allowedRoles = new Set(['ADMIN', 'QA_LEAD', 'TEACHER']);
  const hasRole = roles.some((role) => allowedRoles.has(role.role));
  if (!hasRole) {
    redirect('/evidence');
  }

  const { id } = await params;
  const evId = BigInt(id);

  const evidence = await prisma.evidence.findUnique({
    where: { id: evId },
    include: {
      indicator: {
        include: { standard: { include: { level: true } } },
      },
      school: true,
    },
  });

  if (!evidence) {
    redirect('/evidence');
  }

  const hasAccess = await canAccessSchool(BigInt(session.user.id), evidence.school.sc_id);
  if (!hasAccess) {
    redirect('/evidence');
  }

  return (
    <div className="container mx-auto p-6">
      <BackLink href="/evidence" label="ย้อนกลับรายการ" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">แก้ไขหลักฐาน</h1>
        <p className="text-muted-foreground mt-1">{evidence.evidenceCode}</p>
      </div>
      <EditEvidenceForm
        evidence={{
          id: evidence.id.toString(),
          title: evidence.title,
          description: evidence.description || '',
          status: evidence.status,
          privacyLevel: evidence.privacyLevel,
          ownerUserId: evidence.ownerUserId?.toString() || '',
        }}
      />
    </div>
  );
}


