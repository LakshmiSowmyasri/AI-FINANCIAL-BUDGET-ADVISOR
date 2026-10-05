const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { notifyGoalProgress } = require('../services/notificationService');

const router = express.Router();

const notifyGoalProgressSafely = async goal => {
  try {
    await notifyGoalProgress(goal);
  } catch (err) {
    console.error('Savings goal saved but notification generation failed:', err);
  }
};

// GET /api/goals - list all user savings goals with smart calculations
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [goals] = await pool.execute(
      `SELECT * FROM savings_goals WHERE user_id = ? ORDER BY is_completed ASC, deadline ASC, created_at DESC`,
      [req.user.id]
    );

    const now = new Date();
    const enrichedGoals = goals.map(goal => {
      const target = parseFloat(goal.target_amount || 0);
      const current = parseFloat(goal.current_amount || 0);
      const remaining = Math.max(0, target - current);
      const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      let monthsLeft = null;
      let requiredMonthlySavings = 0;
      let estimatedCompletionDate = null;

      if (goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        const diffTime = deadlineDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const calculatedMonths = Math.max(1, Math.ceil(diffDays / 30));
        monthsLeft = Math.max(0, calculatedMonths);

        if (remaining > 0 && monthsLeft > 0) {
          requiredMonthlySavings = Math.round(remaining / monthsLeft);
        }
      }

      // If monthly contribution exists, estimate completion
      const monthlyContribution = parseFloat(goal.monthly_contribution || 0);
      if (remaining > 0 && monthlyContribution > 0) {
        const monthsNeeded = Math.ceil(remaining / monthlyContribution);
        const estimatedDate = new Date();
        estimatedDate.setMonth(estimatedDate.getMonth() + monthsNeeded);
        estimatedCompletionDate = estimatedDate.toISOString().split('T')[0];
      } else if (goal.deadline) {
        estimatedCompletionDate = new Date(goal.deadline).toISOString().split('T')[0];
      }

      const isCompleted = current >= target && target > 0;

      return {
        id: goal.id,
        name: goal.name,
        targetAmount: target,
        currentAmount: current,
        remainingAmount: remaining,
        progressPercent,
        deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : null,
        priority: goal.priority || 'medium',
        category: goal.category || 'general',
        monthlyContribution,
        requiredMonthlySavings,
        monthsLeft,
        estimatedCompletionDate,
        isCompleted: Boolean(goal.is_completed || isCompleted),
        createdAt: goal.created_at
      };
    });

    const totalTarget = enrichedGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = enrichedGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalRemaining = enrichedGoals.reduce((sum, g) => sum + g.remainingAmount, 0);
    const completedCount = enrichedGoals.filter(g => g.isCompleted).length;

    res.json({
      goals: enrichedGoals,
      summary: {
        totalGoals: enrichedGoals.length,
        completedGoals: completedCount,
        activeGoals: enrichedGoals.length - completedCount,
        totalTarget,
        totalCurrent,
        totalRemaining,
        overallProgress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

// POST /api/goals - create a new goal
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount = 0, deadline, priority = 'medium', category = 'general', monthlyContribution = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Goal name is required' });
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({ error: 'Valid target amount is required' });
    }

    const current = Math.max(0, parseFloat(currentAmount) || 0);
    const monthly = Math.max(0, parseFloat(monthlyContribution) || 0);
    const id = uuidv4();
    const pool = getPool();

    await pool.execute(
      `INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, priority, category, monthly_contribution, is_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        name.trim(),
        target,
        current,
        deadline || null,
        priority,
        category,
        monthly,
        current >= target ? 1 : 0
      ]
    );

    await notifyGoalProgressSafely({
      userId: req.user.id,
      goalId: id,
      goalName: name.trim(),
      currentAmount: current,
      targetAmount: target,
      pool
    });
    res.status(201).json({ success: true, id, message: 'Savings goal created' });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

// PUT /api/goals/:id - update an existing goal
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, deadline, priority, category, monthlyContribution } = req.body;
    const pool = getPool();

    const target = targetAmount !== undefined ? parseFloat(targetAmount) : null;
    const current = currentAmount !== undefined ? parseFloat(currentAmount) : null;
    const monthly = monthlyContribution !== undefined ? parseFloat(monthlyContribution) : null;

    let isCompleted = null;
    if (target !== null && current !== null) {
      isCompleted = current >= target ? 1 : 0;
    }

    await pool.execute(
      `UPDATE savings_goals SET
        name = COALESCE(?, name),
        target_amount = COALESCE(?, target_amount),
        current_amount = COALESCE(?, current_amount),
        deadline = COALESCE(?, deadline),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        monthly_contribution = COALESCE(?, monthly_contribution),
        is_completed = COALESCE(?, is_completed)
       WHERE id = ? AND user_id = ?`,
      [
        name ? name.trim() : null,
        target,
        current,
        deadline || null,
        priority || null,
        category || null,
        monthly,
        isCompleted,
        req.params.id,
        req.user.id
      ]
    );

    const [updatedGoals] = await pool.execute(
      'SELECT id, name, current_amount, target_amount FROM savings_goals WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (updatedGoals.length) {
      const goal = updatedGoals[0];
      await notifyGoalProgressSafely({
        userId: req.user.id,
        goalId: goal.id,
        goalName: goal.name,
        currentAmount: goal.current_amount,
        targetAmount: goal.target_amount,
        pool
      });
    }
    res.json({ success: true, message: 'Savings goal updated' });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
});

// POST /api/goals/:id/deposit - add savings to goal
router.post('/:id/deposit', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'A valid deposit amount is required' });
    }

    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT name, current_amount, target_amount FROM savings_goals WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const newCurrent = parseFloat(rows[0].current_amount || 0) + depositAmount;
    const target = parseFloat(rows[0].target_amount || 0);
    const isCompleted = newCurrent >= target ? 1 : 0;

    await pool.execute(
      `UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ? AND user_id = ?`,
      [newCurrent, isCompleted, req.params.id, req.user.id]
    );

    await notifyGoalProgressSafely({
      userId: req.user.id,
      goalId: req.params.id,
      goalName: rows[0].name,
      currentAmount: newCurrent,
      targetAmount: target,
      pool
    });
    res.json({
      success: true,
      currentAmount: newCurrent,
      isCompleted: Boolean(isCompleted),
      message: `Deposited ₹${depositAmount.toLocaleString('en-IN')}`
    });
  } catch (err) {
    console.error('Goal deposit error:', err);
    res.status(500).json({ error: 'Failed to add funds to goal' });
  }
});

// DELETE /api/goals/:id - delete a goal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute(
      `DELETE FROM savings_goals WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

module.exports = router;
