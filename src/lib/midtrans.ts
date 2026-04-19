import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.SERVER_KEY_MIDTRANS || '',
  clientKey: process.env.CLIENT_KEY_MIDTRANS || '',
});
