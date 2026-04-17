import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'testuser@example.com' }
  });
  
  if (!user || !user.twoFactorSecret) {
    console.log("User or secret not found");
    return;
  }

  const token = authenticator.generate(user.twoFactorSecret);
  console.log(token);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
