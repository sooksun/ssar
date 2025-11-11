import { prisma } from '@/lib/db';

export type PrimaryEvidenceFile = {
  evidenceId: string;
  evidenceCode: string | null;
  title: string;
  schoolId: string;
  schoolName: string;
  fiscalYear: number;
  indicatorCode: string;
  indicatorName: string;
  uploadedAt: Date;
  storageType: string;
  storagePath?: string | null;
  driveFileId?: string | null;
  externalUrl?: string | null;
};

type GetPrimaryFilesOptions = {
  schoolIds: bigint[];
  fiscalYear?: number;
};

export async function getPrimaryFiles(options: GetPrimaryFilesOptions): Promise<PrimaryEvidenceFile[]> {
  const { schoolIds, fiscalYear } = options;

  if (schoolIds.length === 0) {
    return [];
  }

  const evidenceRecords = await prisma.evidence.findMany({
    where: {
      schoolId: { in: schoolIds },
      del: false,
      ...(fiscalYear ? { fiscalYear } : {}),
      files: {
        some: {
          isPrimary: true,
          del: false,
        },
      },
    },
    select: {
      id: true,
      evidenceCode: true,
      title: true,
      fiscalYear: true,
      school: {
        select: {
          sc_id: true,
          name: true,
        },
      },
      indicator: {
        select: {
          code: true,
          nameTh: true,
        },
      },
      files: {
        where: {
          isPrimary: true,
          del: false,
        },
        select: {
          uploadedAt: true,
          storageType: true,
          storagePath: true,
          driveFileId: true,
          externalUrl: true,
        },
      },
    },
    orderBy: [
      { fiscalYear: 'desc' },
      { evidenceCode: 'asc' },
    ],
  });

  const result: PrimaryEvidenceFile[] = [];

  for (const record of evidenceRecords) {
    const primaryFile = record.files[0];
    if (!primaryFile) continue;

    result.push({
      evidenceId: record.id.toString(),
      evidenceCode: record.evidenceCode,
      title: record.title,
      fiscalYear: record.fiscalYear,
      schoolId: record.school.sc_id.toString(),
      schoolName: record.school.name,
      indicatorCode: record.indicator.code,
      indicatorName: record.indicator.nameTh,
      uploadedAt: primaryFile.uploadedAt,
      storageType: primaryFile.storageType,
      storagePath: primaryFile.storagePath,
      driveFileId: primaryFile.driveFileId,
      externalUrl: primaryFile.externalUrl,
    });
  }

  return result;
}


