import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CheckoutInput, MidtransWebhookInput } from './payment.schema';

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  initializePayment = async (
    req: Request<{}, {}, CheckoutInput>,
    res: Response
  ) => {
    const { amount, items } = req.body;
    const userId = req.user!.id;

    const session = await this.paymentService.createPaymentSession(userId, amount, items);

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
}
