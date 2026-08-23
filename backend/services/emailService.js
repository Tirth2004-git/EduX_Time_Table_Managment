const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function getSender() {
  return process.env.MAIL_FROM || process.env.EMAIL_USER || '"EduX Planner" <no-reply@edux.edu>';
}

/**
 * Send 6-digit OTP verification email for account registration
 */
async function sendOtpEmail(recipientEmail, otp, studentName = 'Student') {
  console.log(`🔑 [OTP CODE FOR ${studentName} (${recipientEmail})]: ${otp}`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('⚠️ SMTP credentials not configured. OTP logged to console.');
    return { success: false, reason: 'SMTP not configured' };
  }

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

  try {
    await transporter.sendMail({
      from: getSender(),
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`📨 OTP verification email successfully sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${recipientEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Confirmed Event Ticket Email
 */
async function sendEventTicketEmail(recipientEmail, studentName, event, ticketId, paymentId, amount) {
  console.log(`🎟️ [EVENT TICKET FOR ${studentName} (${recipientEmail})]: Event="${event.title}", Ticket=${ticketId}`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('⚠️ SMTP not configured. Ticket email logged to console.');
    return { success: false, reason: 'SMTP not configured' };
  }

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
PAID

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
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700;">Amount Paid</span>
            <p style="font-size: 16px; font-weight: 800; color: #4ade80; margin: 0;">₹${amount}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">
              PAID & CONFIRMED
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

  try {
    await transporter.sendMail({
      from: getSender(),
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`📨 Event ticket email successfully sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send event ticket email to ${recipientEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendResetPasswordEmail(recipientEmail, resetToken, username) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  console.log(`🔑 [PASSWORD RESET LINK FOR ${username} (${recipientEmail})]: ${resetUrl}`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('⚠️ SMTP credentials not configured. Reset link logged to console.');
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: getSender(),
      to: recipientEmail,
      subject: 'Reset Password - EduX Planner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto; line-height: 1.5;">
          <h2>Reset your password</h2>
          <p>Hello ${username},</p>
          <p>You requested a password reset. Please click the button below to reset your password:</p>
          <div style="margin:24px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #4b5563;">${resetUrl}</p>
          <p>This link is valid for 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`📨 Reset password email successfully sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send reset password email to ${recipientEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendTimetableUpdateEmail(recipientEmail, teacherName, divisionInfo) {
  console.log(`📨 [TIMETABLE UPDATE NOTIFICATION FOR ${teacherName} (${recipientEmail})]: Timetable changed for ${divisionInfo}`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('⚠️ SMTP not configured. Update notification logged to console.');
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: getSender(),
      to: recipientEmail,
      subject: 'Timetable Updated - EduX Planner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto; line-height: 1.5;">
          <h2>Timetable Assignment Updated</h2>
          <p>Hello ${teacherName},</p>
          <p>Your timetable assignment has been updated for: <strong>${divisionInfo}</strong>.</p>
          <p>Please log in to the EduX portal to view your schedule.</p>
          <p>Best regards,<br/>EduX Admin System</p>
        </div>
      `,
    });
    console.log(`📨 Timetable update email successfully sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send update notification to ${recipientEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
  sendEventTicketEmail,
  sendResetPasswordEmail,
  sendTimetableUpdateEmail,
};
