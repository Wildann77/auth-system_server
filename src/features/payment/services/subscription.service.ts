import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { paymentRepository } from '@/features/payment/repositories/payment.repository';
import { userRepository } from '@/features/user/repositories/user.repository';
import { BadRequestError, NotFoundError } from '@/shared/middleware/error-handler';
import { stripe } from '@/lib/stripe';

export class SubscriptionService {
  async upgradeUserToPremium(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const premiumDurationDays = 30; // 30 days
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + premiumDurationDays);

    await db.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        autoRenew: true,
        premiumUntil,
      },
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (!user.isPremium) throw new BadRequestError('User is not currently premium');
    if (!user.autoRenew) throw new BadRequestError('Subscription is already cancelled');

    const latestOrder = await paymentRepository.findLatestPremiumOrder(userId);

    // If the order has an externalId indicating a real subscription, attempt to cancel it at the gateway.
    if (latestOrder && latestOrder.externalId) {
      try {
        if (latestOrder.paymentType === 'stripe' && stripe) {
          // Assuming externalId might hold a subscription ID in the future
          if (latestOrder.externalId.startsWith('sub_')) {
            await stripe.subscriptions.update(latestOrder.externalId, {
              cancel_at_period_end: true,
            });
          }
        } else if (latestOrder.paymentType === 'midtrans') {
          // Midtrans cancellation logic (if subscription API is used)
          // For one-off payments, this is not needed, but included for future-proofing
        }
      } catch (error) {
        console.error('Failed to cancel subscription at gateway:', error);
        // Continue to cancel locally even if gateway fails
      }
    }

    // Update local database to not renew
    await userRepository.setAutoRenewStatus(userId, false);
  }
}

export const subscriptionService = new SubscriptionService();
