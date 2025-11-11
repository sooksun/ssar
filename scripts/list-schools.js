const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const replacer = (_key, value) => (typeof value === 'bigint' ? value.toString() : value);
  try {
    const schools = await prisma.school.findMany();
    console.log(JSON.stringify(schools, replacer, 2));
  } catch (error) {
    console.error('Error fetching schools:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

