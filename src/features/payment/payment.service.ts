import Stripe from 'stripe';
import crypto from 'crypto';
import { paymentRepository } from './payment.repository';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { snap } from '@/lib/midtrans';
import { stripe } from '@/lib/stripe';
import { MidtransWebhookInput } from './payment.types';
import { BadRequestError, NotFoundError, ConflictError, AppError } from '@/shared/middleware/error-handler';
import { logger } from '@/shared/utils/logger';

export class PaymentService {

  async createPaymentSession(userId: string, amount: number, provider: 'midtrans' | 'stripe' = 'midtrans', orderType: 'GENERAL' | 'PREMIUM_UPGRADE' = 'GENERAL', items?: any) {
    // For premium upgrades, validate user and hardcode price
    if (orderType === 'PREMIUM_UPGRADE') {
      const user = await paymentRepository.findUserById(userId);
      if (!user) throw new NotFoundError('User not found');
      if (user.isPremium) throw new ConflictError('User is already premium');

      // Hardcode premium price (e.g., 50000 IDR)
      const premiumPrice = 50000;
      if (amount !== premiumPrice) throw new BadRequestError('Invalid premium upgrade amount');

      // Override amount with hardcoded price
      amount = premiumPrice;
    }

    if (provider === 'midtrans') {
      return this.createMidtransSession(userId, amount, orderType, items);
    } else {
      if (!stripe) throw new AppError('Stripe is not configured', 500, 'STRIPE_CONFIG_ERROR');
      return this.createStripeSession(userId, amount, orderType);
    }
  }

  private async createMidtransSession(userId: string, amount: number, orderType: 'GENERAL' | 'PREMIUM_UPGRADE', items?: any) {
    const order = await paymentRepository.createOrder({ userId, amount, orderType, items });
    try {
      const parameter = {
        transaction_details: { order_id: order.id, gross_amount: amount },
      };
      const transaction = await snap.createTransaction(parameter);
      await paymentRepository.updateOrderStatus(order.id, OrderStatus.PENDING, undefined, undefined, transaction.token, transaction.redirect_url);
      return { orderId: order.id, snapToken: transaction.token, snapUrl: transaction.redirect_url };
    } catch (error) {
      await paymentRepository.updateOrderStatus(order.id, OrderStatus.FAILED);
      throw error;
    }
  }

  private async createStripeSession(userId: string, amount: number, orderType: 'GENERAL' | 'PREMIUM_UPGRADE') {
    const order = await paymentRepository.createOrder({ userId, amount, orderType });
    try {
      const session = await stripe!.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'idr',
            product_data: { name: `Order ${order.id}` },
            unit_amount: amount * 100, // Stripe expects IDR in subunits (cents format)
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?order_id=${order.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?order_id=${order.id}`,
        metadata: { orderId: order.id },
      });

      await paymentRepository.updateOrderStatus(order.id, OrderStatus.PENDING, undefined, undefined, undefined, session.url || undefined, session.id);
      
      return { orderId: order.id, checkoutUrl: session.url };
    } catch (error) {
      await paymentRepository.updateOrderStatus(order.id, OrderStatus.FAILED);
      throw error;
    }
  }

  async handleMidtransWebhook(payload: MidtransWebhookInput, requestId?: string) {
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, payment_type } = payload;
    const serverKey = process.env.SERVER_KEY_MIDTRANS || '';
    const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex');

    if (hash !== signature_key) {
      throw new BadRequestError('Invalid signature');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const order = await paymentRepository.findOrderById(order_id, tx);
        if (!order) {
          throw new NotFoundError('Order not found');
        }

        let newStatus: OrderStatus = OrderStatus.PENDING;
        if (transaction_status === 'capture' || transaction_status === 'settlement') newStatus = OrderStatus.SUCCESS;
        else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') newStatus = OrderStatus.FAILED;

        const updatedOrder = await paymentRepository.updateOrderStatus(order.id, newStatus, transaction_id, payment_type, undefined, undefined, undefined, tx);

        // Handle premium upgrade
        if (newStatus === OrderStatus.SUCCESS && order.orderType === 'PREMIUM_UPGRADE') {
          await this.upgradeUserToPremium(order.userId, tx);
        }

        return updatedOrder;
      });
    } catch (error) {
      logger.error('Webhook processing transaction failed', {
        requestId,
        error: (error as Error).message,
        orderId: order_id,
        operation: 'webhook_processing'
      });
      throw error;
    }
  }

  async handleStripeWebhook(signature: string, payload: any, requestId?: string) {
    if (!stripe) throw new AppError('Stripe is not configured', 500, 'STRIPE_CONFIG_ERROR');
    const webhookSecret = process.env.WEBHOOK_SECRET_STRIPE || '';
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
            const updatedOrder = await paymentRepository.updateOrderStatus(orderId, OrderStatus.SUCCESS, session.payment_intent as string, 'stripe', undefined, undefined, undefined, tx);
            // Handle premium upgrade
            if (updatedOrder?.orderType === 'PREMIUM_UPGRADE') {
              await this.upgradeUserToPremium(updatedOrder.userId, tx);
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
        operation: 'stripe_webhook_processing'
      });
      throw error;
    }
  }

  private async upgradeUserToPremium(userId: string, tx?: Prisma.TransactionClient) {
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

export const paymentService = new PaymentService();

