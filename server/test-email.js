import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTransporter, verifyEmailConnection } from './services/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env or server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.SMTP_HOST || 'mock';
const port = process.env.SMTP_PORT || '587';
const user = process.env.SMTP_USER || '(not set)';
const pass = process.env.SMTP_PASS ? '********' : '(not set)';
const from = process.env.MAIL_FROM || '(not set)';

console.log('='.repeat(60));
console.log('📧 SMTP Email Configuration Diagnostic');
console.log('='.repeat(60));
console.log(`SMTP_HOST : ${host}`);
console.log(`SMTP_PORT : ${port}`);
console.log(`SMTP_USER : ${user}`);
console.log(`SMTP_PASS : ${pass}`);
console.log(`MAIL_FROM : ${from}`);
console.log('='.repeat(60));

if (host === 'mock' || host === 'test' || !process.env.SMTP_HOST) {
  console.log('ℹ️  Current mode is MOCK. Emails will be logged to console.');
  console.log('To send real emails via Gmail, update your .env file:');
  console.log('  SMTP_HOST=smtp.gmail.com');
  console.log('  SMTP_PORT=465');
  console.log('  SMTP_USER=your_gmail@gmail.com');
  console.log('  SMTP_PASS=your_16_digit_app_password');
  console.log('  MAIL_FROM="Q&A Sessions" <your_gmail@gmail.com>');
  process.exit(0);
}

console.log('🔄 Testing SMTP connection with mail server...');

try {
  const result = await verifyEmailConnection();
  console.log('✅ Connection Successful!');
  console.log(result.message);

  const recipient = process.argv[2];
  if (recipient) {
    console.log(`\n📨 Attempting to send test email to: ${recipient}...`);
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: '✅ Q&A App - SMTP Test Email',
      text: 'Congratulations! Your SMTP configuration is working properly with the Q&A App.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
          <h2 style="color: #059669;">✅ Email Configuration Working!</h2>
          <p>This is a test email sent from your <strong>Q&A App</strong> using your configured SMTP provider (<strong>${host}</strong>).</p>
          <p style="color: #6b7280; font-size: 13px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });
    console.log(`🎉 Test email sent successfully! Message ID: ${info.messageId}`);
  } else {
    console.log('\n💡 Tip: To send a real test email, pass an email address:');
    console.log('   node server/test-email.js recipient@example.com');
  }
} catch (err) {
  console.error('\n❌ SMTP Connection Failed:');
  console.error(err.message);

  if (host.includes('gmail')) {
    console.log('\n🔍 Gmail Troubleshooting Tips:');
    console.log('1. Make sure "2-Step Verification" is enabled on your Google Account:');
    console.log('   https://myaccount.google.com/security');
    console.log('2. Generate a dedicated 16-character "App Password":');
    console.log('   https://myaccount.google.com/apppasswords');
    console.log('3. Put the 16-character App Password in SMTP_PASS (do NOT use your standard Gmail password).');
    console.log('4. Ensure SMTP_PORT is set to 465 (SSL) or 587 (TLS).');
  }
  process.exit(1);
}
