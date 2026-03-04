/**
 * ดึงข้อความจาก docref/policy.pdf แล้วสร้าง/อัปเดตตาราง obecpolicy
 * รัน: node scripts/seed-obec-from-pdf.mjs [--fiscal-year=2568] [--sql-only]
 * - --fiscal-year=2568  ปีงบประมาณ (default 2568)
 * - --sql-only         แค่สร้างไฟล์ SQL ไม่เขียน DB
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pdfPath = path.join(rootDir, 'docref', 'policy.pdf');

const args = process.argv.slice(2);
const fiscalYear = parseInt(args.find((a) => a.startsWith('--fiscal-year='))?.split('=')[1] || '2568', 10);
const sqlOnly = args.includes('--sql-only');

/**
 * ดึงข้อความจาก PDF (ถ้าดึงได้)
 */
async function extractTextFromPdf() {
  try {
    const mod = await import('pdf-parse');
    const PDFParse = mod.PDFParse;
    const buf = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    return (result && result.text) ? result.text.trim() : '';
  } catch (e) {
    console.warn('ไม่สามารถดึงข้อความจาก PDF ได้:', e.message);
    return '';
  }
}

/**
 * แยกบรรทัดที่เป็นนโยบาย (นโยบายที่ N, ข้อ N, N. ...)
 */
function parsePolicyLines(text) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const policies = [];
  const reNum = /^(\d+)[\.\)]\s*(.+)$/;
  const rePolicy = /นโยบายที่\s*(\d+)\s*(.*)$/i;
  const reItem = /ข้อ\s*(\d+)\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^--\s*\d+ of \d+ --/.test(line)) continue;

    let code = null;
    let nameTh = line;

    const mPolicy = line.match(rePolicy);
    const mItem = line.match(reItem);
    const mNum = line.match(reNum);

    if (mPolicy) {
      code = `นโยบายที่ ${mPolicy[1]}`;
      nameTh = (mPolicy[2] || code).trim();
    } else if (mItem) {
      code = `ข้อ ${mItem[1]}`;
      nameTh = (mItem[2] || code).trim();
    } else if (mNum && mNum[2].length > 2) {
      code = `ข้อ ${mNum[1]}`;
      nameTh = mNum[2].trim();
    }

    if (code && nameTh) {
      policies.push({ code, nameTh, sortNo: policies.length + 1 });
    }
  }

  return policies;
}

/**
 * นโยบายค่าเริ่มต้น (เมื่อ PDF ไม่มีข้อความที่ดึงได้)
 */
function defaultPolicies() {
  return [
    { code: 'นโยบายที่ 1', nameTh: 'นโยบายและจุดเน้นข้อ 1', sortNo: 1 },
    { code: 'นโยบายที่ 2', nameTh: 'นโยบายและจุดเน้นข้อ 2', sortNo: 2 },
    { code: 'นโยบายที่ 3', nameTh: 'นโยบายและจุดเน้นข้อ 3', sortNo: 3 },
    { code: 'นโยบายที่ 4', nameTh: 'นโยบายและจุดเน้นข้อ 4', sortNo: 4 },
    { code: 'นโยบายที่ 5', nameTh: 'นโยบายและจุดเน้นข้อ 5', sortNo: 5 },
    { code: 'Quick Win', nameTh: 'นโยบาย Quick Win', sortNo: 10 },
  ];
}

function escapeSql(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function buildSql(policies, year) {
  const now = 'NOW()';
  const values = policies
    .map(
      (p) =>
        `(${year}, ${escapeSql(p.code)}, ${escapeSql(p.nameTh)}, NULL, ${p.sortNo}, ${now}, ${now})`
    )
    .join(',\n');
  return `-- อัปเดตจาก docref/policy.pdf (ปีงบประมาณ ${year})
INSERT INTO \`obecpolicy\` (\`fiscalYear\`, \`code\`, \`nameTh\`, \`descriptionTh\`, \`sortNo\`, \`createdAt\`, \`updatedAt\`) VALUES
${values}
ON DUPLICATE KEY UPDATE \`nameTh\` = VALUES(\`nameTh\`), \`descriptionTh\` = VALUES(\`descriptionTh\`), \`updatedAt\` = NOW();
`;
}

async function main() {
  console.log('อ่านไฟล์:', pdfPath);
  if (!fs.existsSync(pdfPath)) {
    console.error('ไม่พบไฟล์ docref/policy.pdf');
    process.exit(1);
  }

  const text = await extractTextFromPdf();
  let policies = parsePolicyLines(text);

  if (policies.length === 0) {
    console.log('ไม่พบรายการนโยบายใน PDF (หรือ PDF เป็นภาพ/สแกน) — ใช้รายการค่าเริ่มต้น');
    policies = defaultPolicies();
  } else {
    console.log('พบรายการนโยบาย', policies.length, 'ข้อ');
  }

  const sql = buildSql(policies, fiscalYear);
  const outPath = path.join(rootDir, 'docs', 'OBEC_POLICY_SEED.sql');
  const header = `-- =============================================================================
-- นโยบาย สพฐ (obecpolicy) — สร้าง/อัปเดตจาก docref/policy.pdf
-- รันเมื่อ: node scripts/seed-obec-from-pdf.mjs [--fiscal-year=2568]
-- =============================================================================

`;
  fs.writeFileSync(outPath, header + sql, 'utf8');
  console.log('เขียนไฟล์ SQL แล้ว:', outPath);

  if (sqlOnly) {
    console.log('(--sql-only) ข้ามการเขียน DB');
    return;
  }

  const CREATE_OBECPOLICY = `
CREATE TABLE IF NOT EXISTS \`obecpolicy\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT,
  \`fiscalYear\` INTEGER NOT NULL,
  \`code\` VARCHAR(191) NOT NULL,
  \`nameTh\` VARCHAR(191) NOT NULL,
  \`descriptionTh\` TEXT NULL,
  \`sortNo\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`obecpolicy_fiscalYear_code_key\`(\`fiscalYear\`, \`code\`),
  INDEX \`obecpolicy_fiscalYear_idx\`(\`fiscalYear\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`.trim();

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    async function upsertPolicies() {
      for (const p of policies) {
        await prisma.oBECPolicy.upsert({
          where: {
            fiscalYear_code: { fiscalYear, code: p.code },
          },
          update: { nameTh: p.nameTh, sortNo: p.sortNo },
          create: {
            fiscalYear,
            code: p.code,
            nameTh: p.nameTh,
            descriptionTh: null,
            sortNo: p.sortNo,
          },
        });
      }
    }

    try {
      await upsertPolicies();
    } catch (firstErr) {
      const msg = String(firstErr.message || firstErr);
      if (firstErr.code === 'P2021' || msg.includes('does not exist')) {
        console.log('ตาราง obecpolicy ยังไม่มี — สร้างตารางให้ก่อน...');
        await prisma.$executeRawUnsafe(CREATE_OBECPOLICY);
        console.log('สร้างตาราง obecpolicy แล้ว');
        await upsertPolicies();
      } else {
        throw firstErr;
      }
    }

    console.log('อัปเดตตาราง obecpolicy แล้ว', policies.length, 'รายการ (ปี', fiscalYear, ')');
    await prisma.$disconnect();
  } catch (e) {
    console.error('เขียน DB ไม่สำเร็จ:', e.message);
    if (e.code === 'P2021') {
      console.error('หมายเหตุ: ตรวจสอบว่าตาราง obecpolicy ถูกสร้างแล้ว (รัน docs/PROJECT_ADD_TABLES.sql)');
    }
    process.exit(1);
  }
}

main();
