import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import FilesForm from './ui-files-form';
import { BackLink } from '@/components/ui/back-link';
import { canAccessSchool } from '@/lib/auth/scoping';

export default async function EvidenceFilesPage({
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
      files: {
        where: { del: false },
        select: {
          id: true,
          fileName: true,
          storageType: true,
          isPrimary: true,
          uploadedAt: true,
          storagePath: true,
          externalUrl: true,
          thumbnailUrl: true,
          fileUrls: true,
          mimeType: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
      },
      school: {
        select: {
          sc_id: true,
        },
      },
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
        <h1 className="text-3xl font-bold">การ Upload ไฟล์</h1>
        <p className="text-muted-foreground mt-1">{evidence?.evidenceCode}</p>
      </div>
      <FilesForm
        evidenceId={id}
        files={(evidence?.files || []).map((f) => {
          // Parse fileUrls from JSON
          let parsedFileUrls: Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }> | null = null;
          if (f.fileUrls) {
            try {
              if (Array.isArray(f.fileUrls)) {
                parsedFileUrls = f.fileUrls as Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }>;
              }
            } catch {
              parsedFileUrls = null;
            }
          }
          
          return {
            id: f.id.toString(),
            fileName: f.fileName,
            storageType: f.storageType,
            isPrimary: f.isPrimary,
            uploadedAt: f.uploadedAt.toISOString(),
            storagePath: f.storagePath || '',
            externalUrl: f.externalUrl || '',
            thumbnailUrl: f.thumbnailUrl || '',
            fileUrls: parsedFileUrls,
            mimeType: f.mimeType || '',
          };
        })}
      />

      {/* Back Button */}
      <div className="mt-6">
        <BackLink href="/evidence" label="ย้อนกลับรายการ" />
      </div>
    </div>
  );
}


