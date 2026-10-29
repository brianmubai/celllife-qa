import nodemailer from 'nodemailer';

/**
 * Creates a configured Nodemailer transporter based on environment variables.
 * Automatically handles Gmail app-password formatting (stripping spaces)
 * and applies resilient timeout settings.
 */
export const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS || '';

  // Gmail app passwords are often copied with spaces like "abcd efgh ijkl mnop"
  if (pass && (host === 'smtp.gmail.com' || host?.includes('gmail'))) {
    pass = pass.replace(/\s+/g, '');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

/**
 * Tests the SMTP configuration and connection.
 */
export const verifyEmailConnection = async () => {
  const host = process.env.SMTP_HOST;
  if (host === 'mock' || host === 'test' || !host) {
    return {
      ok: true,
      mode: 'mock',
      message: 'SMTP is running in dev mock mode (emails logged to console).',
    };
  }

  const transporter = createTransporter();
  await transporter.verify();
  return {
    ok: true,
    mode: 'live',
    message: `SMTP connection to ${host} verified successfully!`,
  };
};

/**
 * Sends question answer notification email via Nodemailer.
 * Configured via environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 */
export const sendAnswerEmail = async ({
  to,
  sessionTitle,
  questionBody,
  answerBody,
  speakerName,
  simulateFailure = false,
}) => {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || '"cellLife Q&A Portal" <eddah.mhute@celebrate.org>';

  // Simulate failed send with wrong credentials
  if (simulateFailure || pass === 'wrong_password' || host === 'invalid.smtp.host') {
    throw new Error('535 5.7.8 Username and Password not accepted / Invalid SMTP credentials');
  }

  // Dev mode logging if SMTP host is 'mock' or 'test'
  if (host === 'mock' || host === 'test' || !host) {
    console.log(`[EMAIL DISPATCH - DEV LOG]
      To: ${to}
      From: ${from}
      Subject: Your question was answered: ${sessionTitle}
      Speaker: ${speakerName}
      Question: ${questionBody}
      Answer: ${answerBody}
    `);
    return { messageId: `mock-msg-${Date.now()}` };
  }

  // Real Nodemailer SMTP transport
  const transporter = createTransporter();

  const subject = `Your question was answered: ${sessionTitle}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #1F6F5C; margin-top: 0; font-size: 22px;">Your question has been answered!</h2>
      <p style="color: #64748B; font-size: 14px; margin-bottom: 20px;">Session: <strong>${sessionTitle}</strong></p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B;">Your Question:</span>
        <p style="margin: 8px 0 0; color: #1e293b; font-size: 15px; line-height: 1.5;">${questionBody}</p>
      </div>

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534;">Answer from ${speakerName || 'Speaker'}:</span>
        <p style="margin: 8px 0 0; color: #14532d; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${answerBody}</p>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This answer was provided live during the training session.
      </p>
    </div>
  `;

  return await transporter.sendMail({
    from,
    to,
    subject,
    text: `Your question was answered in "${sessionTitle}":\n\nQuestion:\n${questionBody}\n\nAnswer by ${speakerName || 'Speaker'}:\n${answerBody}`,
    html,
  });
};

/**
 * Sends session archive link notification email to opted-in askers.
 */
export const sendArchiveNotificationEmail = async ({
  to,
  sessionTitle,
  archiveUrl,
  recipientName = 'Participant',
}) => {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM || '"cellLife Q&A Portal" <eddah.mhute@celebrate.org>';

  // Dev mode logging
  if (host === 'mock' || host === 'test' || !host) {
    console.log(`[EMAIL DISPATCH - DEV LOG]
      To: ${to}
      From: ${from}
      Subject: Q&A Archive Available: ${sessionTitle}
      Archive Link: ${archiveUrl}
    `);
    return { messageId: `mock-archive-msg-${Date.now()}` };
  }

  const transporter = createTransporter();

  const subject = `Q&A Archive Available: ${sessionTitle}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #1F6F5C; margin-top: 0; font-size: 22px;">Session Q&A Archive is Now Available</h2>
      <p style="color: #64748B; font-size: 14px; margin-bottom: 20px;">Session: <strong>${sessionTitle}</strong></p>
      <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Hello ${recipientName}, the public Q&A archive for <strong>${sessionTitle}</strong> is now live. You can review all answered questions and expert insights:</p>
      <div style="margin: 24px 0;">
        <a href="${archiveUrl}" style="background-color: #1F6F5C; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Public Archive</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">You received this email because you submitted a question and opted into the public session archive.</p>
    </div>
  `;

  return await transporter.sendMail({
    from,
    to,
    subject,
    text: `Hello ${recipientName},\n\nThe public Q&A archive for "${sessionTitle}" is now live.\n\nView the archive here:\n${archiveUrl}\n`,
    html,
  });
};

/**
 * Sends speaker PIN recovery email.
 */
export const sendSpeakerPinRecoveryEmail = async ({
  to,
  speakerName,
  pin,
}) => {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM || '"cellLife Q&A Portal" <no-reply@celllife.org>';

  // Dev mode logging
  if (host === 'mock' || host === 'test' || !host) {
    console.log(`[SPEAKER PIN RECOVERY - DEV LOG]
      To: ${to}
      From: ${from}
      Subject: Your cellLife Speaker Access PIN
      Speaker: ${speakerName}
      PIN: ${pin}
    `);
    return { messageId: `mock-pin-msg-${Date.now()}` };
  }

  const transporter = createTransporter();

  const subject = `Your cellLife Speaker Access PIN`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #DC2626; margin-top: 0; font-size: 22px;">Speaker Access PIN Recovery</h2>
      <p style="color: #475569; font-size: 15px; margin-bottom: 20px;">Hello <strong>${speakerName}</strong>,</p>
      <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">You requested your access PIN for the <strong>cellLife Speaker Portal</strong>.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-left: 4px solid #DC2626; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #991B1B; display: block; margin-bottom: 6px;">Your Secret Speaker PIN:</span>
        <span style="font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 0.15em; color: #DC2626;">${pin}</span>
      </div>
      <p style="font-size: 13px; color: #64748b;">Keep this PIN confidential. Use it to log into the Speaker Queue and reply to questions during sessions.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">If you did not request this PIN, you can safely ignore this email.</p>
    </div>
  `;

  return await transporter.sendMail({
    from,
    to,
    subject,
    text: `Hello ${speakerName},\n\nYour secret cellLife Speaker Access PIN is: ${pin}\n\nUse this PIN to access the Speaker Queue.\n`,
    html,
  });
};
