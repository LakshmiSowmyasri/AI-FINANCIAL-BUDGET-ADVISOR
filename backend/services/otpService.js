const twilio = require('twilio');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');

// Initialize Twilio client
const twilioClient = (() => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  
  // Check if credentials are valid (not placeholders)
  if (sid && token && sid.startsWith('AC') && token.length > 10 && !sid.includes('your-')) {
    try {
      return twilio(sid, token);
    } catch (error) {
      console.warn('Failed to initialize Twilio:', error.message);
      return null;
    }
  }
  return null;
})();

// Create email transporter dynamically
function createEmailTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  // Check if credentials are valid (not placeholders)
  if (host && user && pass && 
      !host.includes('your-') && 
      !user.includes('your-') && 
      !pass.includes('your-') &&
      user.includes('@')) {
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: user,
          pass: pass
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certs
        }
      });
      return transporter;
    } catch (error) {
      console.warn('Failed to initialize email transporter:', error.message);
      return null;
    }
  }
  return null;
}

class OTPService {
  // Generate and send OTP via email
  async sendEmailOTP(email, purpose = 'login') {
    try {
      const otp = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
      });

      const pool = getPool();
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      await pool.execute(
        'INSERT INTO otp_verifications (id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
        [id, email, otp, purpose, expiresAt]
      );

      // Send email - create transporter fresh each time
      let emailSent = false;
      let emailError = null;
      
      const transporter = createEmailTransporter();
      
      if (transporter) {
        try {
          const result = await transporter.sendMail({
            from: `"Budget Advisor" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP Code - Budget Advisor',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #4CAF50; text-align: center; margin-bottom: 30px;">🔐 Budget Advisor</h2>
                <p style="font-size: 16px; color: #333; text-align: center;">Your OTP code is:</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 42px; letter-spacing: 12px; font-weight: bold; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">${otp}</span>
                </div>
                <p style="color: #666; text-align: center; margin-top: 20px; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
              </div>
            `
          });
          
          if (result.accepted && result.accepted.length > 0) {
            emailSent = true;
            console.log(`✅ Email OTP sent successfully to ${email}`);
          } else {
            emailError = 'Email not accepted';
          }
        } catch (err) {
          emailError = err.message;
          console.error('❌ Failed to send email:', err.message);
        }
      } else {
        emailError = 'Email transporter not configured - check EMAIL_USER and EMAIL_PASS';
        console.log('⚠️ Email transporter not initialized. Check credentials.');
      }
      
      // Always log OTP for development/testing
      console.log(`\n🔐 OTP for ${email}: ${otp}`);
      console.log(`   Status: ${emailSent ? 'SENT ✓' : 'NOT SENT ✗'}`);
      if (emailError) {
        console.log(`   Error: ${emailError}`);
      }
      console.log('');

      if (emailSent) {
        return { success: true, message: 'OTP sent successfully to your email' };
      } else {
        return { success: true, message: `OTP generated: ${otp} (Email failed: ${emailError})` };
      }
    } catch (error) {
      console.error('Email OTP error:', error);
      return { success: false, message: 'Failed to send OTP: ' + error.message };
    }
  }

  // Generate and send OTP via SMS
  async sendSMSOTP(phone, purpose = 'login') {
    try {
      const otp = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
      });

      const pool = getPool();
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      await pool.execute(
        'INSERT INTO otp_verifications (id, phone, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
        [id, phone, otp, purpose, expiresAt]
      );

      // Send SMS via Twilio
      let smsSent = false;
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER && !process.env.TWILIO_PHONE_NUMBER.includes('your-')) {
        try {
          await twilioClient.messages.create({
            body: `Your Budget Advisor OTP is: ${otp}. Valid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
          });
          smsSent = true;
          console.log(`📱 SMS OTP sent to ${phone}`);
        } catch (smsError) {
          console.error('Failed to send SMS:', smsError.message);
        }
      }
      
      // Always log OTP for development/testing
      console.log(`\n🔐 OTP for ${phone}: ${otp}`);
      if (!smsSent) {
        console.log('⚠️  SMS service not configured. Use the OTP above for testing.\n');
      }

      return { success: true, message: smsSent ? 'OTP sent successfully' : 'OTP generated (SMS service not configured - check server console)' };
    } catch (error) {
      console.error('SMS OTP error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  // Verify OTP
  async verifyOTP(identifier, otp, purpose = 'login', type = 'email') {
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
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Mark as verified
      await pool.execute(
        'UPDATE otp_verifications SET is_verified = TRUE WHERE id = ?',
        [rows[0].id]
      );

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'Failed to verify OTP' };
    }
  }
}

module.exports = new OTPService();
