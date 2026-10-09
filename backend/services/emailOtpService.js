const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');

function isEmailConfigured() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return Boolean(
    user &&
    pass &&
    !user.toLowerCase().includes('your_') &&
    !pass.toLowerCase().includes('your_')
  );
}

// Create email transporter using configured Gmail account
function createTransporter() {
  if (!isEmailConfigured()) return null;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

// Email templates
const emailTemplates = {
  otp: (otp, purpose) => {
    const purposeText = {
      reset: 'Password Reset',
      verify_email: 'Email Verification',
      login: 'Login Verification',
      register: 'Registration'
    }[purpose] || 'Verification';

    return {
      subject: `${purposeText} OTP - AI Financial Advisor`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 8px;">💰</div>
            <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">AI Financial Advisor</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${purposeText}</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px 32px;">
            <p style="margin: 0 0 24px; font-size: 16px; color: #cbd5e1;">Your one-time verification code is:</p>
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d1b69 100%); border: 2px solid #3b82f6; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
              <span style="font-size: 48px; font-weight: 800; letter-spacing: 16px; color: #60a5fa; font-family: 'Courier New', monospace;">${otp}</span>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #93c5fd;">⏱️ This code expires in <strong>10 minutes</strong></p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #93c5fd;">🔒 Never share this code with anyone</p>
            </div>
            <p style="margin: 0; font-size: 13px; color: #64748b;">If you didn't request this, please ignore this email or contact support immediately.</p>
          </div>
          <!-- Footer -->
          <div style="background: #0a0f1e; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #475569;">© 2024 AI Financial Budget Advisor | <a href="mailto:aifinancialbudgetadvisor@gmail.com" style="color: #3b82f6; text-decoration: none;">aifinancialbudgetadvisor@gmail.com</a></p>
          </div>
        </div>
      `
    };
  },

  passwordResetLink: (resetUrl, userName) => ({
    subject: 'Password Reset Request - AI Financial Advisor',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 32px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">🔑</div>
          <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">Password Reset</h1>
        </div>
        <div style="padding: 40px 32px;">
          <p style="font-size: 16px; color: #cbd5e1;">Hello <strong>${userName || 'User'}</strong>,</p>
          <p style="color: #94a3b8;">We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; display: inline-block;">Reset My Password</a>
          </div>
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #fca5a5;">⚠️ This link expires in <strong>15 minutes</strong></p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #fca5a5;">If you didn't request this reset, your account is safe — no changes were made.</p>
          </div>
        </div>
        <div style="background: #0a0f1e; padding: 20px 32px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">© 2024 AI Financial Budget Advisor</p>
        </div>
      </div>
    `
  }),

  welcome: (userName) => ({
    subject: 'Welcome to AI Financial Budget Advisor! 🎉',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 40px 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 800;">Welcome aboard, ${userName}!</h1>
          <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your AI-powered financial journey begins now</p>
        </div>
        <div style="padding: 40px 32px;">
          <p style="font-size: 16px; color: #cbd5e1;">Here's what you can do with your account:</p>
          <div style="display: grid; gap: 16px; margin: 24px 0;">
            ${[
              ['💬', 'AI Chatbot', 'Get personalized financial advice powered by Claude AI'],
              ['📊', 'Budget Tracking', 'Track expenses and stay within your budget'],
              ['📈', 'Investments', 'Get ML-powered stock recommendations'],
              ['🎯', 'Goals', 'Set and track your financial goals'],
              ['📱', 'Auto Import', 'Import transactions from bank SMS'],
            ].map(([icon, title, desc]) => `
              <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 12px; padding: 16px; display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 24px;">${icon}</span>
                <div>
                  <strong style="color: #60a5fa; display: block; margin-bottom: 4px;">${title}</strong>
                  <span style="color: #94a3b8; font-size: 14px;">${desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="background: #0a0f1e; padding: 20px 32px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">© 2024 AI Financial Budget Advisor | <a href="mailto:aifinancialbudgetadvisor@gmail.com" style="color: #3b82f6;">Support</a></p>
        </div>
      </div>
    `
  })
};

class EmailService {
  isConfigured() {
    return isEmailConfigured();
  }

  async sendEmail(to, templateName, templateData) {
    const transporter = createTransporter();
    const template = emailTemplates[templateName]?.(...templateData);

    if (!template) throw new Error(`Unknown email template: ${templateName}`);

    if (!transporter) {
      return { success: false, reason: 'Email is not configured' };
    }

    try {
      const result = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'AI Financial Advisor'}" <${process.env.EMAIL_USER}>`,
        to,
        ...template
      });
      console.log(`Email sent to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error(`Email delivery failed: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }
}

class OTPService {
  async generateAndStore(identifier, purpose, type = 'email') {
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    const pool = getPool();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Invalidate old OTPs
    const column = type === 'email' ? 'email' : 'phone';
    await pool.execute(
      `UPDATE otp_verifications SET is_verified = TRUE WHERE ${column} = ? AND purpose = ? AND is_verified = FALSE`,
      [identifier, purpose]
    );

    await pool.execute(
      `INSERT INTO otp_verifications (id, ${column}, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [id, identifier, otp, purpose, expiresAt]
    );

    return { otp, id };
  }

  async sendEmailOTP(email, purpose = 'login') {
    try {
      if (!isEmailConfigured()) {
        if (process.env.NODE_ENV === 'development') {
          const { otp } = await this.generateAndStore(email, purpose, 'email');
          return { success: true, emailSent: false, developmentOtp: otp };
        }

        return {
          success: false,
          message: 'Email delivery is not configured. Set EMAIL_USER and EMAIL_PASS in the backend .env file.'
        };
      }

      const { otp, id } = await this.generateAndStore(email, purpose, 'email');
      const emailSvc = new EmailService();
      const result = await emailSvc.sendEmail(email, 'otp', [otp, purpose]);
      if (!result.success) {
        const pool = getPool();
        await pool.execute('UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?', [id]);
        return { success: false, message: 'Unable to deliver the OTP email. Check the backend email configuration and try again.' };
      }

      return { success: true, emailSent: true };
    } catch (err) {
      console.error('sendEmailOTP error:', err);
      return { success: false, message: 'Unable to send the OTP email. Please try again later.' };
    }
  }

  async verifyOTP(identifier, otp, purpose, type = 'email') {
    try {
      const pool = getPool();
      const column = type === 'email' ? 'email' : 'phone';

      const [rows] = await pool.execute(
        `SELECT * FROM otp_verifications 
         WHERE ${column} = ? AND otp_code = ? AND purpose = ? AND is_verified = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [identifier, otp, purpose]
      );

      if (rows.length === 0) {
        // Increment attempt count
        await pool.execute(
          `UPDATE otp_verifications SET attempts = attempts + 1 WHERE ${column} = ? AND purpose = ? AND is_verified = FALSE`,
          [identifier, purpose]
        );
        return { success: false, message: 'Invalid or expired OTP' };
      }

      await pool.execute(
        'UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?',
        [rows[0].id]
      );

      return { success: true, message: 'OTP verified successfully' };
    } catch (err) {
      console.error('verifyOTP error:', err);
      return { success: false, message: 'Verification failed' };
    }
  }
}

module.exports = {
  otpService: new OTPService(),
  emailService: new EmailService()
};
