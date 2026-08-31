#!/usr/bin/env node
/**
 * ตรวจ/ทำ baseline ฐานข้อมูลที่มีอยู่แล้ว ให้เข้ากับ migration history ชุดใหม่
 * ดูที่มาและเหตุผลทั้งหมดใน docs/MIGRATION_BASELINE.md
 *
 * ใช้งาน (อ่านค่า DATABASE_URL จาก env — ไม่ใส่รหัสผ่านใน argument):
 *
 *   # 1) สำรวจอย่างเดียว ไม่เขียนอะไรทั้งสิ้น (ค่าเริ่มต้น)
 *   DATABASE_URL="mysql://user:pass@192.168.1.4:3306/qa_external" node scripts/prod-baseline.mjs
 *
 *   # 2) ลงมือแก้ metadata ใน _prisma_migrations (ต้องยืนยันว่า backup แล้ว)
 *   DATABASE_URL="..." node scripts/prod-baseline.mjs --apply --i-have-a-backup
 *
 * สคริปต์นี้แตะเฉพาะตาราง _prisma_migrations เท่านั้น
 * ไม่ CREATE / ALTER / DROP ตารางข้อมูลใด ๆ — ส่วนนั้นให้ prisma migrate deploy ทำ
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const HAS_BACKUP = process.argv.includes('--i-have-a-backup');

/** ชื่อเดิม → ชื่อใหม่ (ลำดับอ้างอิงจาก _prisma_migrations.started_at ของ dev) */
const RENAMES = [
  ['add_pa_tables', '20251116000100_add_pa_tables'],
  ['prd_evidence_development_summary', '20251116000200_prd_evidence_development_summary'],
  ['add_lesson_plan_fields', '20251116000300_add_lesson_plan_fields'],
  [
    '20250304000000_add_pateacherdocument_project_tables',
    '20251116000400_add_pateacherdocument_project_tables',
  ],
];

const RECONCILE = '20251116000600_reconcile_schema_with_migrations';

/**
 * หาคอลัมน์ที่ `prisma migrate diff` จะสั่ง MODIFY ... VARCHAR(n)
 *
 * ไม่ใช้รายชื่อตายตัว เพราะจะเพี้ยนทันทีที่ schema.prisma เปลี่ยน
 * (เช่นหลังเติม @db.Text ให้คอลัมน์ไหน คอลัมน์นั้นต้องหลุดจากรายการเอง)
 * อ่านจาก diff จริงระหว่างฐานข้อมูลปลายทาง → schema.prisma
 */
