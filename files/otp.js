// otp.js
const express = require('express');
const { otpService } = require('../services/emailOtpService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/send', async (req, res) => {
  const { email, phone, purpose = 'login', type = 'email' } = req.body;
  if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
  const identifier = type === 'email' ? email : phone;
  const result = await otpService.sendEmailOTP(identifier, purpose);
  res.json(result);
});

router.post('/verify', async (req, res) => {
  const { email, phone, otp, purpose = 'login', type = 'email' } = req.body;
  const identifier = type === 'email' ? email : phone;
  if (!identifier || !otp) return res.status(400).json({ error: 'identifier and otp required' });
  const result = await otpService.verifyOTP(identifier, otp, purpose, type);
  res.json(result);
});

module.exports = router;
