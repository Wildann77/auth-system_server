import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    provider: z.enum(['midtrans', 'stripe']).default('midtrans'),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive()
    })).optional(),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>['body'];

// Webhook schema for Midtrans (General structure)
export const midtransWebhookSchema = z.object({
  body: z.object({
    transaction_status: z.string(),
    order_id: z.string(),
    payment_type: z.string().optional(),
    gross_amount: z.string().optional(),
    signature_key: z.string(),
    status_code: z.string(),
    transaction_id: z.string(),
  }).passthrough(), // Allow other fields from Midtrans
});

export type MidtransWebhookInput = z.infer<typeof midtransWebhookSchema>['body'];
