import { prisma } from '@/config/db';
import { paymentRepository } from '@/features/payment/repositories/payment.repository';
import { OrderStatus, Prisma } from '@prisma/client';
import { snap } from '@/lib/midtrans';
import { stripe } from '@/lib/stripe';
import { NotFoundError, ConflictError, BadRequestError, AppError } from '@/shared/middleware/error-handler';

export class CheckoutService {
  async createPaymentSession(
    userId: string,
    amount: number,
    provider: 'midtrans' | 'stripe' = 'midtrans',
    orderType: 'GENERAL' | 'PREMIUM_UPGRADE' = 'GENERAL',
    items?: any
  ) {
    if (orderType === 'PREMIUM_UPGRADE') {
      const user = await paymentRepository.findUserById(userId);
      if (!user) throw new NotFoundError('User not found');
      if (user.isPremium) throw new ConflictError('User is already premium');

      const premiumPrice = 50000;
      if (amount !== premiumPrice) throw new BadRequestError('Invalid premium upgrade amount');
      amount = premiumPrice;
    }

    if (provider === 'midtrans') {
      return this.createMidtransSession(userId, amount, orderType, items);
    } else {
      if (!stripe) throw new AppError('Stripe is not configured', 500, 'STRIPE_CONFIG_ERROR');
      return this.createStripeSession(userId, amount, orderType);
    }
  }

  private async createMidtransSession(
    userId: string,
    amount: number,
    orderType: 'GENERAL' | 'PREMIUM_UPGRADE',
    items?: any
  ) {
    const order = await paymentRepository.createOrder({ userId, amount, orderType, items });
    try {
      const parameter = { transaction_details: { order_id: order.id, gross_amount: amount } };
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
            unit_amount: amount * 100,
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
}

export const checkoutService = new CheckoutService();
