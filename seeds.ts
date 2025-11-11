import { PrismaClient } from '@prisma/client';
import { EDU_LEVELS, INDICATORS, LevelCode, STANDARDS, SUB_INDICATORS } from './prisma/seed-data';

const prisma = new PrismaClient();

async function main() {
  const levelMap = new Map<LevelCode, number>();
  for (const level of EDU_LEVELS) {
    const record = await prisma.eduLevel.upsert({
      where: { code: level.code },
      update: { nameTh: level.nameTh },
      create: { code: level.code, nameTh: level.nameTh },
    });
    levelMap.set(level.code, record.id);
  }

  const standardMap = new Map<string, bigint>();
  for (const standard of STANDARDS) {
    const levelId = levelMap.get(standard.levelCode);
    if (!levelId) {
      continue;
    }
    const record = await prisma.qAStandard.upsert({
      where: { levelId_code: { levelId, code: standard.code } },
      update: { nameTh: standard.nameTh, sortNo: standard.sortNo },
      create: {
        levelId,
        code: standard.code,
        nameTh: standard.nameTh,
        sortNo: standard.sortNo,
      },
    });
    standardMap.set(`${standard.levelCode}:${standard.code}`, record.id);
  }

  const indicatorMap = new Map<string, bigint>();
  for (const indicator of INDICATORS) {
    const standardId = standardMap.get(`${indicator.levelCode}:${indicator.standardCode}`);
    if (!standardId) {
      continue;
    }
    const record = await prisma.qAIndicator.upsert({
      where: { standardId_code: { standardId, code: indicator.code } },
      update: { nameTh: indicator.nameTh, sortNo: indicator.sortNo },
      create: {
        standardId,
        code: indicator.code,
        nameTh: indicator.nameTh,
        sortNo: indicator.sortNo,
      },
    });
    indicatorMap.set(`${indicator.levelCode}:${indicator.code}`, record.id);
  }

  for (const sub of SUB_INDICATORS) {
    const indicatorId = indicatorMap.get(`${sub.levelCode}:${sub.indicatorCode}`);
    if (!indicatorId) {
      console.warn(`⚠️ ไม่พบตัวชี้วัดสำหรับตัวชี้วัดย่อย ${sub.levelCode} ${sub.indicatorCode}`);
      continue;
    }
    await prisma.qASubIndicator.upsert({
      where: { indicatorId_itemNo: { indicatorId, itemNo: sub.itemNo } },
      update: { textTh: sub.textTh },
      create: {
        indicatorId,
        itemNo: sub.itemNo,
        textTh: sub.textTh,
      },
    });
  }

  console.log('✅ Seed completed');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
