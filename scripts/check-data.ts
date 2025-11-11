import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('=== ตรวจสอบข้อมูลใน Database ===\n');

  // Users
  const users = await prisma.user.findMany();
  console.log(`📋 Users: ${users.length} รายการ`);
  users.forEach((u) => {
    console.log(`   - ${u.email} (${u.fullName})`);
  });

  // Schools
  const schools = await prisma.school.findMany();
  console.log(`\n📋 Schools: ${schools.length} รายการ`);
  schools.forEach((s) => {
    console.log(`   - ${s.name} (ID: ${s.id})`);
  });

  // Roles
  const roles = await prisma.role.findMany();
  console.log(`\n📋 Roles: ${roles.length} รายการ`);
  roles.forEach((r) => {
    console.log(`   - ${r.code}: ${r.name}`);
  });

  // EduLevels
  const levels = await prisma.eduLevel.findMany();
  console.log(`\n📋 EduLevels: ${levels.length} รายการ`);
  levels.forEach((l) => {
    console.log(`   - ${l.code}: ${l.nameTh}`);
  });

  // QAStandards
  const standards = await prisma.qAStandard.findMany();
  console.log(`\n📋 QAStandards: ${standards.length} รายการ`);

  // QAIndicators
  const indicators = await prisma.qAIndicator.findMany();
  console.log(`\n📋 QAIndicators: ${indicators.length} รายการ`);

  // UserSchoolRole
  const userSchoolRoles = await prisma.userSchoolRole.findMany({
    include: {
      user: true,
      school: true,
      role: true,
    },
  });
  console.log(`\n📋 UserSchoolRoles: ${userSchoolRoles.length} รายการ`);
  userSchoolRoles.forEach((usr) => {
    console.log(
      `   - ${usr.user.email} → ${usr.school.name} (${usr.role.code})`
    );
  });

  console.log('\n✅ ตรวจสอบข้อมูลเสร็จสิ้น');
}

checkData()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

