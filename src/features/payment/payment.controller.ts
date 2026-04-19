import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CheckoutInput, MidtransWebhookInput } from './payment.schema';

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  initializePayment = async (
    req: Request<{}, {}, CheckoutInput>,
    res: Response
  ) => {
    const { amount, provider, orderType, items } = req.body;
    const userId = req.user!.id;

    const session = await this.paymentService.createPaymentSession(userId, amount, provider, orderType, items);

    return res.status(200).json({
      status: 'success',
      data: session
    });
  };

  handleWebhook = async (
    req: Request<{}, {}, MidtransWebhookInput>,
    res: Response
  ) => {
    await this.paymentService.handleMidtransWebhook(req.body);

    return res.status(200).json({
      status: 'success',
      message: 'OK'
    });
  };

  handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    await this.paymentService.handleStripeWebhook(sig, req.body);

    return res.status(200).json({ received: true });
  };
}
