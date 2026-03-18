/**
 * Seed: แบบประเมินการเตรียมความพร้อมและพัฒนาอย่างเข้ม ตำแหน่งครูผู้ช่วย
 * อ้างอิง: หนังสือสำนักงาน ก.ค.ศ. ว26/2561 (แบบเก่า ก่อน 19 สิงหาคม 2568)
 *
 * โครงสร้างการประเมิน:
 *  - ด้านที่ 1 ด้านการปฏิบัติตน  (50 คะแนน, 6 ตัวชี้วัด)
 *  - ด้านที่ 2 ด้านการปฏิบัติงาน (50 คะแนน, 6 ตัวชี้วัด)
 *  รวม 100 คะแนน
 *
 * สูตรคำนวณคะแนนต่อตัวชี้วัด:
 *  คะแนน = (ผลรวมคะแนนย่อยทุกรายการ × คะแนนเต็มของตัวชี้วัด) / (จำนวนรายการย่อย × 4)
 *
 * เกณฑ์ผ่าน: รวมทั้ง 2 ด้าน ≥ 60 คะแนน และแต่ละด้าน ≥ 24 คะแนน
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ครูผู้ช่วย (ว26/2561 แบบเก่า) data...\n');

  // ==========================================================================
  // ด้าน (PAAspect) — positionType = ASSISTANT_TEACHER
  // ==========================================================================
  const aspects = [
    {
      code: 'AT_1',
      nameTh: 'ด้านการปฏิบัติตน',
      sortNo: 1,
      part: 'PART1' as const,
      positionType: 'ASSISTANT_TEACHER' as const,
      maxScore: 50,
      description: 'ประเมินความประพฤติ คุณธรรม จรรยาบรรณ และจิตวิญญาณความเป็นครู (50 คะแนน)',
    },
    {
      code: 'AT_2',
      nameTh: 'ด้านการปฏิบัติงาน',
      sortNo: 2,
      part: 'PART2' as const,
      positionType: 'ASSISTANT_TEACHER' as const,
      maxScore: 50,
      description: 'ประเมินสมรรถนะในการจัดการเรียนการสอนและปฏิบัติงานในหน้าที่ (50 คะแนน)',
    },
  ];

  console.log('Creating PAAspects for ASSISTANT_TEACHER...');
  for (const aspect of aspects) {
    await prisma.pAAspect.upsert({
      where: { code: aspect.code },
      update: {
        nameTh: aspect.nameTh,
        sortNo: aspect.sortNo,
        description: aspect.description,
        maxScore: aspect.maxScore,
      },
      create: aspect,
    });
  }
  console.log(`✅ Created ${aspects.length} PAAspects\n`);

  // ==========================================================================
  // ตัวชี้วัด ด้านที่ 1: ด้านการปฏิบัติตน (50 คะแนน)
  //
  // หมายเหตุ: คะแนนเต็มแต่ละตัวชี้วัด (maxScore) เก็บใน weight
  //   จำนวนรายการย่อย (numSubItems) เก็บใน description (JSON)
  //   สูตร: คะแนน = (∑คะแนนย่อย × weight) / (numSubItems × 4)
  // ==========================================================================
  const aspect1 = await prisma.pAAspect.findUnique({ where: { code: 'AT_1' } });
  const aspect2 = await prisma.pAAspect.findUnique({ where: { code: 'AT_2' } });

  if (!aspect1 || !aspect2) {
    throw new Error('PAAspects not found after upsert');
  }

  const indicators1 = [
    {
      code: '1.1',
      aspectId: aspect1.id,
      nameTh: 'วินัยและการรักษาวินัย',
      description: JSON.stringify({
        maxScore: 6,
        numSubItems: 3,
        subItems: [
          'ปฏิบัติตนตามกฎหมาย ระเบียบ แบบแผน และข้อบังคับของหน่วยงาน สถานศึกษา และส่วนราชการต้นสังกัดอย่างเคร่งครัด',
          'ปฏิบัติตนเป็นแบบอย่างที่ดี และเสริมสร้างวินัยของผู้เรียน',
          'ประพฤติปฏิบัติตนให้เป็นที่น่าเชื่อถือและไว้วางใจในการปฏิบัติงาน',
        ],
      }),
      sortNo: 1,
      weight: 6,
    },
    {
      code: '1.2',
      aspectId: aspect1.id,
      nameTh: 'คุณธรรม จริยธรรม และค่านิยม',
      description: JSON.stringify({
        maxScore: 6,
        numSubItems: 3,
        subItems: [
          'มีความซื่อสัตย์สุจริต ยุติธรรม โปร่งใส และมีจิตสาธารณะ',
          'มีความรับผิดชอบ มุ่งมั่น ทุ่มเท ในการปฏิบัติหน้าที่อย่างเต็มกำลังความสามารถ',
          'ดำรงตนให้มีคุณค่า เป็นที่ยอมรับของสังคม',
        ],
      }),
      sortNo: 2,
      weight: 6,
    },
    {
      code: '1.3',
      aspectId: aspect1.id,
      nameTh: 'จรรยาบรรณวิชาชีพ',
      description: JSON.stringify({
        maxScore: 6,
        numSubItems: 3,
        subItems: [
          'ปฏิบัติตนตามจรรยาบรรณของวิชาชีพครูและมาตรฐานวิชาชีพครู',
          'เสริมสร้างและพัฒนาจรรยาบรรณวิชาชีพครูในสถานศึกษาและชุมชน',
          'เป็นแบบอย่างที่ดีด้านคุณธรรม จริยธรรม และจรรยาบรรณวิชาชีพ',
        ],
      }),
      sortNo: 3,
      weight: 6,
    },
    {
      code: '1.4',
      aspectId: aspect1.id,
      nameTh: 'การดำรงชีวิตตามหลักปรัชญาของเศรษฐกิจพอเพียง',
      description: JSON.stringify({
        maxScore: 6,
        numSubItems: 3,
        subItems: [
          'มีความรู้ความเข้าใจเกี่ยวกับหลักปรัชญาของเศรษฐกิจพอเพียง',
          'นำหลักปรัชญาของเศรษฐกิจพอเพียงไปประยุกต์ใช้ในการดำรงชีวิต',
          'เป็นแบบอย่างการดำรงชีวิตตามหลักปรัชญาของเศรษฐกิจพอเพียงแก่ผู้เรียนและชุมชน',
        ],
      }),
      sortNo: 4,
      weight: 6,
    },
    {
      code: '1.5',
      aspectId: aspect1.id,
      nameTh: 'จิตวิญญาณความเป็นครู',
      description: JSON.stringify({
        maxScore: 14,
        numSubItems: 7,
        subItems: [
          'รักและศรัทธาในวิชาชีพครู มีความภาคภูมิใจในความเป็นครู',
          'รัก เมตตา เอาใจใส่ ช่วยเหลือ ส่งเสริม และพัฒนาผู้เรียนด้วยความบริสุทธิ์ใจ',
          'อุทิศตนในการปฏิบัติงาน มีความเสียสละ และรับผิดชอบต่อผู้เรียนและสังคม',
          'ให้การศึกษาแก่ผู้เรียนด้วยความเต็มใจ มีความซื่อสัตย์สุจริต และเป็นธรรม',
          'ยอมรับฟังความคิดเห็น และให้เกียรติผู้เรียน ผู้ปกครอง และเพื่อนร่วมงาน',
          'แสวงหาความรู้ใหม่อยู่เสมอ และมุ่งพัฒนาผู้เรียนอย่างต่อเนื่อง',
          'มีความกระตือรือร้นในการปฏิบัติหน้าที่ และสร้างบรรยากาศการเรียนรู้ที่ดี',
        ],
      }),
      sortNo: 5,
      weight: 14,
    },
    {
      code: '1.6',
      aspectId: aspect1.id,
      nameTh: 'จิตสำนึกความรับผิดชอบในวิชาชีพครู',
      description: JSON.stringify({
        maxScore: 12,
        numSubItems: 6,
        subItems: [
          'ตระหนักและรับผิดชอบต่อผลการจัดการเรียนรู้ของผู้เรียน',
          'พัฒนาตนเองและวิชาชีพอย่างต่อเนื่องและเป็นระบบ',
          'มีส่วนร่วมในการพัฒนาสถานศึกษาและชุมชน',
          'เสริมสร้างและพัฒนาความสัมพันธ์อันดีกับผู้เรียน ผู้ปกครอง และชุมชน',
          'ปฏิบัติหน้าที่ครูโดยไม่เลือกปฏิบัติ และคำนึงถึงประโยชน์ของผู้เรียนเป็นสำคัญ',
          'ดำรงตนเป็นสมาชิกที่ดีของสังคม มีส่วนร่วมในกิจกรรมของชุมชน',
        ],
      }),
      sortNo: 6,
      weight: 12,
    },
  ];

  // ==========================================================================
  // ตัวชี้วัด ด้านที่ 2: ด้านการปฏิบัติงาน (50 คะแนน)
  // ==========================================================================
  const indicators2 = [
    {
      code: '2.1',
      aspectId: aspect2.id,
      nameTh: 'การจัดการเรียนการสอน',
      description: JSON.stringify({
        maxScore: 20,
        numSubItems: 10,
        subItems: [
          'วิเคราะห์หลักสูตร มาตรฐานการเรียนรู้ ตัวชี้วัด และสาระการเรียนรู้',
          'จัดทำแผนการจัดการเรียนรู้ที่สอดคล้องกับหลักสูตร',
          'ออกแบบการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ',
          'จัดกิจกรรมการเรียนรู้ตามแผนการจัดการเรียนรู้ได้อย่างมีประสิทธิภาพ',
          'ใช้สื่อ นวัตกรรม และเทคโนโลยีในการจัดการเรียนรู้อย่างเหมาะสม',
          'ออกแบบและดำเนินการวัดและประเมินผลการเรียนรู้ตามสภาพจริง',
          'นำผลการประเมินไปปรับปรุงและพัฒนาการจัดการเรียนรู้',
          'จัดทำบันทึกหลังแผนการจัดการเรียนรู้และนำผลไปปรับปรุง',
          'พัฒนาและแก้ปัญหาของผู้เรียนด้วยกระบวนการวิจัยในชั้นเรียน',
          'ส่งเสริมผู้เรียนให้มีคุณลักษณะตามที่หลักสูตรกำหนด',
        ],
      }),
      sortNo: 1,
      weight: 20,
    },
    {
      code: '2.2',
      aspectId: aspect2.id,
      nameTh: 'การบริหารจัดการชั้นเรียน',
      description: JSON.stringify({
        maxScore: 10,
        numSubItems: 5,
        subItems: [
          'จัดบรรยากาศและสภาพแวดล้อมที่เอื้อต่อการเรียนรู้',
          'จัดระบบดูแลช่วยเหลือผู้เรียนอย่างเป็นระบบและมีประสิทธิภาพ',
          'บริหารจัดการชั้นเรียนด้วยหลักประชาธิปไตย',
          'สร้างความสัมพันธ์ที่ดีกับผู้เรียนและผู้ปกครอง',
          'รายงานผลการพัฒนาคุณภาพผู้เรียนต่อผู้ปกครองและผู้เกี่ยวข้อง',
        ],
      }),
      sortNo: 2,
      weight: 10,
    },
    {
      code: '2.3',
      aspectId: aspect2.id,
      nameTh: 'การพัฒนาตนเองและพัฒนาวิชาชีพ',
      description: JSON.stringify({
        maxScore: 8,
        numSubItems: 4,
        subItems: [
          'พัฒนาความรู้ ทักษะ และสมรรถนะวิชาชีพอย่างต่อเนื่องและเป็นระบบ',
          'นำความรู้ ทักษะ และประสบการณ์ที่ได้จากการพัฒนาตนเองมาใช้ในการจัดการเรียนรู้',
          'แลกเปลี่ยนเรียนรู้และร่วมพัฒนาวิชาชีพกับเพื่อนร่วมงาน',
          'มีผลงานทางวิชาการหรือนวัตกรรมที่พัฒนาจากการปฏิบัติงาน',
        ],
      }),
      sortNo: 3,
      weight: 8,
    },
    {
      code: '2.4',
      aspectId: aspect2.id,
      nameTh: 'การทำงานเป็นทีม',
      description: JSON.stringify({
        maxScore: 4,
        numSubItems: 2,
        subItems: [
          'ร่วมมือและประสานงานกับเพื่อนร่วมงาน ผู้บริหาร ผู้ปกครอง และชุมชนได้อย่างมีประสิทธิภาพ',
          'มีส่วนร่วมในการพัฒนาสถานศึกษาและสร้างเครือข่ายการเรียนรู้ทางวิชาชีพ',
        ],
      }),
      sortNo: 4,
      weight: 4,
    },
    {
      code: '2.5',
      aspectId: aspect2.id,
      nameTh: 'งานกิจกรรมตามภาระกิจบริหารงานของสถานศึกษา',
      description: JSON.stringify({
        maxScore: 4,
        numSubItems: 2,
        subItems: [
          'ปฏิบัติงานตามที่ได้รับมอบหมายจากสถานศึกษาด้วยความรับผิดชอบ ทุ่มเท และมีประสิทธิภาพ',
          'มีส่วนร่วมในกิจกรรมของสถานศึกษาและชุมชนอย่างสม่ำเสมอ',
        ],
      }),
      sortNo: 5,
      weight: 4,
    },
    {
      code: '2.6',
      aspectId: aspect2.id,
      nameTh: 'การใช้ภาษาและเทคโนโลยีสื่อสาร',
      description: JSON.stringify({
        maxScore: 4,
        numSubItems: 2,
        subItems: [
          'ใช้ภาษาไทยได้อย่างถูกต้อง เหมาะสม ในการสื่อสารและการจัดการเรียนรู้',
          'ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการจัดการเรียนรู้และการปฏิบัติงาน',
        ],
      }),
      sortNo: 6,
      weight: 4,
    },
  ];

  const allIndicators = [...indicators1, ...indicators2];

  console.log('Creating PAIndicators for ASSISTANT_TEACHER (ว26/2561)...');
  for (const ind of allIndicators) {
    const indicator = await prisma.pAIndicator.upsert({
      where: {
        aspectId_code: {
          aspectId: ind.aspectId,
          code: ind.code,
        },
      },
      update: {
        nameTh: ind.nameTh,
        description: ind.description,
        sortNo: ind.sortNo,
        weight: ind.weight,
      },
      create: {
        aspectId: ind.aspectId,
        code: ind.code,
        nameTh: ind.nameTh,
        description: ind.description,
        sortNo: ind.sortNo,
        weight: ind.weight,
      },
    });

    // สร้างเกณฑ์คะแนน 0, 2, 3, 4 ตามแบบประเมินเก่า
    // (ระดับ 0 = ปรับปรุง, 2 = พอใช้, 3 = ดี, 4 = ดีมาก  — ไม่มีระดับ 1)
    const scales = [
      {
        score: 0,
        labelTh: 'ปรับปรุง',
        descriptionTh: 'ปฏิบัติได้ไม่ผ่านเกณฑ์ขั้นต่ำที่กำหนด หรือปฏิบัติไม่ได้',
        criteriaTh: 'ไม่ผ่าน (0 คะแนน)',
      },
      {
        score: 2,
        labelTh: 'พอใช้',
        descriptionTh: 'ปฏิบัติได้ในระดับที่พอยอมรับได้ แต่ยังขาดความสม่ำเสมอหรือต้องได้รับการพัฒนาเพิ่มเติม',
        criteriaTh: 'ผ่านเกณฑ์ขั้นต่ำ (2 คะแนน)',
      },
      {
        score: 3,
        labelTh: 'ดี',
        descriptionTh: 'ปฏิบัติได้ตามเกณฑ์ที่กำหนดอย่างสม่ำเสมอและมีคุณภาพ',
        criteriaTh: 'ปฏิบัติได้ตามเกณฑ์ (3 คะแนน)',
      },
      {
        score: 4,
        labelTh: 'ดีมาก',
        descriptionTh: 'ปฏิบัติได้เกินเกณฑ์ที่กำหนด เป็นแบบอย่างที่ดี สามารถนำไปขยายผลหรือเผยแพร่ได้',
        criteriaTh: 'ปฏิบัติได้ดีเยี่ยม (4 คะแนน)',
      },
    ];

    for (const scale of scales) {
      await prisma.pAIndicatorScale.upsert({
        where: {
          indicatorId_score: {
            indicatorId: indicator.id,
            score: scale.score,
          },
        },
        update: {
          labelTh: scale.labelTh,
          descriptionTh: scale.descriptionTh,
          criteriaTh: scale.criteriaTh,
        },
        create: {
          indicatorId: indicator.id,
          score: scale.score,
          labelTh: scale.labelTh,
          descriptionTh: scale.descriptionTh,
          criteriaTh: scale.criteriaTh,
        },
      });
    }

    const desc = JSON.parse(ind.description as string);
    console.log(`  ✓ ${ind.code} ${ind.nameTh} (${desc.maxScore} คะแนน, ${desc.numSubItems} รายการย่อย)`);
  }

  console.log(`\n✅ Created ${allIndicators.length} PAIndicators with scales\n`);

  // ==========================================================================
  // สรุปโครงสร้าง
  // ==========================================================================
  console.log('📊 สรุปตัวชี้วัด ว26/2561 ครูผู้ช่วย (แบบเก่า):');
  console.log('─────────────────────────────────────────────────────────');
  console.log('ด้านที่ 1 ด้านการปฏิบัติตน (50 คะแนน)');
  for (const ind of indicators1) {
    const d = JSON.parse(ind.description);
    console.log(`  ${ind.code} ${ind.nameTh.padEnd(36)} ${String(d.maxScore).padStart(2)} คะแนน  ${d.numSubItems} รายการ`);
  }
  console.log('ด้านที่ 2 ด้านการปฏิบัติงาน (50 คะแนน)');
  for (const ind of indicators2) {
    const d = JSON.parse(ind.description);
    console.log(`  ${ind.code} ${ind.nameTh.padEnd(36)} ${String(d.maxScore).padStart(2)} คะแนน  ${d.numSubItems} รายการ`);
  }
  console.log('─────────────────────────────────────────────────────────');
  console.log('รวม 12 ตัวชี้วัด 100 คะแนน');
  console.log('\n✨ Seed ว26/2561 ครูผู้ช่วย completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding assistant teacher data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
