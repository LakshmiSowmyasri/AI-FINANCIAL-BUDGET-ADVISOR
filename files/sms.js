const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Parse Indian bank SMS format
function parseBankSMS(smsText) {
  const text = smsText.toLowerCase();

  // Detect type
  const isDebit = /debited|spent|paid|withdrawn|payment|purchase/.test(text);
  const isCredit = /credited|received|deposited|refund/.test(text);
  const type = isDebit ? 'debit' : isCredit ? 'credit' : null;
  if (!type) return null;

  // Extract amount — handles ₹, Rs., INR, rs
  const amountMatch = text.match(/(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|₹|inr)/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Extract merchant
  const merchantPatterns = [
    /at\s+([a-z0-9\s&'-]+?)(?:\s+on|\s+via|\s+ref|\s+upi|\.|\s+info|\s+avl)/i,
    /to\s+([a-z0-9\s&'-]+?)(?:\s+on|\s+via|\s+ref|\.)/i,
    /merchant:\s*([a-z0-9\s&'-]+)/i,
  ];
  let merchant = null;
  for (const pat of merchantPatterns) {
    const m = smsText.match(pat);
    if (m) { merchant = m[1].trim().substring(0, 100); break; }
  }

  // Bank name
  const banks = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'BOI', 'Canara', 'Union'];
  const bank = banks.find(b => smsText.toUpperCase().includes(b.toUpperCase())) || 'Unknown';

  return { type, amount, merchant, bank };
}

// POST /api/sms/parse — parse SMS text and save transaction
router.post('/parse', authenticate, async (req, res) => {
  try {
    const { smsText, transactionDate } = req.body;
    if (!smsText) return res.status(400).json({ error: 'smsText is required' });

    const parsed = parseBankSMS(smsText);
    if (!parsed) return res.status(422).json({ error: 'Could not parse SMS as a bank transaction' });

    const pool = getPool();
    const id = uuidv4();
    const txDate = transactionDate ? new Date(transactionDate) : new Date();

    await pool.execute(
      `INSERT INTO sms_transactions (id, user_id, sms_text, transaction_type, amount, merchant, bank_name, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, smsText.substring(0, 1000), parsed.type, parsed.amount, parsed.merchant, parsed.bank, txDate]);

    res.json({ success: true, id, parsed });
  } catch (err) {
    console.error('SMS parse error:', err);
    res.status(500).json({ error: 'Failed to parse SMS' });
  }
});

// GET /api/sms/pending — unprocessed SMS transactions
router.get('/pending', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [txns] = await pool.execute(
      'SELECT * FROM sms_transactions WHERE user_id=? AND is_processed=FALSE ORDER BY transaction_date DESC LIMIT 50',
      [req.user.id]);
    res.json({ transactions: txns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending transactions' });
  }
});

// POST /api/sms/:id/confirm — convert SMS transaction into an expense
router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const { categoryId, description } = req.body;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT * FROM sms_transactions WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });

    const sms = rows[0];
    if (sms.transaction_type !== 'debit') {
      return res.status(400).json({ error: 'Only debit transactions can be converted to expenses' });
    }

    const expenseId = uuidv4();
    const expenseDate = sms.transaction_date
      ? new Date(sms.transaction_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    await pool.execute(
      'INSERT INTO expenses (id, user_id, category_id, amount, description, expense_date, payment_method, merchant) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [expenseId, req.user.id, categoryId || null, sms.amount,
        description || sms.merchant || 'SMS Transaction', expenseDate, 'upi', sms.merchant || null]);

    if (categoryId) {
      await pool.execute('UPDATE budget_categories SET spent_amount=spent_amount+? WHERE id=? AND user_id=?', [sms.amount, categoryId, req.user.id]);
    }

    await pool.execute('UPDATE sms_transactions SET is_processed=TRUE, expense_id=? WHERE id=?', [expenseId, req.params.id]);

    res.json({ success: true, expenseId, message: 'Transaction added to expenses' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm transaction' });
  }
});

module.exports = router;
