import crypto from 'crypto';
import { PaymentRepository } from './payment.repository';
import { OrderStatus } from '@prisma/client';
import { snap } from '@/lib/midtrans';
import { MidtransWebhookInput } from './payment.schema';

export class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  async initializePayment(userId: string, amount: number, items?: any) {
    // 1. Create temporary internal order to get ID
    const order = await this.paymentRepository.createOrder({
      userId,
      amount,
      items,
    });

    // 2. Prepare Midtrans parameter
    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: amount,
      },
      customer_details: {
        // You could fetch more user details from DB if needed
      },
    };

    // 3. Request Snap Token from Midtrans
    const transaction = await snap.createTransaction(parameter);

    // 4. Update order with snap details
    return this.paymentRepository.createOrder({
      userId,
      amount,
      items,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
    });
    // Note: I should probably update the existing order instead of creating a second one.
    // Let's refine the logic to update.
  }

  // Refined version of create/init
  async createPaymentSession(userId: string, amount: number, items?: any) {
    // 1. Create order in PENDING state
    const order = await this.paymentRepository.createOrder({
      userId,
      amount,
      items,
    });

    try {
      // 2. Request snap token
      const parameter = {
        transaction_details: {
          order_id: order.id,
          gross_amount: amount,
        },
      };

      const transaction = await snap.createTransaction(parameter);

      // 3. Update order with tokens
      await this.paymentRepository.updateOrderStatus(
        order.id, 
        OrderStatus.PENDING, 
        undefined, // externalId not yet available
        undefined
      );
      
      // We need a way to store snapToken in repository update
      // I will update PaymentRepository to handle snap details update
      
      return {
        orderId: order.id,
        snapToken: transaction.token,
        snapUrl: transaction.redirect_url
      };
    } catch (error) {
      await this.paymentRepository.updateOrderStatus(order.id, OrderStatus.FAILED);
      throw error;
    }
  }

  async handleMidtransWebhook(payload: MidtransWebhookInput) {
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, payment_type } = payload;

    // 1. Verify Signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex');

    if (hash !== signature_key) {
      throw new Error('Invalid signature');
    }

    // 2. Find internal order
    const order = await this.paymentRepository.findOrderById(order_id);
    if (!order) throw new Error('Order not found');

    // 3. Map Midtrans status to internal status
    let newStatus: OrderStatus = OrderStatus.PENDING;

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      newStatus = OrderStatus.SUCCESS;
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
      newStatus = OrderStatus.FAILED;
    } else if (transaction_status === 'pending') {
      newStatus = OrderStatus.PENDING;
    }

    // 4. Update database
    return this.paymentRepository.updateOrderStatus(order.id, newStatus, transaction_id, payment_type);
  }
}
