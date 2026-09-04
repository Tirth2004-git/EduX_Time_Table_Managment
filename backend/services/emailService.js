const nodemailer = require('nodemailer');

/**
 * Fictitious / test domains that must never be sent to live SMTP servers to avoid bounce loops.
 */
const FICTITIOUS_DOMAINS = [
  'edux.com',
  'edux.local',
  'edux.edu',
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'sample.com',
  'localhost',
  'invalid.com'
];

/**
 * Check whether an email domain is fictitious or a test mock
 */
function isFictitiousDomain(email) {
  if (!email || typeof email !== 'string') return true;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];
  return FICTITIOUS_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}

let cachedTransporter = null;

function getTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    connectionTimeout: 5000, // 5s connection timeout
    greetingTimeout: 5000,   // 5s greeting timeout
    socketTimeout: 10000,    // 10s socket timeout
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2',
    },
  });

  return cachedTransporter;
}

function getSender() {
  return process.env.MAIL_FROM || process.env.EMAIL_USER || '"EduX Planner" <no-reply@edux.edu>';
}

/**
 * Core internal email dispatcher with environment guardrails, fictitious domain filtering,
 * development redirection sandbox, and structured security logging.
 */
async function sendEmailInternal({ type, recipientEmail, subject, text, html, metadata = {} }) {
  const startTime = Date.now();
  const cleanRecipient = (recipientEmail || '').trim().toLowerCase();

  // 1. Safety Guard: Automated Test Environment
  if (process.env.NODE_ENV === 'test' && process.env.FORCE_EMAIL_TEST !== 'true') {
    console.log(`[EMAIL TEST MOCK] Type=${type} | To=${cleanRecipient} | Subject="${subject}" (Bypassed in test environment)`);
    return { success: true, bypassed: true, reason: 'test_environment' };
  }

  // 2. Safety Guard: Explicit Email Sending Toggle (MAIL_SEND_ENABLED=false)
  if (process.env.MAIL_SEND_ENABLED === 'false') {
    console.log(`[EMAIL DISABLED] Type=${type} | To=${cleanRecipient} | Subject="${subject}" (MAIL_SEND_ENABLED is false)`);
    return { success: true, bypassed: true, reason: 'mail_send_disabled' };
  }

  // 3. Safety Guard: Fictitious / Non-Routable Test Domains (e.g. student@edux.com)
  if (isFictitiousDomain(cleanRecipient)) {
    console.log(`[EMAIL BYPASS] Type=${type} | To=${cleanRecipient} | Subject="${subject}" (Non-routable test domain. Real SMTP delivery skipped to prevent mail server bounce loops.)`);
    return { success: true, bypassed: true, reason: 'fictitious_domain' };
  }

  // 4. Development / Sandbox Redirection Mode
  let finalRecipient = cleanRecipient;
  let finalSubject = subject;
  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.EMAIL_MODE === 'sandbox' || process.env.EMAIL_MODE === 'development';

  if (isDevMode && process.env.TEST_EMAIL && process.env.EMAIL_REDIRECT_TO_TEST === 'true') {
    finalRecipient = process.env.TEST_EMAIL.trim();
    finalSubject = `[DEV REDIRECT: ${cleanRecipient}] ${subject}`;
    console.log(`[EMAIL REDIRECT] Type=${type} | Original=${cleanRecipient} -> RedirectedTo=${finalRecipient}`);
  }

  // 5. Transporter Check
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[EMAIL CONFIG WARNING] Type=${type} | To=${finalRecipient} | SMTP credentials not configured. Email logged to console.`);
    return { success: false, reason: 'SMTP not configured' };
  }

  // 6. SMTP Network Dispatch
  try {
    const info = await transporter.sendMail({
      from: getSender(),
      to: finalRecipient,
      subject: finalSubject,
      text,
      html,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[EMAIL SENT] type=${type} recipient=${finalRecipient} duration=${elapsedMs}ms messageId=${info.messageId || 'OK'}`);
    return { success: true, messageId: info.messageId, durationMs: elapsedMs };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[EMAIL FAILED] type=${type} recipient=${finalRecipient} duration=${elapsedMs}ms error="${error.message}"`);
    return { success: false, error: error.message, durationMs: elapsedMs };
  }
}

/**
 * Send 6-digit OTP verification email for account registration
 */
async function sendOtpEmail(recipientEmail, otp, studentName = 'Student') {
  console.log(`🔑 [OTP CODE FOR ${studentName} (${recipientEmail})]: ${otp}`);

  const subject = 'Verify your EduX Planner account';
  const textBody = `Hello ${studentName},

