/**
 * Payment Types
 * Type definitions for Payment feature
 */

export interface CheckoutInput {
  amount: number;
  provider?: 'midtrans' | 'stripe';
  orderType?: 'GENERAL' | 'PREMIUM_UPGRADE';
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface PaymentSession {
  orderId: string;
  snapToken?: string;
  snapUrl?: string;
  checkoutUrl?: string;
}

export interface Order {
  id: string;
  userId: string;
  amount: number;
  orderType: 'GENERAL' | 'PREMIUM_UPGRADE';
  items?: any;
  snapToken?: string;
  snapUrl?: string;
  paymentIntentId?: string;
  status: string;
  externalId?: string;
  paymentType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MidtransWebhookInput {
  transaction_status: string;
  order_id: string;
  payment_type?: string;
  gross_amount?: string;
  signature_key: string;
  status_code: string;
  transaction_id: string;
  [key: string]: any; // Allow other fields
}