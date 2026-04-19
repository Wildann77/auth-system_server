import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { validateRequest } from '@/shared/middleware/validate-request';
import { checkoutSchema, midtransWebhookSchema } from './payment.schema';

const router = Router();
const repository = new PaymentRepository();
const service = new PaymentService(repository);
const controller = new PaymentController(service);

// Checkout - Protected
router.post(
  '/checkout',
  authMiddleware,
  validateRequest(checkoutSchema),
  controller.initializePayment
);

// Webhook - Midtrans
router.post(
  '/webhook',
  validateRequest(midtransWebhookSchema),
  controller.handleWebhook
);

// Webhook - Stripe
router.post(
  '/webhook-stripe',
  controller.handleStripeWebhook
);

export default router;