Your EduX Planner verification code is:

${otp}

This OTP will expire in 10 minutes.

If you did not request this registration, ignore this email.

Regards,
EduX Planner`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4338ca; font-size: 24px; font-weight: 800; margin: 0;">EduX Planner</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Account Verification</p>
      </div>

      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #edf2f7; margin-bottom: 24px;">
        <p style="color: #1e293b; font-size: 15px; margin: 0 0 16px 0; font-weight: 600;">Hello ${studentName},</p>
        <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
          Thank you for registering on EduX Planner. Please use the verification code below to verify your email address:
        </p>

        <div style="text-align: center; background: #ffffff; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #312e81; font-family: monospace;">${otp}</span>
        </div>

        <p style="color: #64748b; font-size: 12px; margin: 16px 0 0 0; text-align: center;">
          ⏱️ This OTP will expire in <strong>10 minutes</strong>.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0 0 20px 0;">
        If you did not request this registration, you can safely ignore this email.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 600;">Regards,</p>
        <p style="color: #4338ca; font-size: 13px; font-weight: 700; margin: 2px 0 0 0;">EduX Planner Team</p>
      </div>
    </div>
  `;

  return sendEmailInternal({
    type: 'OTP_VERIFICATION',
    recipientEmail,
    subject,
    text: textBody,
    html: htmlBody,
    metadata: { studentName, otp }
  });
}

/**
 * Send Confirmed Event Ticket Email
 */
