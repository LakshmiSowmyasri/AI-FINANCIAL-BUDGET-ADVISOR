const express = require('express');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [notifs] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=FALSE', [req.user.id]);
    res.json({ notifications: notifs, unreadCount: count });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('UPDATE notifications SET is_read=TRUE WHERE user_id=?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all notifications as read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM notifications WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/notifications/smart-alerts - Intelligent alerts computed dynamically from user's live data
router.get('/smart-alerts', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();

    const alerts = [];

    // 1. Fetch user's total budget and monthly income
    const [userRows] = await pool.execute(
      'SELECT monthly_income, total_budget FROM users WHERE id = ?',
      [userId]
    );
    const income = parseFloat(userRows[0]?.monthly_income || 0);
    const totalBudget = parseFloat(userRows[0]?.total_budget || income || 20000);

    // 2. Budget Categories & Utilization Check
    const [categories] = await pool.execute(
      `SELECT c.id, c.name, c.allocated_amount,
              COALESCE(SUM(e.amount), 0) as currentSpent
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id
            AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.allocated_amount`,
      [currentMonth, currentYear, userId]
    );

    let totalExpenses = 0;
    categories.forEach(cat => {
      const allocated = parseFloat(cat.allocated_amount || 0);
      const spent = parseFloat(cat.currentSpent || 0);
      totalExpenses += spent;

      if (allocated > 0) {
        const utilPercent = Math.round((spent / allocated) * 100);
        if (utilPercent > 100) {
          alerts.push({
            id: `alert-cat-exceeded-${cat.id}`,
            type: 'warning',
            category: 'Budget',
            badge: 'Budget Exceeded',
            icon: '⚠️',
            message: `You have exceeded your ${cat.name} budget by ₹${(spent - allocated).toLocaleString('en-IN')} (${utilPercent}% used).`,
            severity: 'high'
          });
        } else if (utilPercent >= 80) {
          alerts.push({
            id: `alert-cat-warning-${cat.id}`,
            type: 'warning',
            category: 'Budget',
            badge: 'Approaching Limit',
            icon: '⚠️',
            message: `You have used ${utilPercent}% of your ${cat.name} budget.`,
            severity: 'medium'
          });
        }
      }
    });

    // 3. Month-over-Month Category Spending Spikes
    const [prevCatRows] = await pool.execute(
      `SELECT c.name, COALESCE(SUM(e.amount), 0) as prevSpent
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id
            AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name`,
      [prevMonth, prevYear, userId]
    );

    const prevMap = {};
    prevCatRows.forEach(r => {
      prevMap[r.name] = parseFloat(r.prevSpent || 0);
    });

    categories.forEach(cat => {
      const currentSpent = parseFloat(cat.currentSpent || 0);
      const prevSpent = prevMap[cat.name] || 0;
      if (prevSpent >= 500 && currentSpent > prevSpent) {
        const increasePercent = Math.round(((currentSpent - prevSpent) / prevSpent) * 100);
        if (increasePercent >= 15) {
          alerts.push({
            id: `alert-spike-${cat.id}`,
            type: 'info',
            category: 'Spending Trend',
            badge: 'Expense Spike',
            icon: '💡',
            message: `Your ${cat.name.toLowerCase()} expenses increased by ${increasePercent}% compared to last month.`,
            severity: 'medium'
          });
        }
      }
    });

    // 4. Savings Goals Proximity
    const [goals] = await pool.execute(
      `SELECT id, name, target_amount, current_amount, is_completed
       FROM savings_goals
       WHERE user_id = ? AND is_completed = FALSE`,
      [userId]
    );

    goals.forEach(goal => {
      const target = parseFloat(goal.target_amount || 0);
      const current = parseFloat(goal.current_amount || 0);
      const remaining = Math.max(0, target - current);
      if (remaining > 0 && (remaining <= 5000 || (target > 0 && (current / target) >= 0.75))) {
        alerts.push({
          id: `alert-goal-${goal.id}`,
          type: 'goal',
          category: 'Savings Goal',
          badge: 'Almost There',
          icon: '🎯',
          message: `You are ₹${remaining.toLocaleString('en-IN')} away from your '${goal.name}' savings goal.`,
          severity: 'low'
        });
      }
    });

    // 5. Overall Budget Adherence
    if (totalBudget > 0) {
      if (totalExpenses <= totalBudget) {
        alerts.push({
          id: 'alert-overall-budget-ok',
          type: 'success',
          category: 'Discipline',
          badge: 'On Track',
          icon: '✅',
          message: `You are currently within your overall budget (₹${(totalBudget - totalExpenses).toLocaleString('en-IN')} remaining).`,
          severity: 'low'
        });
      } else {
        alerts.push({
          id: 'alert-overall-budget-over',
          type: 'warning',
          category: 'Discipline',
          badge: 'Overall Deficit',
          icon: '⚠️',
          message: `Total expenses exceed monthly budget by ₹${(totalExpenses - totalBudget).toLocaleString('en-IN')}.`,
          severity: 'high'
        });
      }
    }

    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (err) {
    console.error('Smart alerts error:', err);
    res.status(500).json({ error: 'Failed to compute smart alerts' });
  }
});

// Internal: create notification (called by other routes)
router.createNotification = async (userId, type, title, message, actionUrl = null) => {
  try {
    await createNotification({ userId, type, title, message, actionUrl });
  } catch (err) {
    console.error('Create notification error:', err.message);
  }
};

module.exports = router;
