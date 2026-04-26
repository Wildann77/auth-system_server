import Stripe from 'stripe';
import { env } from '@/config';

const stripeSecretKey = env.SECRET_KEY_STRIPE;

export const stripe = stripeSecretKey && !stripeSecretKey.includes('your-stripe') 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
    })
  : null;
