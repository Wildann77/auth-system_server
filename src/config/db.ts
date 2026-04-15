/**
 * Database Configuration
 * Prisma Client singleton for database connections
 */

import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaOptions: object = {
  log: isProduction
    ? ['error', 'warn']
    : ['query', 'error', 'warn', 'info'],
};

export const prisma =
  global.prisma ||
  new PrismaClient(prismaOptions);

if (!isProduction) {
  global.prisma = prisma;
}

/**
 * Graceful shutdown handler
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};

/**
 * Connect to database with retry logic
 */
export const connectDatabase = async (retries = 5): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

export default prisma;
