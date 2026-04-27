import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to fix null premiumUntil for premium users...');
  
  const users = await prisma.user.findMany({
    where: {
      isPremium: true,
      premiumUntil: null
    }
  });

  console.log(`Found ${users.length} users to update.`);

  for (const user of users) {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30); // Beri 30 hari dari sekarang

    await prisma.user.update({
      where: { id: user.id },
      data: {
        premiumUntil: defaultExpiration,
        autoRenew: true
      }
    });
    console.log(`Updated user ${user.email} with expiration ${defaultExpiration.toISOString()}`);
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
