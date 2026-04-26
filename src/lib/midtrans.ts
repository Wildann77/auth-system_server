import midtransClient from 'midtrans-client';
import { env } from '@/config';

export const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: env.SERVER_KEY_MIDTRANS,
  clientKey: env.CLIENT_KEY_MIDTRANS,
});
