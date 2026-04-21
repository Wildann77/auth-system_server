import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';

export class SubscriptionService {
  async upgradeUserToPremium(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        tokenVersion: { increment: 1 },
      },
    });
  }
}

export const subscriptionService = new SubscriptionService();
