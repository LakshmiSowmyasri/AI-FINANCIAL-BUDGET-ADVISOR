const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { syncBudgetNotifications } = require('../services/notificationService');

const router = express.Router();

const refreshBudgetNotifications = async userId => {
  try {
    await syncBudgetNotifications(userId);
  } catch (err) {
    console.error('Expense saved but financial notification generation failed:', err);
  }
};

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

    const [expenses] = await pool.query(query, params);

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

    await refreshBudgetNotifications(req.user.id);
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

    await refreshBudgetNotifications(req.user.id);
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

    await refreshBudgetNotifications(req.user.id);
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

// GET /api/expenses/prediction - Future Expense Prediction & Trends
router.get('/prediction', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    // 1. Fetch user's monthly income & fixed total budget
    const [userRows] = await pool.execute(
      'SELECT monthly_income, total_budget FROM users WHERE id = ?',
      [userId]
    );
    const income = parseFloat(userRows[0]?.monthly_income || 0);
    const totalBudget = parseFloat(userRows[0]?.total_budget || income || 20000);

    // 2. Date computations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = Math.max(1, now.getDate());
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = Math.max(0, totalDaysInMonth - currentDay);

    // 3. Current month actual total expenses
    const [[currentMonthRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as totalSpent, COUNT(*) as txCount
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, currentMonth, currentYear]
    );
    const currentSpent = parseFloat(currentMonthRow?.totalSpent || 0);

    // 4. Previous month total expenses
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();
    const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();

    const [[prevMonthRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as prevTotal
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, prevMonth, prevYear]
    );
    const prevMonthTotal = parseFloat(prevMonthRow?.prevTotal || 0);

    // 5. Daily cumulative actual spend for current month
    const [dailyRows] = await pool.execute(
      `SELECT DAY(expense_date) as day, SUM(amount) as dailyTotal
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?
       GROUP BY DAY(expense_date)
       ORDER BY day ASC`,
      [userId, currentMonth, currentYear]
    );

    const dailySpendMap = {};
    dailyRows.forEach(r => {
      dailySpendMap[r.day] = parseFloat(r.dailyTotal || 0);
    });

    // 6. Multi-factor Prediction Model:
    // Blend current daily velocity with historical monthly baseline
    const currentDailyPace = currentDay > 0 ? currentSpent / currentDay : 0;
    const historicalDailyPace = prevMonthTotal > 0 ? prevMonthTotal / prevMonthDays : (income > 0 ? (income * 0.6) / totalDaysInMonth : 500);

    let blendedDailyRate;
    if (currentDay >= 15) {
      blendedDailyRate = (currentDailyPace * 0.75) + (historicalDailyPace * 0.25);
    } else if (currentDay >= 7) {
      blendedDailyRate = (currentDailyPace * 0.55) + (historicalDailyPace * 0.45);
    } else {
      blendedDailyRate = (currentDailyPace * 0.35) + (historicalDailyPace * 0.65);
    }

    const predictedRemaining = blendedDailyRate * daysRemaining;
    const predictedMonthEndExpense = Math.round(currentSpent + predictedRemaining);
    const expectedSavings = Math.round(income - predictedMonthEndExpense);

    // 7. Spending Trend
    let trendPercentage = 0;
    if (prevMonthTotal > 0) {
      trendPercentage = Math.round(((predictedMonthEndExpense - prevMonthTotal) / prevMonthTotal) * 100);
    }
    const spendingTrend = trendPercentage > 8 ? 'Accelerating' : trendPercentage < -8 ? 'Decreasing' : 'Steady';

    // Daily Spending Velocity
    const velocityPerDay = Math.round(currentDay > 0 ? (currentSpent / currentDay) : blendedDailyRate);

    // 8. Day-by-Day Timeline (Actual vs Predicted)
    const timeline = [];
    let cumulativeActual = 0;
    let runningPredicted = currentSpent;
    const dailyFutureRate = daysRemaining > 0 ? predictedRemaining / daysRemaining : 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      if (day <= currentDay) {
        cumulativeActual += (dailySpendMap[day] || 0);
        timeline.push({
          day: `Day ${day}`,
          dayNumber: day,
          actual: Math.round(cumulativeActual),
          predicted: day === currentDay ? Math.round(cumulativeActual) : null,
          budgetCeiling: Math.round(totalBudget)
        });
        runningPredicted = cumulativeActual;
      } else {
        runningPredicted += dailyFutureRate;
        timeline.push({
          day: `Day ${day}`,
          dayNumber: day,
          actual: null,
          predicted: Math.round(runningPredicted),
          budgetCeiling: Math.round(totalBudget)
        });
      }
    }

    // 9. Category-level predictions
    const [catRows] = await pool.execute(
      `SELECT c.name, COALESCE(SUM(e.amount), 0) as currentCatSpent, c.allocated_amount
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.allocated_amount`,
      [currentMonth, currentYear, userId]
    );

    const categoryPredictions = catRows.map(c => {
      const currentCatSpent = parseFloat(c.currentCatSpent || 0);
      const allocated = parseFloat(c.allocated_amount || 0);
      const catDailyPace = currentDay > 0 ? currentCatSpent / currentDay : 0;
      const predictedCatTotal = Math.round(currentCatSpent + (catDailyPace * daysRemaining));
      const willExceedBudget = allocated > 0 && predictedCatTotal > allocated;

      return {
        category: c.name,
        currentSpent: currentCatSpent,
        allocatedAmount: allocated,
        predictedTotal: predictedCatTotal,
        willExceedBudget,
        riskLevel: willExceedBudget ? 'high' : (allocated > 0 && predictedCatTotal >= allocated * 0.85 ? 'moderate' : 'low')
      };
    });

    res.json({
      success: true,
      currentSpent,
      predictedMonthEndExpense,
      predictedTotal: predictedMonthEndExpense,
      expectedSavings,
      income,
      totalBudget,
      spendingTrend,
      trend: spendingTrend,
      trendPercentage,
      velocityPerDay,
      dailyVelocity: velocityPerDay,
      daysElapsed: currentDay,
      daysRemaining,
      totalDaysInMonth,
      timeline,
      categoryPredictions,
      modelUsed: 'Hybrid Velocity + Time-Weighted Regression'
    });
  } catch (err) {
    console.error('Expense prediction error:', err);
    res.status(500).json({ error: 'Failed to generate expense prediction' });
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
