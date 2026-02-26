/**
 * PA (Performance Agreement) Seed Data
 * ข้อมูลเริ่มต้นสำหรับตัวชี้วัด PA
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PA data...\n');

  // ==========================================================================
  // PA ผู้บริหารสถานศึกษา (PRINCIPAL) - 5 ด้าน 15 ตัวชี้วัด
  // ==========================================================================
  const principalAspects = [
    { code: 'P1', nameTh: 'ด้านการบริหารวิชาการและความเป็นผู้นำทางวิชาการ', sortNo: 1, part: 'PART1' as const, positionType: 'PRINCIPAL' as const },
    { code: 'P2', nameTh: 'ด้านการบริหารจัดการสถานศึกษา', sortNo: 2, part: 'PART1' as const, positionType: 'PRINCIPAL' as const },
    { code: 'P3', nameTh: 'ด้านการบริหารการเปลี่ยนแปลงเชิงกลยุทธ์และนวัตกรรม', sortNo: 3, part: 'PART1' as const, positionType: 'PRINCIPAL' as const },
    { code: 'P4', nameTh: 'ด้านการบริหารงานชุมชนและเครือข่าย', sortNo: 4, part: 'PART1' as const, positionType: 'PRINCIPAL' as const },
    { code: 'P5', nameTh: 'ด้านการพัฒนาตนเองและวิชาชีพ', sortNo: 5, part: 'PART1' as const, positionType: 'PRINCIPAL' as const },
  ];

  // ==========================================================================
  // PA ครู (TEACHER) - 3 ด้าน 15 ตัวชี้วัด (ตาม ref3.pdf)
  // ==========================================================================
  const teacherAspects = [
    { code: 'T1', nameTh: 'ด้านการจัดการเรียนรู้', sortNo: 1, part: 'PART1' as const, positionType: 'TEACHER' as const },
    { code: 'T2', nameTh: 'ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้', sortNo: 2, part: 'PART1' as const, positionType: 'TEACHER' as const },
    { code: 'T3', nameTh: 'ด้านการพัฒนาตนเองและวิชาชีพ', sortNo: 3, part: 'PART1' as const, positionType: 'TEACHER' as const },
  ];

  const allAspects = [...principalAspects, ...teacherAspects];

  console.log('Creating PAAspects (Principal + Teacher)...');
  for (const aspect of allAspects) {
    await prisma.pAAspect.upsert({
      where: { code: aspect.code },
      update: aspect,
      create: aspect,
    });
  }
  console.log(`✅ Created ${allAspects.length} PAAspects\n`);

  // ตัวชี้วัด PA ผู้บริหาร (15 ตัว)
  const principalIndicators = [
    { code: '1.1', aspectCode: 'P1', nameTh: 'การวางแผนพัฒนามาตรฐานการเรียนรู้ของผู้เรียน', sortNo: 1 },
    { code: '1.2', aspectCode: 'P1', nameTh: 'การจัดทำและพัฒนาหลักสูตรสถานศึกษา', sortNo: 2 },
    { code: '1.3', aspectCode: 'P1', nameTh: 'การพัฒนากระบวนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญและปฏิบัติการสอน', sortNo: 3 },
    { code: '1.4', aspectCode: 'P1', nameTh: 'การส่งเสริม สนับสนุน การพัฒนาหรือการนำสื่อ นวัตกรรม และเทคโนโลยีทางการศึกษามาใช้ในการจัดการเรียนรู้', sortNo: 4 },
    { code: '1.5', aspectCode: 'P1', nameTh: 'การนิเทศ กำกับ ติดตาม ประเมินผลการจัดการเรียนรู้ของครูในสถานศึกษา และมีการประกันคุณภาพการศึกษาภายในสถานศึกษา', sortNo: 5 },
    { code: '1.6', aspectCode: 'P1', nameTh: 'การศึกษา วิเคราะห์ เพื่อแก้ปัญหาและพัฒนาการจัดการเรียนรู้ เพื่อยกระดับคุณภาพการศึกษาของสถานศึกษา', sortNo: 6 },
    { code: '2.1', aspectCode: 'P2', nameTh: 'การบริหารจัดการสถานศึกษาให้เป็นไปตามกฎหมาย ระเบียบ ข้อบังคับ นโยบาย และตามหลักบริหารกิจการบ้านเมืองที่ดี', sortNo: 1 },
    { code: '2.2', aspectCode: 'P2', nameTh: 'การบริหารกิจการผู้เรียนและการส่งเสริมพัฒนาผู้เรียน', sortNo: 2 },
    { code: '2.3', aspectCode: 'P2', nameTh: 'การจัดระบบดูแลช่วยเหลือผู้เรียน', sortNo: 3 },
    { code: '3.1', aspectCode: 'P3', nameTh: 'การกำหนดนโยบาย กลยุทธ์ การใช้เครื่องมือหรือนวัตกรรมทางการบริหาร', sortNo: 1 },
    { code: '3.2', aspectCode: 'P3', nameTh: 'การบริหารการเปลี่ยนแปลงและนวัตกรรมในสถานศึกษาเพื่อพัฒนาสถานศึกษา', sortNo: 2 },
    { code: '4.1', aspectCode: 'P4', nameTh: 'การสร้างและพัฒนาเครือข่ายเพื่อพัฒนาการเรียนรู้', sortNo: 1 },
    { code: '4.2', aspectCode: 'P4', nameTh: 'การจัดระบบการให้บริการในสถานศึกษา', sortNo: 2 },
    { code: '5.1', aspectCode: 'P5', nameTh: 'การพัฒนาตนเองและวิชาชีพ', sortNo: 1 },
    { code: '5.2', aspectCode: 'P5', nameTh: 'การนำความรู้ ทักษะ ที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้ในการพัฒนาการบริหารจัดการสถานศึกษา', sortNo: 2 },
  ];

  // ตัวชี้วัด PA ครู (15 ตัว) — ตาม ref3.pdf
  const teacherIndicators = [
    // T1: ด้านการจัดการเรียนรู้ (8 ตัว)
    { code: '1.1', aspectCode: 'T1', nameTh: 'สร้างและหรือพัฒนาหลักสูตร', sortNo: 1 },
    { code: '1.2', aspectCode: 'T1', nameTh: 'ออกแบบการจัดการเรียนรู้', sortNo: 2 },
    { code: '1.3', aspectCode: 'T1', nameTh: 'จัดกิจกรรมการเรียนรู้', sortNo: 3 },
    { code: '1.4', aspectCode: 'T1', nameTh: 'สร้างและหรือพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้', sortNo: 4 },
    { code: '1.5', aspectCode: 'T1', nameTh: 'วัดและประเมินผลการเรียนรู้', sortNo: 5 },
    { code: '1.6', aspectCode: 'T1', nameTh: 'ศึกษา วิเคราะห์ และสังเคราะห์ เพื่อแก้ไขปัญหาหรือพัฒนาการเรียนรู้', sortNo: 6 },
    { code: '1.7', aspectCode: 'T1', nameTh: 'จัดบรรยากาศที่ส่งเสริมและพัฒนาผู้เรียน', sortNo: 7 },
    { code: '1.8', aspectCode: 'T1', nameTh: 'อบรมและพัฒนาคุณลักษณะที่ดีของผู้เรียน', sortNo: 8 },
    // T2: ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้ (4 ตัว)
    { code: '2.1', aspectCode: 'T2', nameTh: 'จัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา', sortNo: 1 },
    { code: '2.2', aspectCode: 'T2', nameTh: 'ดำเนินการตามระบบดูแลช่วยเหลือผู้เรียน', sortNo: 2 },
    { code: '2.3', aspectCode: 'T2', nameTh: 'ปฏิบัติงานวิชาการ และงานอื่น ๆ ของสถานศึกษา', sortNo: 3 },
    { code: '2.4', aspectCode: 'T2', nameTh: 'ประสานความร่วมมือกับผู้ปกครอง ภาคีเครือข่าย และหรือสถานประกอบการ', sortNo: 4 },
    // T3: ด้านการพัฒนาตนเองและวิชาชีพ (3 ตัว)
    { code: '3.1', aspectCode: 'T3', nameTh: 'พัฒนาตนเองอย่างเป็นระบบและต่อเนื่อง', sortNo: 1 },
    { code: '3.2', aspectCode: 'T3', nameTh: 'มีส่วนร่วมและเป็นผู้นำในการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ', sortNo: 2 },
    { code: '3.3', aspectCode: 'T3', nameTh: 'นำความรู้ ความสามารถ ทักษะที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้ในการพัฒนาการจัดการเรียนรู้', sortNo: 3 },
  ];

  const indicators = [...principalIndicators, ...teacherIndicators];

  console.log('Creating PAIndicators...');
  for (const ind of indicators) {
    const aspect = await prisma.pAAspect.findUnique({
      where: { code: ind.aspectCode },
    });
    
    if (!aspect) {
      console.warn(`⚠️ Aspect ${ind.aspectCode} not found, skipping indicator ${ind.code}`);
      continue;
    }

    const indicator = await prisma.pAIndicator.upsert({
      where: { 
        aspectId_code: {
          aspectId: aspect.id,
          code: ind.code
        }
      },
      update: {
        nameTh: ind.nameTh,
        sortNo: ind.sortNo,
      },
      create: {
        aspectId: aspect.id,
        code: ind.code,
        nameTh: ind.nameTh,
        sortNo: ind.sortNo,
      },
    });

    // สร้างเกณฑ์คะแนน 1-4 สำหรับแต่ละตัวชี้วัด
    const scales = [
      { score: 1, labelTh: 'ปฏิบัติได้ต่ำกว่าระดับที่คาดหวังมาก' },
      { score: 2, labelTh: 'ปฏิบัติได้ต่ำกว่าระดับที่คาดหวัง' },
      { score: 3, labelTh: 'ปฏิบัติได้ตามระดับที่คาดหวัง' },
      { score: 4, labelTh: 'ปฏิบัติได้สูงกว่าระดับที่คาดหวัง' },
    ];

    for (const scale of scales) {
      await prisma.pAIndicatorScale.upsert({
        where: {
          indicatorId_score: {
            indicatorId: indicator.id,
            score: scale.score,
          }
        },
        update: { labelTh: scale.labelTh },
        create: {
          indicatorId: indicator.id,
          score: scale.score,
          labelTh: scale.labelTh,
        },
      });
    }
  }
  console.log(`✅ Created ${indicators.length} PAIndicators with scales\n`);

  // 3. สร้าง 3 ข้อพิจารณาในส่วนที่ 2
  const considerations = [
    { code: 'C1', nameTh: 'วิธีดำเนินการ', description: 'พิจารณาจากการดำเนินการที่ถูกต้อง ครบถ้วน เป็นไปตามระยะเวลาที่กำหนดไว้ในข้อตกลง และสะท้อนให้เห็นถึงระดับการปฏิบัติที่คาดหวังตามตำแหน่งและวิทยฐานะ', maxScore: 20, sortNo: 1 },
    { code: 'C2.1', nameTh: 'ผลลัพธ์การพัฒนา - เชิงปริมาณ', description: 'พิจารณาจากการบรรลุเป้าหมายเชิงปริมาณได้ครบถ้วนตามข้อตกลง และมีความถูกต้อง เชื่อถือได้', maxScore: 10, sortNo: 2 },
    { code: 'C2.2', nameTh: 'ผลลัพธ์การพัฒนา - เชิงคุณภาพ', description: 'พิจารณาจากการบรรลุเป้าหมายเชิงคุณภาพได้ครบถ้วน ถูกต้อง เชื่อถือได้ และปรากฏผลต่อคุณภาพผู้เรียน ครู และสถานศึกษา ได้ตามข้อตกลง', maxScore: 10, sortNo: 3 },
  ];

  console.log('Creating PAConsiderations...');
  for (const cons of considerations) {
    await prisma.pAConsideration.upsert({
      where: { code: cons.code },
      update: cons,
      create: cons,
    });
  }
  console.log('✅ Created 3 PAConsiderations\n');

  console.log('✨ PA seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding PA data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