async function sendEventTicketEmail(recipientEmail, studentName, event, ticketId, paymentId, amount) {
  console.log(`🎟️ [EVENT TICKET FOR ${studentName} (${recipientEmail})]: Event="${event.title}", Ticket=${ticketId}`);

  const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const subject = `🎟️ EduX Event Ticket Confirmed — ${event.title}`;

  const textBody = `--------------------------------
EduX Planner
CAMPUS EVENT TICKET
--------------------------------

Event:
${event.title}

Student:
${studentName}

Ticket ID:
${ticketId}

Date:
${dateStr}

Time:
${event.startTime} - ${event.endTime}

Venue:
${event.venue}

Amount:
₹${amount}

Payment:
${amount > 0 ? 'PAID' : 'FREE'}

Status:
CONFIRMED

--------------------------------
Please keep this email for event entry.

Regards,
EduX Planner
Campus Events Team`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 14px; border-radius: 20px; margin-bottom: 8px;">
          EduX Campus Events
        </div>
        <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0;">Registration Confirmed! 🎉</h1>
        <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">Hello <strong>${studentName}</strong>, your ticket has been successfully issued.</p>
      </div>

      <!-- Ticket Card -->
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; color: #ffffff; box-shadow: 0 10px 25px -5px rgba(49, 46, 129, 0.3); margin-bottom: 24px; border: 1px solid #4338ca;">
        <div style="border-bottom: 1px dashed rgba(255,255,255,0.25); padding-bottom: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #a5b4fc; letter-spacing: 1px;">Official Entry Ticket</span>
            <h2 style="font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: #ffffff;">${event.title}</h2>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
          <div>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Student Name</span>
            <p style="font-weight: 700; color: #ffffff; margin: 2px 0 0 0;">${studentName}</p>
          </div>
          <div>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Ticket ID</span>
            <p style="font-weight: 800; color: #facc15; margin: 2px 0 0 0; font-family: monospace; font-size: 14px;">${ticketId}</p>
          </div>
          <div>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Date & Time</span>
            <p style="font-weight: 600; color: #e2e8f0; margin: 2px 0 0 0;">${dateStr}<br/>${event.startTime} - ${event.endTime}</p>
          </div>
          <div>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Venue</span>
            <p style="font-weight: 600; color: #e2e8f0; margin: 2px 0 0 0;">${event.venue}</p>
          </div>
        </div>

        <div style="border-top: 1px dashed rgba(255,255,255,0.25); margin-top: 16px; padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700;">Amount</span>
            <p style="font-size: 16px; font-weight: 800; color: #4ade80; margin: 0;">${amount > 0 ? `₹${amount}` : 'FREE'}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">
              ${amount > 0 ? 'PAID & CONFIRMED' : 'CONFIRMED'}
            </span>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.5;">
        <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b;">📌 Important Guidelines:</p>
        <ul style="margin: 0; padding-left: 18px;">
          <li>Please present this digital ticket or Ticket ID (<strong>${ticketId}</strong>) at the venue entry.</li>
          <li>Please report to the venue 15 minutes before the scheduled start time.</li>
          ${paymentId ? `<li>Transaction Reference: <code>${paymentId}</code></li>` : ''}
        </ul>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 600;">Regards,</p>
        <p style="color: #4338ca; font-size: 13px; font-weight: 700; margin: 2px 0 0 0;">EduX Planner · Campus Events Team</p>
      </div>
    </div>
  `;

  return sendEmailInternal({
    type: 'EVENT_TICKET_CONFIRMATION',
    recipientEmail,
    subject,
    text: textBody,
    html: htmlBody,
    metadata: { studentName, eventId: event._id, ticketId, paymentId, amount }
  });
}

/**
 * Send Password Reset Token Link Email
 */
async function sendResetPasswordEmail(recipientEmail, resetToken, username) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  console.log(`🔑 [PASSWORD RESET LINK FOR ${username} (${recipientEmail})]: ${resetUrl}`);

  const subject = 'Reset your EduX Planner password';
  const textBody = `Hello ${username},

You requested a password reset for your EduX Planner account.

Please visit the link below to set a new password:
${resetUrl}

This link is valid for 1 hour. If you did not request this, please ignore this email.

Regards,
EduX Planner Security Team`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto; line-height: 1.5; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1e293b;">Reset your EduX Planner password</h2>
      <p style="color: #475569;">Hello ${username},</p>
      <p style="color: #475569;">You requested a password reset. Please click the button below to reset your password:</p>
      <div style="margin:24px 0;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #4338ca; font-size: 12px;">${resetUrl}</p>
      <p style="color: #94a3b8; font-size: 12px;">This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmailInternal({
    type: 'PASSWORD_RESET',
    recipientEmail,
    subject,
    text: textBody,
    html: htmlBody,
    metadata: { username, resetToken }
  });
}

/**
 * Send Timetable Modification Notification Email to Faculty
 */
async function sendTimetableUpdateEmail(recipientEmail, teacherName, divisionInfo) {
  console.log(`📨 [TIMETABLE UPDATE NOTIFICATION FOR ${teacherName} (${recipientEmail})]: Timetable changed for ${divisionInfo}`);

  const subject = 'Timetable Updated - EduX Planner';
  const textBody = `Hello ${teacherName},

Your timetable assignment has been updated for: ${divisionInfo}.

Please log in to the EduX portal to view your updated schedule.

Best regards,
EduX Admin System`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto; line-height: 1.5; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1e293b;">Timetable Assignment Updated</h2>
      <p style="color: #475569;">Hello ${teacherName},</p>
      <p style="color: #475569;">Your timetable assignment has been updated for: <strong>${divisionInfo}</strong>.</p>
      <p style="color: #475569;">Please log in to the EduX portal to view your schedule.</p>
      <p style="color: #64748b; font-size: 13px;">Best regards,<br/>EduX Admin System</p>
    </div>
  `;

  return sendEmailInternal({
    type: 'TIMETABLE_UPDATE',
    recipientEmail,
    subject,
    text: textBody,
    html: htmlBody,
    metadata: { teacherName, divisionInfo }
  });
}

module.exports = {
  isFictitiousDomain,
  sendOtpEmail,
  sendEventTicketEmail,
  sendResetPasswordEmail,
  sendTimetableUpdateEmail,
};
