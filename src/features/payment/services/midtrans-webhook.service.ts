import crypto from 'crypto';
import { prisma } from '@/config/db';
import { paymentRepository } from '@/features/payment/repositories/payment.repository';
import { OrderStatus } from '@prisma/client';
import { MidtransWebhookInput } from '@/features/payment/types/payment.types';
import { BadRequestError, NotFoundError } from '@/shared/middleware/error-handler';
import { logger } from '@/shared/utils/logger';
import { subscriptionService } from './subscription.service';

export class MidtransWebhookService {
  async handleWebhook(payload: MidtransWebhookInput, requestId?: string) {
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
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
          newStatus = OrderStatus.SUCCESS;
        } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
          newStatus = OrderStatus.FAILED;
        }

        const updatedOrder = await paymentRepository.updateOrderStatus(order.id, newStatus, transaction_id, payment_type, undefined, undefined, undefined, tx);

        if (newStatus === OrderStatus.SUCCESS && order.orderType === 'PREMIUM_UPGRADE') {
          await subscriptionService.upgradeUserToPremium(order.userId, tx);
        }

        return updatedOrder;
      });
    } catch (error) {
      logger.error('Midtrans webhook processing failed', {
        requestId,
        error: (error as Error).message,
        orderId: order_id,
        operation: 'midtrans_webhook_processing',
      });
      throw error;
    }
  }
}

export const midtransWebhookService = new MidtransWebhookService();
