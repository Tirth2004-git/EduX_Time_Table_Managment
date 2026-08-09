const nodemailer = require('nodemailer');

function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

async function sendOtpEmail(recipientEmail, otp, username) {
  // Console logging OTP as a robust fallback for easy development/testing
  console.log(`🔑 [OTP CODE FOR ${username} (${recipientEmail})]: ${otp}`);
  
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not configured. OTP printed to console log instead.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"AI Timetable System" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Your OTP for AI Timetable Scheduling System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto">
          <h2>Verify your account</h2>
          <p>Hello ${username},</p>
          <p>Your OTP code is:</p>
          <div style="font-size:30px;letter-spacing:4px;font-weight:bold;margin:18px 0;">
            ${otp}
          </div>
          <p>This code is valid for 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`📨 OTP email successfully sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${recipientEmail}:`, error.message);
  }
}

async function sendResetPasswordEmail(recipientEmail, resetToken, username) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  console.log(`🔑 [PASSWORD RESET LINK FOR ${username} (${recipientEmail})]: ${resetUrl}`);
  
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not configured. Reset link printed to console log instead.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"AI Timetable System" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Reset Password - AI Timetable Scheduling System',
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
  } catch (error) {
    console.error(`❌ Failed to send reset password email to ${recipientEmail}:`, error.message);
  }
}

async function sendTimetableUpdateEmail(recipientEmail, teacherName, divisionInfo) {
  console.log(`📨 [TIMETABLE UPDATE NOTIFICATION FOR ${teacherName} (${recipientEmail})]: Timetable changed for ${divisionInfo}`);
  
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not configured. Update notification printed to console log instead.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"AI Timetable System" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Timetable Updated - AI Timetable Scheduling System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:560px; margin:auto; line-height: 1.5;">
          <h2>Timetable Assignment Updated</h2>
          <p>Hello ${teacherName},</p>
          <p>We wanted to let you know that your timetable assignment has been updated for: <strong>${divisionInfo}</strong>.</p>
          <p>Please log in to the portal to view your updated schedule.</p>
          <p>Best regards,<br/>AI Timetable Admin System</p>
        </div>
      `,
    });
    console.log(`📨 Timetable update email successfully sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send update notification to ${recipientEmail}:`, error.message);
  }
}

module.exports = { sendOtpEmail, sendResetPasswordEmail, sendTimetableUpdateEmail };
