import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { CheckoutInput, MidtransWebhookInput } from './payment.types';

export class PaymentController {

  async initializePayment(
    req: Request<{}, {}, CheckoutInput>,
    res: Response
  ): Promise<void> {
    const { amount, provider, orderType, items } = req.body;
    const userId = req.user!.id;

    const session = await paymentService.createPaymentSession(userId, amount, provider, orderType, items);

    res.status(200).apiSuccess(session, 'Payment session created successfully');
  }

  async handleWebhook(
    req: Request<{}, {}, MidtransWebhookInput>,
    res: Response
  ): Promise<void> {
    await paymentService.handleMidtransWebhook(req.body, req.requestId);

    res.status(200).apiSuccess(null, 'Webhook processed successfully');
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    await paymentService.handleStripeWebhook(sig, req.body, req.requestId);

    res.status(200).apiSuccess(null, 'Stripe webhook received');
  }
}

export const paymentController = new PaymentController();
