const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/expenses - list with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const { month, year, category, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN budget_categories c ON e.category_id = c.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];

    if (month && year) {
      query += ' AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?';
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      query += ' AND YEAR(e.expense_date) = ?';
      params.push(parseInt(year));
    }

    if (category) { query += ' AND e.category_id = ?'; params.push(category); }
    query += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [expenses] = await pool.execute(query, params);

    // Total count
    let countQuery = 'SELECT COUNT(*) as total FROM expenses e WHERE e.user_id = ?';
    const countParams = [req.user.id];
    if (month && year) { countQuery += ' AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?'; countParams.push(parseInt(month), parseInt(year)); }
    const [[{ total }]] = await pool.execute(countQuery, countParams);

    res.json({ expenses, total, hasMore: parseInt(offset) + parseInt(limit) < total });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// POST /api/expenses - add expense
router.post('/', authenticate, async (req, res) => {
  try {
    const { amount, description, categoryId, expenseDate, paymentMethod = 'cash', isRecurring = false, recurringFrequency, merchant, notes, tags } = req.body;

    if (!amount || !expenseDate) return res.status(400).json({ error: 'amount and expenseDate are required' });
    if (parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const pool = getPool();
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO expenses (id, user_id, category_id, amount, description, expense_date, payment_method, is_recurring, recurring_frequency, merchant, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, categoryId || null, parseFloat(amount), description || null,
        expenseDate, paymentMethod, isRecurring, recurringFrequency || null,
        merchant || null, notes || null, tags ? JSON.stringify(tags) : null]
    );

    // Update category spent
    if (categoryId) {
      await pool.execute(
        'UPDATE budget_categories SET spent_amount = spent_amount + ? WHERE id = ? AND user_id = ?',
        [parseFloat(amount), categoryId, req.user.id]
      );
    }

    // Audit log
    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, transaction_id, action, entity_type, new_data, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, id, 'create', 'expense',
        JSON.stringify({ amount, description, expenseDate, categoryId }),
        req.ip || req.headers['x-forwarded-for'] || null]
    );

    res.status(201).json({ success: true, expenseId: id, message: 'Expense added' });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.execute('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Expense not found' });

    const old = existing[0];
    const { amount, description, categoryId, expenseDate, paymentMethod, merchant, notes } = req.body;

    await pool.execute(
      `UPDATE expenses SET amount = ?, description = ?, category_id = ?, expense_date = ?,
       payment_method = COALESCE(?, payment_method), merchant = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [parseFloat(amount) || old.amount, description ?? old.description, categoryId ?? old.category_id,
        expenseDate || old.expense_date, paymentMethod, merchant ?? old.merchant, notes ?? old.notes,
        req.params.id, req.user.id]
    );

    // Recalculate category spent amounts
    if ((categoryId || old.category_id) && (amount !== old.amount || categoryId !== old.category_id)) {
      if (old.category_id) await pool.execute('UPDATE budget_categories SET spent_amount = GREATEST(0, spent_amount - ?) WHERE id = ? AND user_id = ?', [old.amount, old.category_id, req.user.id]);
      const newCat = categoryId || old.category_id;
      if (newCat) await pool.execute('UPDATE budget_categories SET spent_amount = spent_amount + ? WHERE id = ? AND user_id = ?', [parseFloat(amount) || old.amount, newCat, req.user.id]);
    }

    // Audit log
    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, transaction_id, action, entity_type, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, req.params.id, 'update', 'expense', JSON.stringify(old), JSON.stringify(req.body)]
    );

    res.json({ success: true, message: 'Expense updated' });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [existing] = await pool.execute('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Expense not found' });

    const exp = existing[0];
    await pool.execute('DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    if (exp.category_id) {
      await pool.execute('UPDATE budget_categories SET spent_amount = GREATEST(0, spent_amount - ?) WHERE id = ? AND user_id = ?', [exp.amount, exp.category_id, req.user.id]);
    }

    await pool.execute(
      'INSERT INTO transaction_logs (id, user_id, transaction_id, action, entity_type, old_data) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, req.params.id, 'delete', 'expense', JSON.stringify(exp)]
    );

    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/expenses/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const [[totals], [byCategory], [daily], [monthly]] = await Promise.all([
      pool.execute(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE user_id=? AND MONTH(expense_date)=? AND YEAR(expense_date)=?`, [req.user.id, month, year]),
      pool.execute(`SELECT c.name, c.color, c.icon, SUM(e.amount) as total, COUNT(e.id) as count FROM expenses e JOIN budget_categories c ON e.category_id=c.id WHERE e.user_id=? AND MONTH(e.expense_date)=? AND YEAR(e.expense_date)=? GROUP BY c.id ORDER BY total DESC`, [req.user.id, month, year]),
      pool.execute(`SELECT DAY(expense_date) as day, SUM(amount) as total FROM expenses WHERE user_id=? AND MONTH(expense_date)=? AND YEAR(expense_date)=? GROUP BY DAY(expense_date) ORDER BY day`, [req.user.id, month, year]),
      pool.execute(`SELECT YEAR(expense_date) as year, MONTH(expense_date) as month, SUM(amount) as total FROM expenses WHERE user_id=? AND expense_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH) GROUP BY YEAR(expense_date), MONTH(expense_date) ORDER BY year, month`, [req.user.id])
    ]);

    const [userRow] = await pool.execute('SELECT monthly_income FROM users WHERE id=?', [req.user.id]);
    const income = parseFloat(userRow[0]?.monthly_income || 0);
    const totalSpent = parseFloat(totals[0]?.total || 0);

    res.json({
      total: totalSpent,
      count: totals[0]?.count || 0,
      income,
      savings: income - totalSpent,
      savingsRate: income > 0 ? ((income - totalSpent) / income * 100).toFixed(1) : 0,
      byCategory: byCategory[0] || [],
      daily: daily[0] || [],
      monthly: monthly[0] || []
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// GET /api/expenses/transaction-logs
router.get('/transaction-logs', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [logs] = await pool.execute(
      'SELECT * FROM transaction_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

module.exports = router;
