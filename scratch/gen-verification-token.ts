import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_ACCESS_SECRET = "your-super-secret-access-token-key-min-32-chars";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'testuser@example.com' }
  });
  
  if (!user) {
    console.log("User not found");
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, type: 'verification' },
    JWT_ACCESS_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log(token);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
