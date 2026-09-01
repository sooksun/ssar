#!/usr/bin/env node
/**
 * สำรวจสถานะฐานข้อมูลแบบอ่านอย่างเดียว — ไม่เขียน ไม่แก้ ไม่ลบอะไรทั้งสิ้น
 *
 * ใช้ตอนต้องรู้ว่าเซิร์ฟเวอร์ปลายทางมีฐานอะไรบ้าง ตารางครบไหม และ user
 * ที่ใช้อยู่มีสิทธิ์อะไร (กรณี "Unknown database" ทั้งที่ SHOW DATABASES เห็นชื่อ
 * มักเป็นเรื่องสิทธิ์ ไม่ใช่ฐานหาย)
 *
 * ต่อผ่าน information_schema เสมอ — เป็นฐานที่ทุก user เข้าถึงได้
 * จึงสำรวจได้แม้ไม่มีสิทธิ์บนฐานเป้าหมาย
 *
 *   node scripts/db-inspect.mjs --url "mysql://user:pass@host:3306/information_schema"
 *   node scripts/db-inspect.mjs --url "..." --db qa_external
 */

import { PrismaClient } from '@prisma/client';

const SYSTEM_SCHEMAS = ['mysql', 'information_schema', 'performance_schema', 'sys'];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const targetDb = arg('--db') ?? 'qa_external';
let url = arg('--url') ?? process.env.DATABASE_URL;

if (!url) {
  console.error('ต้องระบุ --url หรือตั้ง DATABASE_URL');
  process.exit(1);
}

// บังคับให้ต่อผ่าน information_schema — ไม่ต้องมีสิทธิ์บนฐานเป้าหมาย
try {
  const u = new URL(url);
  u.pathname = '/information_schema';
  url = u.toString();
} catch {
  console.error('รูปแบบ URL ไม่ถูกต้อง');
  process.exit(1);
}

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const head = (t) =>
  console.log('\n' + c.bold('── ' + t + ' ' + '─'.repeat(Math.max(0, 56 - t.length))));

const prisma = new PrismaClient({ datasources: { db: { url } }, log: ['error'] });
const q = (sql, ...a) => prisma.$queryRawUnsafe(sql, ...a);
const n = (v) => Number(v);

try {
  head('เซิร์ฟเวอร์');
  const [info] = await q('SELECT VERSION() v, CURRENT_USER() cu, USER() u');
  console.log('  version      :', info.v);
  console.log('  current_user :', info.cu);
  console.log('  เชื่อมต่อมาจาก:', info.u);

  head('ฐานข้อมูลที่มองเห็น + จำนวนตาราง');
  const schemas = await q(
    `SELECT s.schema_name AS name, COUNT(t.table_name) AS tbls
       FROM information_schema.schemata s
       LEFT JOIN information_schema.tables t ON t.table_schema = s.schema_name
      GROUP BY s.schema_name ORDER BY s.schema_name`
  );
  for (const s of schemas) {
    const sys = SYSTEM_SCHEMAS.includes(s.name);
    const count = n(s.tbls);
    let line = `  ${s.name.padEnd(24)} ${String(count).padStart(4)} ตาราง`;
    if (sys) line = c.dim(line + '  (ระบบ)');
    else if (count === 0) line = c.red(line + '  ← ว่างเปล่า');
    else if (/recover|readme|contact|warning|encrypt/i.test(s.name))
      line = c.red(line + '  ← น่าสงสัย');
    console.log(line);
  }

  const empties = schemas.filter((s) => !SYSTEM_SCHEMAS.includes(s.name) && n(s.tbls) === 0);
  const suspicious = schemas.filter((s) => /recover|readme|contact|warning|encrypt/i.test(s.name));

  head(`ฐานเป้าหมาย: ${targetDb}`);
  const target = schemas.find((s) => s.name === targetDb);
  if (!target) {
    console.log(c.red('  ไม่พบฐานนี้บนเซิร์ฟเวอร์'));
  } else if (n(target.tbls) === 0) {
    console.log(c.red('  มีฐานอยู่ แต่ไม่มีตารางเลย — ถูกล้างหรือยังไม่เคย migrate'));
  } else {
    console.log(c.green(`  มี ${n(target.tbls)} ตาราง`));
    const rows = await q(
      `SELECT table_name AS t, table_rows AS r FROM information_schema.tables
        WHERE table_schema = ? ORDER BY table_name`,
      targetDb
    );
    const key = rows.filter((x) =>
      ['school', 'user', 'evidence', 'qaindicator', 'paagreement', '_prisma_migrations'].includes(
        String(x.t).toLowerCase()
      )
    );
    for (const k of key) {
      console.log(`    ${String(k.t).padEnd(24)} ~${n(k.r)} แถว ${c.dim('(ประมาณจาก engine)')}`);
    }
  }

  head('สิทธิ์ของ user นี้');
  try {
    const grants = await q('SHOW GRANTS');
    for (const g of grants) {
      const line = Object.values(g)[0];
      console.log('  ' + line);
    }
  } catch (e) {
    console.log(c.dim('  อ่านสิทธิ์ไม่ได้: ' + String(e.message).split('\n')[0].slice(0, 120)));
  }

  if (suspicious.length > 0) {
    head('ฐานที่น่าสงสัย');
    for (const s of suspicious) {
      console.log(c.red('  ' + s.name));
      try {
        const tabs = await q(
          'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?',
          s.name
        );
        for (const t of tabs) console.log('    ตาราง: ' + t.t);
      } catch {
        console.log(c.dim('    (อ่านรายชื่อตารางไม่ได้)'));
      }
    }
    console.log(
      c.yellow(
        '\n  ชื่อแบบนี้เป็นรูปแบบของการโจมตีฐานข้อมูลที่เปิดสู่อินเทอร์เน็ต\n' +
          '  ข้อความข้างในเป็นของผู้โจมตี — อย่าทำตาม อย่าติดต่อกลับ อย่าจ่ายเงิน'
      )
    );
  }

  head('สรุป');
  if (suspicious.length > 0) {
    console.log(c.red('  พบฐานที่น่าสงสัย ' + suspicious.length + ' รายการ'));
  }
  if (empties.length > 0) {
    console.log(c.red('  ฐานที่ว่างเปล่า: ' + empties.map((e) => e.name).join(', ')));
  }
  if (suspicious.length === 0 && empties.length === 0) {
    console.log(c.green('  ไม่พบฐานว่างเปล่าหรือชื่อน่าสงสัย'));
  }
} catch (e) {
  console.error(c.red('\nผิดพลาด: ') + String(e.message).split('\n').slice(0, 6).join('\n'));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
