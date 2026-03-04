/**
 * ตรวจสอบว่าตารางและคอลัมน์ที่แอปใช้ครบหรือยัง
 * รัน: npx tsx scripts/check-db-tables.ts
 * ใช้ DATABASE_URL จาก .env (Next.js/Prisma โหลดอัตโนมัติเมื่อรันในโปรเจกต์)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** ตารางที่คาดหวังจาก Prisma schema (@@map) */
const EXPECTED_TABLES = [
  'educationservicearea',
  'school',
  'role',
  'user',
  'userschoolrole',
  'userarearole',
  'edulevel',
  'qastandard',
  'qaindicator',
  'qasubindicator',
  'evidence',
  'evidenceindicatormapping',
  'evidencefile',
  'evidencereview',
  'evaluation',
  'sarreport',
  'developmentsummary',
  'externalassessment',
  'externalevaluation',
  'auditlog',
  'selfassessmentscope',
  'selfassessmentindicator',
  'selfassessmentevidencelink',
  'indicatorscale',
  'teachingmedia',
  'teachingmediafile',
  'lessonplan',
  'lessonplanfile',
  'paaspect',
  'paindicator',
  'paindicatorscale',
  'paconsideration',
  'paagreement',
  'paagreementitem',
  'pachallengeitem',
  'pachallengeconsideration',
  'paevidencemapping',
  'pasummary',
  'pateacherdocument',
  'obecpolicy',
  'project',
  'projectfile',
] as const;

/** ตารางที่ต้องมีคอลัมน์เฉพาะ (ตาราง -> คอลัมน์ที่ต้องมี) */
const REQUIRED_COLUMNS: Record<string, string[]> = {
  pateacherdocument: ['userId', 'schoolId', 'academicYear', 'documentType'],
  project: ['schoolId', 'code', 'academicYear', 'responsibleUserId'],
  projectfile: ['projectId', 'schoolId', 'fileType'],
  obecpolicy: ['fiscalYear', 'code', 'nameTh'],
};

async function getExistingTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
  `;
  return rows.map((r) => r.TABLE_NAME.toLowerCase());
}

async function getTableColumns(tableName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    tableName
  );
  return rows.map((r) => r.COLUMN_NAME);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : '(ไม่พบ DATABASE_URL)';
  console.log('DATABASE_URL:', maskedUrl);
  console.log('');

  try {
    await prisma.$connect();
  } catch (e) {
    console.error('เชื่อมต่อ DB ไม่ได้:', (e as Error).message);
    process.exit(1);
  }

  const existing = await getExistingTables();
  const missingTables: string[] = [];
  const columnIssues: { table: string; missing: string[] }[] = [];

  for (const table of EXPECTED_TABLES) {
    if (!existing.includes(table.toLowerCase())) {
      missingTables.push(table);
    }
  }

  for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
    if (!existing.includes(table.toLowerCase())) continue;
    const cols = await getTableColumns(table);
    const colSet = new Set(cols.map((c) => c.toLowerCase()));
    const missing = requiredCols.filter((c) => !colSet.has(c.toLowerCase()));
    if (missing.length) columnIssues.push({ table, missing });
  }

  // รายงาน
  if (missingTables.length === 0 && columnIssues.length === 0) {
    console.log('ผลตรวจสอบ: ครบทุกตารางและคอลัมน์ที่ต้องการ');
    await prisma.$disconnect();
    return;
  }

  if (missingTables.length > 0) {
    console.log('ตารางที่ไม่มีใน DB (' + missingTables.length + '):');
    missingTables.forEach((t) => console.log('  -', t));
    console.log('');
  }

  if (columnIssues.length > 0) {
    console.log('ตารางที่ขาดคอลัมน์ที่ต้องการ:');
    columnIssues.forEach(({ table, missing }) => {
      console.log('  -', table, '-> ขาด:', missing.join(', '));
    });
    console.log('');
    console.log('หมายเหตุ: ถ้า pateacherdocument ขาด userId ให้รัน docs/PA_TEACHER_DOCUMENTS_ADD_USERID.sql');
  }

  await prisma.$disconnect();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
