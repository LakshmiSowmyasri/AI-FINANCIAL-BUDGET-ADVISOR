const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../database/connection');
const { generateToken, authenticate } = require('../middleware/auth');
const { otpService, emailService } = require('../services/emailOtpService');

const router = express.Router();

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, monthlyIncome } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = phone ? String(phone).trim() : null;
    const pool = getPool();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    if (normalizedPhone) {
      const [existingPhone] = await pool.execute(
        'SELECT id FROM users WHERE phone = ?',
        [normalizedPhone]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({ error: 'An account with this phone number already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const income = parseFloat(monthlyIncome) || 0;

    await pool.execute(
      'INSERT INTO users (id, name, email, phone, password, monthly_income) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name.trim(), normalizedEmail, normalizedPhone, hashedPassword, income]
    );

    // Create default budget categories
    const defaultCategories = [
      { name: 'Housing & Rent', color: '#FF6384', icon: 'home', pct: 0.30 },
      { name: 'Food & Groceries', color: '#36A2EB', icon: 'food', pct: 0.15 },
      { name: 'Transportation', color: '#FFCE56', icon: 'car', pct: 0.10 },
      { name: 'Utilities & Bills', color: '#4BC0C0', icon: 'bolt', pct: 0.10 },
      { name: 'Entertainment', color: '#9966FF', icon: 'star', pct: 0.08 },
      { name: 'Healthcare', color: '#FF9F40', icon: 'heart', pct: 0.05 },
      { name: 'Education', color: '#C9CBCF', icon: 'book', pct: 0.07 },
      { name: 'Savings & Investment', color: '#4CAF50', icon: 'trending_up', pct: 0.15 },
    ];

    for (const cat of defaultCategories) {
      await pool.execute(
        'INSERT INTO budget_categories (id, user_id, name, allocated_amount, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, cat.name, income * cat.pct, cat.color, cat.icon]
      );
    }

    // Send welcome email (non-blocking)
    emailService.sendEmail(email, 'welcome', [name]).catch(console.error);

    // Log to transaction_logs
    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, action, entity_type, new_data) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), userId, 'create', 'budget', JSON.stringify({ event: 'user_registered', email })]
    );

    const token = generateToken(userId);
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: userId, name, email, phone: phone || null, monthlyIncome: income }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, password, monthly_income, currency, risk_profile, is_active FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user.id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        monthlyIncome: user.monthly_income,
        currency: user.currency,
        riskProfile: user.risk_profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/forgot-password
// Step 1: Send OTP to email
// ============================================================
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = String(req.body.email || '').trim().toLowerCase();

    const developmentOtpMode = process.env.NODE_ENV === 'development' && !emailService.isConfigured();
    if (!emailService.isConfigured() && !developmentOtpMode) {
      return res.status(503).json({
        error: 'Email delivery is not configured. Set EMAIL_USER and a Gmail App Password in the backend .env file.'
      });
    }

    const pool = getPool();

    // Check user exists (don't reveal if not found for security)
    const [users] = await pool.execute('SELECT id, name FROM users WHERE email = ?', [email]);

    let developmentOtp;
    if (users.length > 0) {
      const result = await otpService.sendEmailOTP(email, 'reset');
      if (!result.success) {
        console.error('Forgot password OTP delivery failed:', result.message);
        return res.status(503).json({
          error: result.message || 'Unable to send the OTP email. Please try again later.'
        });
      }
      developmentOtp = result.developmentOtp;
    }

    res.json({
      message: developmentOtpMode
        ? 'Development mode: the OTP is shown on this page.'
        : 'If an account exists with this email, an OTP has been sent.',
      success: true,
      ...(developmentOtp ? { developmentOtp } : {})
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/verify-reset-otp
// Step 2: Verify OTP, get reset token
// ============================================================
router.post('/verify-reset-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit OTP')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    const result = await otpService.verifyOTP(email, otp, 'reset', 'email');
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Generate a short-lived reset token
    const pool = getPool();
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = uuidv4() + '-' + Date.now();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.execute(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), users[0].id, resetToken, expiresAt]
    );

    res.json({ success: true, resetToken, message: 'OTP verified. You can now reset your password.' });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ============================================================
// POST /api/auth/reset-password
// Step 3: Set new password using reset token
// ============================================================
router.post('/reset-password', [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resetToken, newPassword } = req.body;
    const pool = getPool();

    // Validate token
    const [tokens] = await pool.execute(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND is_used = FALSE AND expires_at > NOW()',
      [resetToken]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new OTP.' });
    }

    const { user_id } = tokens[0];
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, user_id]);

    // Mark token as used
    await pool.execute('UPDATE password_reset_tokens SET is_used = TRUE WHERE token = ?', [resetToken]);

    // Log the action
    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, action, entity_type, new_data) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), user_id, 'update', 'budget', JSON.stringify({ event: 'password_reset' })]
    );

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// ============================================================
// GET /api/auth/me
// ============================================================
router.get('/me', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, monthly_income, currency, risk_profile, is_email_verified, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = users[0];
    res.json({ user: { ...u, monthlyIncome: u.monthly_income } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
