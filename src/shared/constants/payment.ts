/**
 * Payment Constants
 */

export const ORDER_TYPE = {
  GENERAL: 'GENERAL',
  PREMIUM_UPGRADE: 'PREMIUM_UPGRADE',
} as const;

export const PAYMENT_PROVIDER = {
  MIDTRANS: 'midtrans',
  STRIPE: 'stripe',
} as const;

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export const FINANCIALS = {
  PREMIUM_UPGRADE_PRICE: 99000,
  CURRENCY: 'IDR',
  PREMIUM_ITEM_ID: 'premium-monthly',
  PREMIUM_ITEM_NAME: 'Premium Monthly',
} as const;

export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
export type PaymentProvider = typeof PAYMENT_PROVIDER[keyof typeof PAYMENT_PROVIDER];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
