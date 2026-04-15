import { sendEmail } from './src/lib/mail';

const testEmail = async () => {
  const result = await sendEmail({
    to: 'test@example.com',
    subject: 'Test Email - Mailtrap',
    html: '<h1>Test Email</h1><p>This is a test email from Mailtrap integration.</p>',
  });
  
  console.log('Email sent:', result);
  process.exit(result ? 0 : 1);
};

testEmail();