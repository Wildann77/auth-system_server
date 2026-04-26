import { prisma } from '@/config/db';
import { paymentRepository } from '@/features/payment/repositories/payment.repository';
import { OrderStatus } from '@prisma/client';
import { stripe } from '@/lib/stripe';
import { BadRequestError, AppError } from '@/shared/middleware/error-handler';
import { logger } from '@/shared/utils/logger';
import { env } from '@/config';
import { subscriptionService } from './subscription.service';

export class StripeWebhookService {
  async handleWebhook(signature: string, payload: any, requestId?: string) {
    if (!stripe) throw new AppError('Stripe is not configured', 500, 'STRIPE_CONFIG_ERROR');
    const webhookSecret = env.WEBHOOK_SECRET_STRIPE;
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestError(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.$transaction(async (tx) => {
            const updatedOrder = await paymentRepository.updateOrderStatus(
              orderId,
              OrderStatus.SUCCESS,
              session.payment_intent as string,
              'stripe',
              undefined,
              undefined,
              undefined,
              tx
            );
            if (updatedOrder?.orderType === 'PREMIUM_UPGRADE') {
              await subscriptionService.upgradeUserToPremium(updatedOrder.userId, tx);
            }
          });
        }
      } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object as any;
        const orderId = session.metadata?.orderId;
        if (orderId) await paymentRepository.updateOrderStatus(orderId, OrderStatus.FAILED);
      }
    } catch (error) {
      logger.error('Stripe webhook processing failed', {
        requestId,
        error: (error as Error).message,
        operation: 'stripe_webhook_processing',
      });
      throw error;
    }
  }
}

export const stripeWebhookService = new StripeWebhookService();
