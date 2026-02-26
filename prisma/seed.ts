import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { EDU_LEVELS, INDICATORS, LevelCode, STANDARDS, SUB_INDICATORS } from './seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 เริ่มต้น seed ข้อมูล...');

  // 1. Roles — ระดับโรงเรียน: Teacher, School_director, School_admin | ระดับเขต: Area_head_office, Area_admin
  console.log('📝 สร้าง Roles...');
  const [
    adminRole,
    qaLeadRole,
    teacherRole,
    assessorRole,
    schoolDirectorRole,
    schoolAdminRole,
    areaHeadOfficeRole,
    areaAdminRole,
  ] = await Promise.all([
    prisma.role.upsert({ where: { code: 'ADMIN' }, update: {}, create: { code: 'ADMIN', name: 'ผู้ดูแลระบบ' } }),
    prisma.role.upsert({ where: { code: 'QA_LEAD' }, update: {}, create: { code: 'QA_LEAD', name: 'ผู้นำระบบ QA' } }),
    prisma.role.upsert({ where: { code: 'TEACHER' }, update: {}, create: { code: 'TEACHER', name: 'ครู (บันทึกข้อมูลโดยตรง)' } }),
    prisma.role.upsert({ where: { code: 'ASSESSOR' }, update: {}, create: { code: 'ASSESSOR', name: 'ผู้ประเมิน' } }),
    prisma.role.upsert({
      where: { code: 'SCHOOL_DIRECTOR' },
      update: {},
      create: { code: 'SCHOOL_DIRECTOR', name: 'ผู้อำนวยการโรงเรียน (จัดทำรายงานจากข้อมูลครู)' },
    }),
    prisma.role.upsert({
      where: { code: 'SCHOOL_ADMIN' },
      update: {},
      create: { code: 'SCHOOL_ADMIN', name: 'ผู้ดูแลระบบระดับโรงเรียน' },
    }),
    prisma.role.upsert({
      where: { code: 'AREA_HEAD_OFFICE' },
      update: {},
      create: { code: 'AREA_HEAD_OFFICE', name: 'ผู้อำนวยการเขตพื้นที่การศึกษา' },
    }),
    prisma.role.upsert({
      where: { code: 'AREA_ADMIN' },
      update: {},
      create: { code: 'AREA_ADMIN', name: 'ผู้ดูแลระบบระดับเขตพื้นที่' },
    }),
  ]);
  console.log('✅ สร้าง Roles สำเร็จ');

  // 2. EduLevels + QA Standards/Indicators/SubIndicators
  console.log('📝 สร้าง EduLevels...');
  const levelRecords = await Promise.all(
    EDU_LEVELS.map((level) =>
      prisma.eduLevel.upsert({
        where: { code: level.code },
        update: { nameTh: level.nameTh },
        create: { code: level.code, nameTh: level.nameTh },
      })
    )
  );
  const levelMap = new Map<LevelCode, number>();
  for (const record of levelRecords) {
    levelMap.set(record.code as LevelCode, record.id);
  }
  console.log(`✅ สร้าง EduLevels สำเร็จ (${levelRecords.length} รายการ)`);

  console.log('📝 สร้าง QAStandards...');
  const standardMap = new Map<string, bigint>();
  let standardCount = 0;
  for (const standard of STANDARDS) {
    const levelId = levelMap.get(standard.levelCode);
    if (!levelId) {
      console.warn(`⚠️ ไม่พบระดับการศึกษาสำหรับมาตรฐาน ${standard.levelCode} ${standard.code}`);
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
    standardCount += 1;
  }
  console.log(`✅ สร้าง QAStandards สำเร็จ (${standardCount} รายการ)`);

  console.log('📝 สร้าง QAIndicators...');
  const indicatorMap = new Map<string, bigint>();
  let indicatorCount = 0;
  for (const indicator of INDICATORS) {
    const standardId = standardMap.get(`${indicator.levelCode}:${indicator.standardCode}`);
    if (!standardId) {
      console.warn(`⚠️ ไม่พบมาตรฐานสำหรับตัวชี้วัด ${indicator.levelCode} ${indicator.standardCode}-${indicator.code}`);
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
    indicatorCount += 1;
  }
  console.log(`✅ สร้าง QAIndicators สำเร็จ (${indicatorCount} รายการ)`);

  console.log('📝 สร้าง QASubIndicators...');
  let subIndicatorCount = 0;
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
    subIndicatorCount += 1;
  }
  console.log(`✅ สร้าง QASubIndicators สำเร็จ (${subIndicatorCount} รายการ)`);

  // 5.5 สำนักงานเขตพื้นที่การศึกษา (รองรับหลายสังกัด สพฐ.)
  console.log('📝 สร้าง EducationServiceArea...');
  const demoArea = await prisma.educationServiceArea.upsert({
    where: { code: 'กทม.1' },
    update: { nameTh: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษากรุงเทพมหานคร เขต 1', province: 'กรุงเทพมหานคร' },
    create: {
      code: 'กทม.1',
      nameTh: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษากรุงเทพมหานคร เขต 1',
      province: 'กรุงเทพมหานคร',
      sortNo: 1,
    },
  });
  console.log('✅ สร้าง EducationServiceArea สำเร็จ');

  // 6. Demo School (ผูกเขตพื้นที่)
  console.log('📝 สร้าง Demo School...');
  const demoSchool = await prisma.school.upsert({
    where: { id: BigInt(1) },
    update: {
      sc_id: BigInt(10001),
      name: 'โรงเรียนตัวอย่าง',
      areaId: demoArea.id,
      area_name: 'กรุงเทพมหานคร',
      province: 'กรุงเทพมหานคร',
      level_type: 'BASIC',
    },
    create: {
      id: BigInt(1),
      sc_id: BigInt(10001),
      name: 'โรงเรียนตัวอย่าง',
      areaId: demoArea.id,
      area_name: 'กรุงเทพมหานคร',
      province: 'กรุงเทพมหานคร',
      level_type: 'BASIC',
    },
  });
  console.log('✅ สร้าง Demo School สำเร็จ');

  // 7. Admin User
  console.log('📝 สร้าง Admin User...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      fullName: 'ผู้ดูแลระบบ',
      password: hashedPassword,
      schoolId: demoSchool.sc_id,
    },
    create: {
      fullName: 'ผู้ดูแลระบบ',
      email: 'admin@example.com',
      password: hashedPassword,
      phone: '0812345678',
      schoolId: demoSchool.sc_id,
    },
  });
  console.log('✅ สร้าง Admin User สำเร็จ');

  // 7.1 Demo Users สำหรับแต่ละบทบาท (Teacher / School director / School admin / Area)
  console.log('📝 สร้าง Demo Users...');
  const demoUsers = [
    {
      fullName: 'ครูฝ่ายประกันคุณภาพ',
      email: 'qalead@example.com',
      password: 'qalead123',
      phone: '0890000001',
      roleId: qaLeadRole.id,
      roleLabel: 'QA_LEAD',
      scope: 'school' as const,
    },
    {
      fullName: 'ครูผู้จัดทำหลักฐาน',
      email: 'teacher@example.com',
      password: 'teacher123',
      phone: '0890000002',
      roleId: teacherRole.id,
      roleLabel: 'TEACHER',
      scope: 'school' as const,
    },
    {
      fullName: 'ผู้ประเมินภายนอก',
      email: 'assessor@example.com',
      password: 'assessor123',
      phone: '0890000003',
      roleId: assessorRole.id,
      roleLabel: 'ASSESSOR',
      scope: 'school' as const,
    },
    {
      fullName: 'ผู้อำนวยการโรงเรียนตัวอย่าง',
      email: 'director@example.com',
      password: 'director123',
      phone: '0890000004',
      roleId: schoolDirectorRole.id,
      roleLabel: 'SCHOOL_DIRECTOR',
      scope: 'school' as const,
    },
    {
      fullName: 'ผู้ดูแลระบบเขตพื้นที่',
      email: 'areaadmin@example.com',
      password: 'areaadmin123',
      phone: '0890000005',
      roleId: areaAdminRole.id,
      roleLabel: 'AREA_ADMIN',
      scope: 'area' as const,
    },
  ];

  const demoCredentials: Array<{ email: string; password: string; role: string }> = [
    { email: 'admin@example.com', password: 'admin123', role: 'ADMIN' },
  ];

  for (const demo of demoUsers) {
    const hashedPassword = await bcrypt.hash(demo.password, 10);
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        fullName: demo.fullName,
        password: hashedPassword,
        phone: demo.phone,
        schoolId: demo.scope === 'school' ? demoSchool.sc_id : undefined,
      },
      create: {
        fullName: demo.fullName,
        email: demo.email,
        password: hashedPassword,
        phone: demo.phone,
        schoolId: demo.scope === 'school' ? demoSchool.sc_id : undefined,
      },
    });

    if (demo.scope === 'school') {
      const existingRole = await prisma.userSchoolRole.findFirst({
        where: { userId: user.id, schoolId: demoSchool.sc_id },
      });
      if (!existingRole) {
        await prisma.userSchoolRole.create({
          data: { userId: user.id, schoolId: demoSchool.sc_id, roleId: demo.roleId, isActive: true },
        });
      } else {
        await prisma.userSchoolRole.update({
          where: { id: existingRole.id },
          data: { roleId: demo.roleId, isActive: true },
        });
      }
    } else {
      // ระดับเขตพื้นที่: UserAreaRole
      const existingAreaRole = await prisma.userAreaRole.findFirst({
        where: { userId: user.id, areaId: demoArea.id },
      });
      if (!existingAreaRole) {
        await prisma.userAreaRole.create({
          data: { userId: user.id, areaId: demoArea.id, roleId: demo.roleId, isActive: true },
        });
      } else {
        await prisma.userAreaRole.update({
          where: { id: existingAreaRole.id },
          data: { roleId: demo.roleId, isActive: true },
        });
      }
    }

    demoCredentials.push({
      email: demo.email,
      password: demo.password,
      role: demo.roleLabel,
    });
  }
  console.log('✅ สร้าง Demo Users สำเร็จ');

  // 8. UserSchoolRole (เชื่อม admin user กับ demo school และ admin role)
  console.log('📝 สร้าง UserSchoolRole...');
  // ตรวจสอบว่ามีอยู่แล้วหรือไม่
  const existingUserSchoolRole = await prisma.userSchoolRole.findFirst({
    where: {
      userId: adminUser.id,
      schoolId: demoSchool.sc_id,
    },
  });

  if (!existingUserSchoolRole) {
    await prisma.userSchoolRole.create({
      data: {
        userId: adminUser.id,
        schoolId: demoSchool.sc_id,
        roleId: adminRole.id,
        isActive: true,
      },
    });
  } else {
    await prisma.userSchoolRole.update({
      where: { id: existingUserSchoolRole.id },
      data: {
        roleId: adminRole.id,
        isActive: true,
      },
    });
  }
  console.log('✅ สร้าง UserSchoolRole สำเร็จ');

  console.log('\n✅ Seed ข้อมูลสำเร็จทั้งหมด!');
  console.log('\n📋 สรุปข้อมูลที่สร้าง:');
  console.log(`   - Roles: 8 roles (รวม SCHOOL_DIRECTOR, SCHOOL_ADMIN, AREA_HEAD_OFFICE, AREA_ADMIN)`);
  console.log(`   - EduLevels: ${levelRecords.length} levels`);
  console.log(`   - QAStandards: ${standardCount} standards`);
  console.log(`   - QAIndicators: ${indicatorCount} indicators`);
  console.log(`   - QASubIndicators: ${subIndicatorCount} sub-indicators`);
  console.log(`   - Schools: 1 school`);
  console.log(`   - Users: ${demoCredentials.length} users`);
  console.log(`\n🔑 Login credentials:`);
  for (const cred of demoCredentials) {
    console.log(`   [${cred.role}] ${cred.email} / ${cred.password}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการ seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

