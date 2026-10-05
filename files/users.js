// ============================================================
// users.js
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, monthly_income, currency, risk_profile, occupation, date_of_birth, is_email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const { name, phone, monthlyIncome, currency, riskProfile, occupation, dateOfBirth } = req.body;
    await pool.execute(
      `UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), monthly_income=COALESCE(?,monthly_income),
       currency=COALESCE(?,currency), risk_profile=COALESCE(?,risk_profile), occupation=COALESCE(?,occupation),
       date_of_birth=COALESCE(?,date_of_birth), updated_at=NOW() WHERE id=?`,
      [name, phone, monthlyIncome ? parseFloat(monthlyIncome) : null, currency, riskProfile, occupation, dateOfBirth, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
    const pool = getPool();
    const [users] = await pool.execute('SELECT password FROM users WHERE id=?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, users[0].password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const pool = getPool();
    const [users] = await pool.execute('SELECT password FROM users WHERE id=?', [req.user.id]);
    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password' });
    await pool.execute('UPDATE users SET is_active=FALSE WHERE id=?', [req.user.id]);
    res.json({ success: true, message: 'Account deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});

module.exports = router;
