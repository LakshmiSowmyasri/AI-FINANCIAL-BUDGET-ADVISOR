// budget.js
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
    console.error('Budget saved but financial notification generation failed:', err);
  }
};

router.get('/categories', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [cats] = await pool.execute(
      'SELECT * FROM budget_categories WHERE user_id = ? ORDER BY name', [req.user.id]);
    res.json({ categories: cats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    // 1. Fetch user's monthly income and custom fixed total_budget
    const [userRows] = await pool.execute(
      'SELECT monthly_income, total_budget FROM users WHERE id = ?',
      [req.user.id]
    );
    const income = parseFloat(userRows[0]?.monthly_income || 0);
    const rawTotalBudget = userRows[0]?.total_budget;
    const userTotalBudget = (rawTotalBudget !== null && rawTotalBudget !== undefined && !isNaN(parseFloat(rawTotalBudget)))
      ? parseFloat(rawTotalBudget)
      : null;

    // 2. Fetch budget category aggregates
    const [budgetRows] = await pool.execute(
      'SELECT COALESCE(SUM(allocated_amount), 0) as totalAllocated, COALESCE(SUM(spent_amount), 0) as totalSpent FROM budget_categories WHERE user_id = ?',
      [req.user.id]
    );

    const totalAllocated = parseFloat(budgetRows[0]?.totalAllocated || 0);

    // Money spent: ground truth from expenses and category spent amounts
    const [[expenseRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as totalExpenses 
       FROM expenses 
       WHERE user_id = ? 
       AND MONTH(expense_date) = MONTH(CURRENT_DATE()) 
       AND YEAR(expense_date) = YEAR(CURRENT_DATE())`,
      [req.user.id]
    );
    const expensesTotal = parseFloat(expenseRow?.totalExpenses || 0);
    const categorySpentTotal = parseFloat(budgetRows[0]?.totalSpent || 0);
    const totalSpent = Math.max(expensesTotal, categorySpentTotal);

    // FIXED Total Budget:
    // When a category is added or edited, Total Budget must remain fixed.
    let totalBudget;
    if (userTotalBudget !== null && userTotalBudget > 0) {
      totalBudget = userTotalBudget;
    } else {
      // Initialize fixed total budget if not yet set
      totalBudget = income > 0 ? income : (totalAllocated > 0 ? totalAllocated : 20000);
      await pool.execute(
        'UPDATE users SET total_budget = ? WHERE id = ? AND (total_budget IS NULL OR total_budget = 0)',
        [totalBudget, req.user.id]
      );
    }

    // Remaining Budget = Total Budget - Money Spent (totalSpent)
    const remaining = totalBudget - totalSpent;
    const savingsRate = income > 0 ? Math.max(0, ((income - totalSpent) / income) * 100) : 0;

    res.json({
      totalBudget,
      totalAllocated,
      totalSpent,
      remaining,
      savingsRate
    });
  } catch (err) {
    console.error('Get budget summary error:', err);
    res.status(500).json({ error: 'Failed to get budget summary' });
  }
});

router.put('/total-budget', authenticate, async (req, res) => {
  try {
    const { totalBudget } = req.body;
    const amount = parseFloat(totalBudget);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'A valid total budget amount is required' });
    }
    const pool = getPool();
    await pool.execute(
      'UPDATE users SET total_budget = ? WHERE id = ?',
      [amount, req.user.id]
    );
    res.json({ success: true, totalBudget: amount });
  } catch (err) {
    console.error('Update total budget error:', err);
    res.status(500).json({ error: 'Failed to update total budget' });
  }
});

// POST /api/budget/what-if - Financial What-If Scenario Simulator
router.post('/what-if', authenticate, async (req, res) => {
  try {
    const { categoryName, reductionAmount, reductions = [], currentHealthScore } = req.body;
    const pool = getPool();
    const userId = req.user.id;

    // Fetch income
    const [userRows] = await pool.execute('SELECT monthly_income, total_budget FROM users WHERE id = ?', [userId]);
    const income = parseFloat(userRows[0]?.monthly_income || 0);

    // Fetch current month expenses
    const [[expRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as currentExpenses FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = MONTH(CURRENT_DATE()) AND YEAR(expense_date) = YEAR(CURRENT_DATE())`,
      [userId]
    );
    const currentExpenses = parseFloat(expRow?.currentExpenses || 0);
    const currentSavings = Math.max(0, income - currentExpenses);

    // Calculate total reduction
    let totalReduction = 0;
    const details = [];

    if (Array.isArray(reductions) && reductions.length > 0) {
      reductions.forEach(r => {
        const amt = Math.max(0, parseFloat(r.amount || 0));
        if (amt > 0) {
          totalReduction += amt;
          details.push({ category: r.category || 'General', reduction: amt });
        }
      });
    } else if (reductionAmount !== undefined && reductionAmount !== null) {
      const amt = Math.max(0, parseFloat(reductionAmount) || 0);
      totalReduction = amt;
      details.push({ category: categoryName || 'Category Spending', reduction: amt });
    }

    const newExpenses = Math.max(0, currentExpenses - totalReduction);
    const newSavings = Math.max(0, income - newExpenses);
    const monthlyImprovement = totalReduction;
    const yearlyImprovement = totalReduction * 12;

    // Wealth compound impact (12% annual return over 5 years in an index fund / SIP)
    const monthlyRate = 0.12 / 12;
    const months = 60;
    const fiveYearWealthPotential = Math.round(monthlyImprovement * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

    // Current health score vs new health score
    const currentSavingsRate = income > 0 ? (currentSavings / income) * 100 : 0;
    const newSavingsRate = income > 0 ? (newSavings / income) * 100 : 0;

    let scoreDelta = 0;
    if (newSavingsRate - currentSavingsRate >= 10) scoreDelta = 8;
    else if (newSavingsRate - currentSavingsRate >= 5) scoreDelta = 5;
    else if (monthlyImprovement > 0) scoreDelta = 3;

    // Baseline health score calculation
    let baseHealthScore = 60;
    if (currentSavingsRate > 40) baseHealthScore += 40;
    else if (currentSavingsRate > 20) baseHealthScore += 30;
    else if (currentSavingsRate > 0) baseHealthScore += 15;
    else if (currentSavingsRate < 0) baseHealthScore -= 20;

    if (currentSavings <= 0 && currentExpenses > income) baseHealthScore -= 20;

    const parsedClientScore = parseFloat(currentHealthScore);
    const effectiveBaseScore = (!isNaN(parsedClientScore) && parsedClientScore > 0)
      ? parsedClientScore
      : Math.max(0, Math.min(100, Math.round(baseHealthScore)));

    const projectedHealthScore = Math.min(100, effectiveBaseScore + scoreDelta);

    const scenarioData = {
      categoryName: categoryName || (details.length === 1 ? details[0].category : 'Multiple Categories'),
      totalReduction,
      currentSavings,
      newSavings,
      monthlyImprovement,
      yearlyImprovement,
      fiveYearWealthPotential,
      potential5YearWealth: fiveYearWealthPotential,
      currentSavingsRate: parseFloat(currentSavingsRate.toFixed(1)),
      newSavingsRate: parseFloat(newSavingsRate.toFixed(1)),
      healthScoreImprovement: scoreDelta,
      scoreDelta,
      projectedHealthScore,
      details
    };

    res.json({
      success: true,
      ...scenarioData,
      scenario: scenarioData
    });
  } catch (err) {
    console.error('What-if simulator error:', err);
    res.status(500).json({ error: 'Failed to simulate what-if scenario' });
  }
});

router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    // Fetch user categories
    const [cats] = await pool.execute(
      'SELECT name, allocated_amount, spent_amount FROM budget_categories WHERE user_id = ? ORDER BY name',
      [req.user.id]
    );

    // Fetch monthly income
    const [userRows] = await pool.execute('SELECT monthly_income FROM users WHERE id = ?', [req.user.id]);
    const income = parseFloat(userRows[0]?.monthly_income || 0);

    const recommendations = [];

    // Rule 1: Overspending in categories
    for (const cat of cats) {
      const allocated = parseFloat(cat.allocated_amount || 0);
      const spent = parseFloat(cat.spent_amount || 0);
      if (allocated > 0) {
        const ratio = spent / allocated;
        if (ratio > 1.0) {
          recommendations.push({
            type: 'budgeting',
            message: `You spent ₹${(spent - allocated).toLocaleString('en-IN')} too much on "${cat.name}" this month. Try to spend less here or move some money from another category.`,
            suggestedAllocation: spent
          });
        } else if (ratio >= 0.9) {
          recommendations.push({
            type: 'warning',
            message: `You have spent almost all of your budget for "${cat.name}" (${(ratio * 100).toFixed(0)}%). Try not to buy anything else in this category for now.`,
            potentialSavings: allocated - spent
          });
        }
      }
    }

    // Rule 2: Allocation check relative to income (50/30/20 rule)
    if (income > 0) {
      const totalBudget = cats.reduce((acc, curr) => acc + parseFloat(curr.allocated_amount || 0), 0);
      if (totalBudget > income) {
        recommendations.push({
          type: 'alert',
          message: `The total money you planned to spend (₹${totalBudget.toLocaleString('en-IN')}) is more than you make (₹${income.toLocaleString('en-IN')}). Try to lower your budget limits so you do not have to borrow money.`,
          suggestedAllocation: income
        });
      }

      // Check if saving is less than 20%
      const savingsCategory = cats.find(c => c.name.toLowerCase().includes('save') || c.name.toLowerCase().includes('invest'));
      const savingsAllocated = savingsCategory ? parseFloat(savingsCategory.allocated_amount) : 0;
      if (savingsAllocated < income * 0.20) {
        recommendations.push({
          type: 'savings',
          message: `You are saving less than one-fifth (20%) of your pay. Try to save ₹${(income * 0.2).toLocaleString('en-IN')} each month to help you buy what you want in the future.`,
          suggestedAllocation: income * 0.2
        });
      }
    }

    // If no specific recommendations, send standard healthy tips
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'info',
        message: 'Your budget looks great and you are spending within your limits. Keep up the wonderful work!',
        potentialSavings: income * 0.1
      });
      recommendations.push({
        type: 'tip',
        message: 'Try to save money automatically on the day you get paid. This is a very easy way to grow your savings.',
        suggestedAllocation: income > 0 ? income * 0.1 : 5000
      });
    }

    res.json({ recommendations });
  } catch (err) {
    console.error('Get budget recommendations error:', err);
    res.status(500).json({ error: 'Failed to get budget recommendations' });
  }
});

