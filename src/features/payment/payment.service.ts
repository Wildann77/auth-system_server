import Stripe from 'stripe';
import crypto from 'crypto';
import { PaymentRepository } from './payment.repository';
import { OrderStatus } from '@prisma/client';
import { snap } from '@/lib/midtrans';
import { stripe } from '@/lib/stripe';
import { MidtransWebhookInput } from './payment.schema';

export class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  // ... (previous Midtrans logic kept implicitly if I use multi-replace or just replace block)
  // I will rewrite the whole class content for clarity in this block since it's cleaner for service logic.

  async createPaymentSession(userId: string, amount: number, provider: 'midtrans' | 'stripe' = 'midtrans', items?: any) {
    if (provider === 'midtrans') {
      return this.createMidtransSession(userId, amount, items);
    } else {
      return this.createStripeSession(userId, amount);
    }
  }

  private async createMidtransSession(userId: string, amount: number, items?: any) {
    const order = await this.paymentRepository.createOrder({ userId, amount, items });
    try {
      const parameter = {
        transaction_details: { order_id: order.id, gross_amount: amount },
      };
      const transaction = await snap.createTransaction(parameter);
      await this.paymentRepository.updateOrderStatus(order.id, OrderStatus.PENDING, undefined, undefined, transaction.token, transaction.redirect_url);
      return { orderId: order.id, snapToken: transaction.token, snapUrl: transaction.redirect_url };
    } catch (error) {
      await this.paymentRepository.updateOrderStatus(order.id, OrderStatus.FAILED);
      throw error;
    }
  }

  private async createStripeSession(userId: string, amount: number) {
    const order = await this.paymentRepository.createOrder({ userId, amount });
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'idr',
            product_data: { name: `Order ${order.id}` },
            unit_amount: amount, // Stripe uses smallest unit but IDR has no subunit in implementation usually? Actually Stripe IDR unit is 1.
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?order_id=${order.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?order_id=${order.id}`,
        metadata: { orderId: order.id },
      });

      await this.paymentRepository.updateOrderStatus(order.id, OrderStatus.PENDING, undefined, undefined, undefined, session.url || undefined, session.id);
      
      return { orderId: order.id, checkoutUrl: session.url };
    } catch (error) {
      await this.paymentRepository.updateOrderStatus(order.id, OrderStatus.FAILED);
      throw error;
    }
  }

  async handleMidtransWebhook(payload: MidtransWebhookInput) {
    // ... logic remains same ...
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, payment_type } = payload;
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex');
    if (hash !== signature_key) throw new Error('Invalid signature');
    const order = await this.paymentRepository.findOrderById(order_id);
    if (!order) throw new Error('Order not found');
    let newStatus: OrderStatus = OrderStatus.PENDING;
    if (transaction_status === 'capture' || transaction_status === 'settlement') newStatus = OrderStatus.SUCCESS;
    else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') newStatus = OrderStatus.FAILED;
    return this.paymentRepository.updateOrderStatus(order.id, newStatus, transaction_id, payment_type);
  }

  async handleStripeWebhook(signature: string, payload: any) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.paymentRepository.updateOrderStatus(orderId, OrderStatus.SUCCESS, session.payment_intent as string, 'stripe');
      }
    } else if (event.type === 'checkout.session.expired') {
       const session = event.data.object as Stripe.Checkout.Session;
       const orderId = session.metadata?.orderId;
       if (orderId) await this.paymentRepository.updateOrderStatus(orderId, OrderStatus.FAILED);
    }
  }
}
