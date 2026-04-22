import { Request, Response } from 'express';
import { checkoutService } from '@/features/payment/services/checkout.service';
import { midtransWebhookService } from '@/features/payment/services/midtrans-webhook.service';
import { stripeWebhookService } from '@/features/payment/services/stripe-webhook.service';
import { CheckoutInput, MidtransWebhookInput } from '@/features/payment/types/payment.types';

export class PaymentController {
  async initializePayment(req: Request<{}, {}, CheckoutInput>, res: Response): Promise<void> {
    const { amount, provider, orderType, items } = req.body;
    const userId = req.user!.id;

    const session = await checkoutService.createPaymentSession(userId, amount, provider, orderType, items);

    res.status(200).apiSuccess(session, 'Payment session created successfully');
  }

  async handleWebhook(req: Request<{}, {}, MidtransWebhookInput>, res: Response): Promise<void> {
    await midtransWebhookService.handleWebhook(req.body, req.requestId);
    res.status(200).apiSuccess(null, 'Webhook processed successfully');
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    await stripeWebhookService.handleWebhook(sig, (req as any).rawBody, req.requestId);
    res.status(200).apiSuccess(null, 'Stripe webhook received');
  }

  async simulateSuccess(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).apiError('Not allowed in production');
      return;
    }

    const { orderId } = req.body;
    const { paymentRepository } = await import('@/features/payment/repositories/payment.repository');
    const { subscriptionService } = await import('@/features/payment/services/subscription.service');
    const { OrderStatus } = await import('@prisma/client');

    const order = await paymentRepository.findOrderById(orderId);
    if (!order) {
      res.status(404).apiError('Order not found');
      return;
    }

    await paymentRepository.updateOrderStatus(orderId, OrderStatus.SUCCESS, 'SIMULATED_SUCCESS', 'SIMULATOR');
    
    if (order.orderType === 'PREMIUM_UPGRADE') {
      await subscriptionService.upgradeUserToPremium(order.userId);
    }

    res.status(200).apiSuccess(null, 'Payment simulated successfully. User upgraded if applicable.');
  }
}

export const paymentController = new PaymentController();
