const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        schoolRoles: {
          include: {
            school: true,
            role: true,
          },
        },
      },
    });
    const replacer = (_key, value) => (typeof value === 'bigint' ? value.toString() : value);
    console.log(JSON.stringify(user, replacer, 2));
  } catch (error) {
    console.error('Error fetching user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