router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, allocatedAmount = 0, allocated_amount, color = '#059669', icon = 'wallet' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const pool = getPool();
    const id = uuidv4();
    const raw = allocatedAmount !== undefined && allocatedAmount !== '' ? allocatedAmount : allocated_amount;
    const amount = parseFloat(raw || 0);
    await pool.execute(
      'INSERT INTO budget_categories (id, user_id, name, allocated_amount, spent_amount, color, icon) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [
        id,
        req.user.id,
        name.trim(),
        isNaN(amount) ? 0 : amount,
        color || '#059669',
        icon || 'wallet'
      ]
    );
    await refreshBudgetNotifications(req.user.id);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Failed to create category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', authenticate, async (req, res) => {
  try {
    const { name, allocatedAmount, allocated_amount, color, icon } = req.body;
    const pool = getPool();

    const rawAmount = allocatedAmount !== undefined && allocatedAmount !== '' ? allocatedAmount : allocated_amount;
    const parsedAmount = (rawAmount !== undefined && rawAmount !== '' && !isNaN(parseFloat(rawAmount)))
      ? parseFloat(rawAmount)
      : null;

    await pool.execute(
      `UPDATE budget_categories SET 
        name = COALESCE(?, name), 
        allocated_amount = COALESCE(?, allocated_amount),
        color = COALESCE(?, color), 
        icon = COALESCE(?, icon) 
       WHERE id = ? AND user_id = ?`,
      [
        name !== undefined && name !== null ? name.trim() : null,
        parsedAmount,
        color !== undefined && color !== null ? color : null,
        icon !== undefined && icon !== null ? icon : null,
        req.params.id,
        req.user.id
      ]
    );
    await refreshBudgetNotifications(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM budget_categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
