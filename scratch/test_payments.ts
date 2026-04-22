import { snap } from './src/lib/midtrans';
import { stripe } from './src/lib/stripe';
import * as dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from parent dir
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnections() {
  console.log('--- Payment Connection Test ---');
  
  console.log('1. Testing Midtrans Configuration...');
  if (process.env.SERVER_KEY_MIDTRANS) {
    console.log('   Midtrans Server Key found.');
    console.log('   Client Key:', process.env.CLIENT_KEY_MIDTRANS);
  } else {
    console.log('   Midtrans Server Key MISSING.');
  }

  console.log('\n2. Testing Stripe Connection...');
  if (!stripe) {
    console.log('   Stripe NOT initialized. Check SECRET_KEY_STRIPE.');
  } else {
    try {
      const balance = await stripe.balance.retrieve();
      console.log('   Stripe Connected Successfully!');
      console.log('   Available Currencies:', balance.available.map(b => b.currency).join(', '));
    } catch (err: any) {
      console.log('   Stripe Connection FAILED:', err.message);
    }
  }
}

testConnections();