function findVarcharModifies() {
  // เรียก prisma CLI ผ่าน node โดยตรง ไม่ผ่าน npx/shell
  // - บน Windows การ spawn `npx.cmd` โดยไม่มี shell จะได้ EINVAL
  // - และ DATABASE_URL มี & กับ ? ซึ่ง shell จะตีความผิด
  const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  const out = execFileSync(
    process.execPath,
    [
      cli,
      'migrate',
      'diff',
      '--from-url',
      process.env.DATABASE_URL,
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--script',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 }
  );

  const targets = [];
  let table = null;
  for (const line of out.split('\n')) {
    const alter = /^ALTER TABLE `(\w+)`/.exec(line);
    if (alter) table = alter[1];
    const mod = /MODIFY `(\w+)` VARCHAR\((\d+)\)/.exec(line);
    if (mod && table) targets.push({ table, column: mod[1], limit: Number(mod[2]) });
  }
  return { targets, script: out };
}

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function head(title) {
  console.log('\n' + c.bold('── ' + title + ' ' + '─'.repeat(Math.max(0, 58 - title.length))));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(c.red('ต้องตั้ง DATABASE_URL ก่อน'));
    process.exit(1);
  }
  if (APPLY && !HAS_BACKUP) {
    console.error(
      c.red('ปฏิเสธ: --apply ต้องมี --i-have-a-backup ด้วย\n') +
        'สำรองฐานข้อมูลทั้งก้อนก่อน (ไม่ใช่แค่ _prisma_migrations) เช่น:\n' +
        c.dim(
          '  docker run --rm mariadb:11 mariadb-dump -h 192.168.1.4 -u <user> -p <db> > backup.sql'
        )
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ['error'] });
  const q = (sql, ...args) => prisma.$queryRawUnsafe(sql, ...args);

  try {
    // ── ระบุว่าต่ออยู่กับฐานไหน ────────────────────────────────
    head('ฐานข้อมูลปลายทาง');
    const [info] = await q('SELECT VERSION() v, DATABASE() d, CURRENT_USER() u');
    console.log('  server  :', info.v);
    console.log('  database:', c.bold(info.d));
    console.log('  user    :', info.u);
    console.log('  โหมด    :', APPLY ? c.yellow('APPLY (จะเขียน)') : c.green('DRY RUN (อ่านอย่างเดียว)'));

    const [{ c: tableCount }] = await q(
      'SELECT COUNT(*) c FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
    console.log('  ตาราง   :', Number(tableCount));

    // ── สถานะ _prisma_migrations ──────────────────────────────
    head('_prisma_migrations');
    const rows = await q(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at'
    );
    console.log(`  ทั้งหมด ${rows.length} แถว`);

    const oldNames = new Set(RENAMES.map(([o]) => o));
    const interesting = rows.filter(
      (r) => oldNames.has(r.migration_name) || r.rolled_back_at || !r.finished_at
    );
    if (interesting.length === 0) {
      console.log(c.dim('  (ไม่มีแถวที่ต้องแก้)'));
    }
    for (const r of interesting) {
      const state = r.rolled_back_at
        ? c.yellow('rolled back')
        : r.finished_at
          ? c.green('applied')
          : c.red('ยังไม่จบ');
      console.log(`  ${r.migration_name.padEnd(52)} ${state}`);
    }

    // ── แผนการแก้ metadata ────────────────────────────────────
    head('แผนแก้ metadata');
    const [{ c: rollbackCount }] = await q(
      `SELECT COUNT(*) c FROM _prisma_migrations
       WHERE rolled_back_at IS NOT NULL AND migration_name IN (${RENAMES.map(() => '?').join(',')})`,
      ...RENAMES.map(([o]) => o)
    );
    console.log(`  ลบแถวที่ rolled back : ${Number(rollbackCount)} แถว`);

    let renameTotal = 0;
    for (const [oldN, newN] of RENAMES) {
      const [{ c: n }] = await q(
        'SELECT COUNT(*) c FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NOT NULL AND rolled_back_at IS NULL',
        oldN
      );
      const already = rows.some((r) => r.migration_name === newN);
      renameTotal += Number(n);
      const note = already ? c.dim(' (มีชื่อใหม่อยู่แล้ว)') : Number(n) ? '' : c.dim(' (ไม่พบ — ข้าม)');
      console.log(`  rename ${Number(n)} แถว: ${oldN}${note}`);
    }

    const reconcileExists = rows.some((r) => r.migration_name === RECONCILE);
    console.log(
      `  baseline ${RECONCILE}: ${reconcileExists ? c.dim('ทำแล้ว') : c.yellow('ยังไม่ทำ')}`
    );

    // ── เช็คความเสี่ยงข้อมูลถูกตัด ────────────────────────────
    head('ตรวจความเสี่ยงข้อมูลถูกตัด');
    let risky = 0;
    let script = '';
    try {
      const found = findVarcharModifies();
      script = found.script;
      console.log(
        `  คอลัมน์ที่ diff จะสั่ง MODIFY เป็น VARCHAR: ${found.targets.length}`
      );
      for (const { table, column, limit } of found.targets) {
        const [r] = await q(
          `SELECT COALESCE(MAX(CHAR_LENGTH(\`${column}\`)),0) m,
                  COALESCE(SUM(CHAR_LENGTH(\`${column}\`) > ?),0) o FROM \`${table}\``,
          limit
        );
        const max = Number(r.m);
        const over = Number(r.o);
        if (over > 0) {
          risky += 1;
          console.log(
            c.red(`  ⚠ ${table}.${column}`) +
              ` → VARCHAR(${limit}) แต่ยาวสุด ${max} — ${over} แถวจะถูกตัด`
          );
        }
      }

      const destructive = (script.match(/^DROP TABLE|DROP COLUMN/gm) || []).length;
      console.log(`  คำสั่ง DROP TABLE / DROP COLUMN: ${destructive}`);
      if (destructive > 0) {
        risky += destructive;
        console.log(c.red('  ⚠ มีคำสั่งลบตาราง/คอลัมน์ — ต้องตรวจด้วยตาก่อนทั้งหมด'));
      }

      const creates = (script.match(/^CREATE TABLE/gm) || []).length;
      if (creates > 0) {
        console.log(c.yellow(`  ตารางที่ยังขาดและจะถูกสร้าง: ${creates}`));
      }
      if (!script.trim()) {
        console.log(c.green('  ไม่มี drift — schema ตรงกับฐานข้อมูลแล้ว'));
      }
    } catch (e) {
      console.log(c.yellow('  ข้ามการตรวจ: รัน prisma migrate diff ไม่สำเร็จ'));
      console.log(c.dim('  ' + String(e.message).split('\n')[0].slice(0, 160)));
      risky += 1; // ตรวจไม่ได้ = ถือว่าเสี่ยง ไม่ปล่อยผ่าน
    }

    if (risky === 0) {
      console.log(c.green('  ไม่พบข้อมูลที่จะถูกตัด'));
    } else {
      console.log(
        c.red(`\n  พบ ${risky} จุดเสี่ยง`) +
          '\n  ถ้าเป็นเคส VARCHAR: schema.prisma ผิด ไม่ใช่ DB — เติม @db.Text แล้วรันใหม่'
      );
    }

    // ── ลงมือแก้ ──────────────────────────────────────────────
    if (!APPLY) {
      head('ขั้นตอนถัดไป');
      console.log('  ยังไม่ได้เขียนอะไรลงฐานข้อมูล');
      console.log('  1. สำรองฐานข้อมูลทั้งก้อน');
      console.log('  2. รันซ้ำด้วย ' + c.bold('--apply --i-have-a-backup'));
      console.log('  3. npx prisma migrate resolve --applied ' + RECONCILE);
      console.log('  4. npx prisma migrate deploy');
      console.log(
        '  5. npx prisma migrate diff --from-url "$DATABASE_URL" \\\n' +
          '       --to-schema-datamodel prisma/schema.prisma --exit-code'
      );
      return;
    }

    if (risky > 0) {
      console.error(
        c.red('\nหยุด: ยังมีคอลัมน์เสี่ยงข้อมูลถูกตัด แก้ schema.prisma ก่อน')
      );
      process.exitCode = 1;
      return;
    }

    head('กำลังแก้ metadata');
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM _prisma_migrations
       WHERE rolled_back_at IS NOT NULL AND migration_name IN (${RENAMES.map(() => '?').join(',')})`,
      ...RENAMES.map(([o]) => o)
    );
    console.log(`  ลบแถว rolled back: ${deleted}`);

    for (const [oldN, newN] of RENAMES) {
      const n = await prisma.$executeRawUnsafe(
        'UPDATE _prisma_migrations SET migration_name = ? WHERE migration_name = ? AND finished_at IS NOT NULL',
        newN,
        oldN
      );
      if (n > 0) console.log(`  rename: ${oldN} → ${newN}`);
    }

    const dupes = await q(
      'SELECT migration_name, COUNT(*) c FROM _prisma_migrations GROUP BY migration_name HAVING c > 1'
    );
    if (dupes.length > 0) {
      console.error(c.red('  พบชื่อซ้ำหลังแก้:'), dupes.map((d) => d.migration_name).join(', '));
      process.exitCode = 1;
      return;
    }
    console.log(c.green('  ไม่มีชื่อซ้ำ'));

    head('ขั้นตอนถัดไป');
    console.log('  1. npx prisma migrate resolve --applied ' + RECONCILE);
    console.log('  2. npx prisma migrate deploy');
    console.log(
      '  3. npx prisma migrate diff --from-url "$DATABASE_URL" \\\n' +
        '       --to-schema-datamodel prisma/schema.prisma --exit-code'
    );
    console.log(c.dim('  (ข้อ 3 มักจะยังไม่ว่าง — ดูขั้นที่ 5 ใน docs/MIGRATION_BASELINE.md)'));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(c.red('\nผิดพลาด: ') + e.message);
  process.exit(1);
});
