const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/expenses/bulk-import — import multiple transactions at once
router.post('/bulk-import', authenticate, async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array is required' });
    }
    if (transactions.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 transactions per import' });
    }

    const pool = getPool();
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const txn of transactions) {
      try {
        if (!txn.amount || !txn.date) { skipped++; continue; }
        const amount = parseFloat(txn.amount);
        if (isNaN(amount) || amount <= 0) { skipped++; continue; }

        const id = uuidv4();
        await pool.execute(
          `INSERT INTO expenses (id, user_id, category_id, amount, description, expense_date, payment_method, merchant)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, req.user.id, txn.categoryId || null, amount,
            txn.description || txn.merchant || 'Imported Transaction',
            txn.date, txn.paymentMethod || 'other', txn.merchant || null]);

        if (txn.categoryId) {
          await pool.execute('UPDATE budget_categories SET spent_amount=spent_amount+? WHERE id=? AND user_id=?',
            [amount, txn.categoryId, req.user.id]);
        }
        imported++;
      } catch (err) {
        errors.push({ txn: txn.description, error: err.message });
        skipped++;
      }
    }

    // Log bulk import
    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, action, entity_type, new_data) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'import', 'expense', JSON.stringify({ imported, skipped, total: transactions.length })]);

    res.json({ success: true, imported, skipped, errors: errors.slice(0, 10), message: `Imported ${imported} transactions` });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

module.exports = router;
