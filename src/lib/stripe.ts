import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.SECRET_KEY_STRIPE || '';

export const stripe = stripeSecretKey && !stripeSecretKey.includes('your-stripe') 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
    })
  : null;
