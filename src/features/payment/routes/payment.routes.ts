import { Router } from 'express';
import { paymentController } from '@/features/payment/controllers/payment.controller';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { paymentLimiter } from '@/shared/middleware/rate-limit';
import { checkoutSchema, midtransWebhookSchema } from '@/features/payment/schemas/payment.schema';

export const paymentRouter = Router();

paymentRouter.post('/checkout', authMiddleware, paymentLimiter, validateRequest(checkoutSchema), asyncHandler(paymentController.initializePayment));
paymentRouter.post('/webhook', validateRequest(midtransWebhookSchema), asyncHandler(paymentController.handleWebhook));
paymentRouter.post('/webhook-stripe', asyncHandler(paymentController.handleStripeWebhook));
