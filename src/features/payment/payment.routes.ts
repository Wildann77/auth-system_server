import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { paymentLimiter } from '@/shared/middleware/rate-limit';
import { checkoutSchema, midtransWebhookSchema } from './payment.schema';

export const paymentRouter = Router();

// Checkout - Protected
paymentRouter.post(
  '/checkout',
  authMiddleware,
  paymentLimiter,
  validateRequest(checkoutSchema),
  asyncHandler(paymentController.initializePayment)
);

// Webhook - Midtrans
paymentRouter.post(
  '/webhook',
  validateRequest(midtransWebhookSchema),
  asyncHandler(paymentController.handleWebhook)
);

// Webhook - Stripe
paymentRouter.post(
  '/webhook-stripe',
  asyncHandler(paymentController.handleStripeWebhook)
);
