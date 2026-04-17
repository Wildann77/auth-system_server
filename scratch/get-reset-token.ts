import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.passwordResetToken.findFirst({
    include: { user: true },
    where: { user: { email: 'testuser@example.com' } }
  });
  console.log(JSON.stringify(token));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
