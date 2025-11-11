import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 กำลังทดสอบการเชื่อมต่อฐานข้อมูล...');
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('📊 DATABASE_URL:', maskedUrl);

    // ทดสอบการเชื่อมต่อ
    await prisma.$connect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ!');

    // ทดสอบ query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test สำเร็จ:', result);

    // ตรวจสอบตารางที่มีอยู่
    const tables = await prisma.$queryRaw<Array<{ Tables_in_qa_external: string }>>`
      SHOW TABLES
    `;
    console.log('📋 ตารางที่มีในฐานข้อมูล:');
    tables.forEach((table) => {
      console.log(`   - ${table.Tables_in_qa_external}`);
    });

    console.log('\n✅ การทดสอบการเชื่อมต่อสำเร็จทั้งหมด!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

