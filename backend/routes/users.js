// ============================================================
// users.js
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { predictFinancialHealth } = require('../services/mlService');

const router = express.Router();


// ============================================================
// GET /api/users/profile
// ============================================================

router.get('/profile', authenticate, async (req, res) => {
  try {
    const pool = getPool();

    const [users] = await pool.execute(
      `SELECT 
        id,
        name,
        email,
        phone,
        monthly_income,
        currency,
        risk_profile,
        occupation,
        date_of_birth,
        is_email_verified,
        created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: users[0]
    });

  } catch (err) {
    console.error('Get profile error:', err);

    res.status(500).json({
      error: 'Failed to get profile'
    });
  }
});


// ============================================================
// PUT /api/users/profile
// ============================================================

router.put('/profile', authenticate, async (req, res) => {
  try {
    const pool = getPool();

    const {
      name,
      phone,
      monthlyIncome,
      currency,
      riskProfile,
      occupation,
      dateOfBirth
    } = req.body;

    await pool.execute(
      `UPDATE users
       SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        monthly_income = COALESCE(?, monthly_income),
        currency = COALESCE(?, currency),
        risk_profile = COALESCE(?, risk_profile),
        occupation = COALESCE(?, occupation),
        date_of_birth = COALESCE(?, date_of_birth),
        updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        phone,
        monthlyIncome ? parseFloat(monthlyIncome) : null,
        currency,
        riskProfile,
        occupation,
        dateOfBirth,
        req.user.id
      ]
    );

    res.json({
      success: true,
      message: 'Profile updated'
    });

  } catch (err) {
    console.error('Update profile error:', err);

    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});


// ============================================================
// PUT /api/users/change-password
// ============================================================

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Both fields required'
      });
    }

    const pool = getPool();

    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      users[0].password
    );

    if (!valid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await pool.execute(
      `UPDATE users
       SET password = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        hash,
        req.user.id
      ]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error('Change password error:', err);

    res.status(500).json({
      error: 'Failed to change password'
    });
  }
});


// ============================================================
// DELETE /api/users/account
// ============================================================

router.delete('/account', authenticate, async (req, res) => {
  try {
    const {
      password
    } = req.body;

    const pool = getPool();

    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const valid = await bcrypt.compare(
      password,
      users[0].password
    );

    if (!valid) {
      return res.status(400).json({
        error: 'Incorrect password'
      });
    }

    await pool.execute(
      `UPDATE users
       SET is_active = FALSE
       WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Account deactivated'
    });

  } catch (err) {
    console.error('Deactivate account error:', err);

    res.status(500).json({
      error: 'Failed to deactivate account'
    });
  }
});


// ============================================================
// GET /api/users/dashboard
// ============================================================

router.get('/dashboard', authenticate, async (req, res) => {
  try {

    const pool = getPool();

    // ========================================================
    // 1. Get monthly income and user information
    // ========================================================

    const [users] = await pool.execute(
      `SELECT
        monthly_income,
        occupation,
        date_of_birth
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const monthlyIncome =
      parseFloat(users[0].monthly_income || 0);


    // ========================================================
    // 2. Calculate current month total expenses
    // ========================================================

    const [[totals]] = await pool.execute(
      `SELECT
        COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = ?
       AND MONTH(expense_date) = MONTH(CURRENT_DATE())
       AND YEAR(expense_date) = YEAR(CURRENT_DATE())`,
      [req.user.id]
    );

    const totalExpenses =
      parseFloat(totals.total || 0);


    // ========================================================
    // 3. Calculate remaining money and savings rate
    // ========================================================

    const remaining =
      monthlyIncome - totalExpenses;

    const savingsRate =
      monthlyIncome > 0
        ? (remaining / monthlyIncome) * 100
        : 0;


    // ========================================================
    // 4. Get category expenses
    // ========================================================

    const [categoryExpenses] = await pool.execute(
      `SELECT
        c.name,
        COALESCE(SUM(e.amount), 0) AS amount,
        c.color
       FROM budget_categories c

       LEFT JOIN expenses e
       ON e.category_id = c.id
       AND MONTH(e.expense_date) = MONTH(CURRENT_DATE())
       AND YEAR(e.expense_date) = YEAR(CURRENT_DATE())

       WHERE c.user_id = ?

       GROUP BY
        c.id,
        c.name,
        c.color

       ORDER BY amount DESC`,
      [req.user.id]
    );

    categoryExpenses.forEach(category => {
      category.amount =
        parseFloat(category.amount || 0);
    });


    // ========================================================
    // 5. Get recent expenses
    // ========================================================

    const [recentExpenses] = await pool.execute(
      `SELECT
        e.id,
        e.description,
        e.amount,
        c.name AS category_name,
        c.color AS category_color,
        e.expense_date

       FROM expenses e

       LEFT JOIN budget_categories c
       ON e.category_id = c.id

       WHERE e.user_id = ?

       ORDER BY
        e.expense_date DESC,
        e.created_at DESC

       LIMIT 10`,
      [req.user.id]
    );

    recentExpenses.forEach(expense => {
      expense.amount =
        parseFloat(expense.amount || 0);
    });


    // ========================================================
    // 6. Existing heuristic financial health score
    // ========================================================

    let score = 60;

    if (savingsRate > 40) {

      score += 40;

    } else if (savingsRate > 20) {

      score += 30;

    } else if (savingsRate > 0) {

      score += 15;

    } else if (savingsRate < 0) {

      score -= 20;
    }


    if (remaining < 0) {
      score -= 20;
    }


    // ========================================================
    // 7. Check overspending categories
    // ========================================================

    const [categories] = await pool.execute(
      `SELECT
        allocated_amount,
        spent_amount
       FROM budget_categories
       WHERE user_id = ?`,
      [req.user.id]
    );

    let overspentCount = 0;

    categories.forEach(category => {

      if (
        parseFloat(category.spent_amount || 0) >
        parseFloat(category.allocated_amount || 0)
      ) {
        overspentCount++;
      }

    });


    if (
      overspentCount === 0 &&
      categories.length > 0
    ) {

      score += 15;

    } else {

      score -= overspentCount * 5;
    }


    const financialHealthScore =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(score)
        )
      );


    // ========================================================
    // 8. Prepare XGBoost features
    // ========================================================

    /*
      The ML model was trained using these features:

      Income
      Age
      Dependents
      Rent
      Loan_Repayment
      Insurance
      Groceries
      Transport
      Eating_Out
      Entertainment
      Utilities
      Healthcare
      Education
      Miscellaneous
      Desired_Savings_Percentage
      Desired_Savings
      Disposable_Income
      Total_Expenses
      Savings
      Savings_Rate
      Expense_Ratio
    */


    // --------------------------------------------------------
    // Calculate category-wise values
    // --------------------------------------------------------

    const categoryValues = {

      Rent: 0,
      Loan_Repayment: 0,
      Insurance: 0,
      Groceries: 0,
      Transport: 0,
      Eating_Out: 0,
      Entertainment: 0,
      Utilities: 0,
      Healthcare: 0,
      Education: 0,
      Miscellaneous: 0

    };


    // --------------------------------------------------------
    // Map database category names to ML feature names
    // --------------------------------------------------------

    categoryExpenses.forEach(category => {

      const name =
        String(category.name || '')
          .trim()
          .toLowerCase();

      const amount =
        parseFloat(category.amount || 0);


      if (name.includes('rent') ||
          name.includes('housing')) {

        categoryValues.Rent += amount;

      } else if (
        name.includes('loan') ||
        name.includes('emi')
      ) {

        categoryValues.Loan_Repayment += amount;

      } else if (
        name.includes('insurance')
      ) {

        categoryValues.Insurance += amount;

      } else if (
        name.includes('grocery') ||
        name.includes('groceries')
      ) {

        categoryValues.Groceries += amount;

      } else if (
        name.includes('transport') ||
        name.includes('travel')
      ) {

        categoryValues.Transport += amount;

      } else if (
        name.includes('eating') ||
        name.includes('restaurant') ||
        name.includes('food')
      ) {

        categoryValues.Eating_Out += amount;

      } else if (
        name.includes('entertainment') ||
        name.includes('movie') ||
        name.includes('fun')
      ) {

        categoryValues.Entertainment += amount;

      } else if (
        name.includes('utilit')
      ) {

        categoryValues.Utilities += amount;

      } else if (
        name.includes('health') ||
        name.includes('medical')
      ) {

        categoryValues.Healthcare += amount;

      } else if (
        name.includes('education') ||
        name.includes('school') ||
        name.includes('college')
      ) {

        categoryValues.Education += amount;

      } else {

        categoryValues.Miscellaneous += amount;

      }

    });


    // ========================================================
    // 9. Calculate ML derived features
    // ========================================================

    const expenseRatio =
      monthlyIncome > 0
        ? (totalExpenses / monthlyIncome) * 100
        : 0;


    const desiredSavingsPercentage = 20;


    const desiredSavings =
      monthlyIncome *
      (desiredSavingsPercentage / 100);


    const disposableIncome =
      remaining;


    // ========================================================
    // 10. Prepare data for XGBoost
    // ========================================================

    const mlData = {

      Income: monthlyIncome,

      /*
        These values are not currently stored in the
        dashboard database query.

        We use safe defaults for now.
      */

      Age: 30,

      Dependents: 0,


      Rent:
        categoryValues.Rent,

      Loan_Repayment:
        categoryValues.Loan_Repayment,

      Insurance:
        categoryValues.Insurance,

      Groceries:
        categoryValues.Groceries,

      Transport:
        categoryValues.Transport,

      Eating_Out:
        categoryValues.Eating_Out,

      Entertainment:
        categoryValues.Entertainment,

      Utilities:
        categoryValues.Utilities,

      Healthcare:
        categoryValues.Healthcare,

      Education:
        categoryValues.Education,

      Miscellaneous:
        categoryValues.Miscellaneous,


      Desired_Savings_Percentage:
        desiredSavingsPercentage,

      Desired_Savings:
        desiredSavings,

      Disposable_Income:
        disposableIncome,

      Total_Expenses:
        totalExpenses,

      Savings:
        remaining,

      Savings_Rate:
        savingsRate,

      Expense_Ratio:
        expenseRatio
    };


    // ========================================================
    // 11. Call XGBoost ML API
    // ========================================================

    let mlPrediction = null;

    try {

      mlPrediction =
        await predictFinancialHealth(
          mlData
        );

    } catch (mlError) {

      console.error(
        'XGBoost prediction failed:',
        mlError.message
      );

    }


    // ========================================================
    // 12. Final dashboard response
    // ========================================================

    res.json({

      monthlyIncome,

      totalExpenses,

      remaining,

      savingsRate,

      financialHealthScore,


      // ======================================================
      // XGBoost results
      // ======================================================

      financialHealthPrediction:
        mlPrediction?.prediction || null,

      financialHealthConfidence:
        mlPrediction?.confidence || null,


      // ======================================================
      // Existing dashboard data
      // ======================================================

      categoryExpenses,

      recentExpenses

    });


  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// ============================================================
// GET /api/users/financial-health-score - Detailed Breakdown out of 100
// ============================================================
router.get('/financial-health-score', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Fetch user income
    const [userRows] = await pool.execute(
      'SELECT monthly_income, total_budget FROM users WHERE id = ?',
      [userId]
    );
    const income = parseFloat(userRows[0]?.monthly_income || 0);

    // 2. Fetch current month expenses
    const [[expenseRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as totalSpent, COUNT(*) as txCount
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, currentMonth, currentYear]
    );
    const totalSpent = parseFloat(expenseRow?.totalSpent || 0);
    const savings = Math.max(0, income - totalSpent);
    const savingsRate = income > 0 ? ((income - totalSpent) / income) * 100 : 0;
    const expenseRatio = income > 0 ? (totalSpent / income) * 100 : 0;

    // 3. Fetch budget categories
    const [categories] = await pool.execute(
      `SELECT c.id, c.name, c.allocated_amount, COALESCE(SUM(e.amount), 0) as spent
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id
            AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.allocated_amount`,
      [currentMonth, currentYear, userId]
    );

    let overspentCount = 0;
    categories.forEach(c => {
      const allocated = parseFloat(c.allocated_amount || 0);
      const spent = parseFloat(c.spent || 0);
      if (allocated > 0 && spent > allocated) overspentCount++;
    });

    // 4. Fetch savings goals
    const [goals] = await pool.execute(
      'SELECT id, name, target_amount, current_amount, is_completed FROM savings_goals WHERE user_id = ?',
      [userId]
    );
    const activeGoals = goals.filter(g => !g.is_completed);
    const hasGoalsWithProgress = goals.some(g => parseFloat(g.current_amount || 0) > 0);

    // Pillar 1: Savings Rate (max 25)
    let p1Score = 0;
    let p1Status = 'Needs Work';
    let p1Message = 'You are currently spending all or more than your earnings.';
    let p1Tip = 'Aim to save at least 20% of your paycheck automatically each month.';
    if (savingsRate >= 30) {
      p1Score = 25;
      p1Status = 'Excellent';
      p1Message = `Outstanding savings rate of ${savingsRate.toFixed(1)}%.`;
      p1Tip = 'Keep redirecting surplus into diversified index funds and SIPs.';
    } else if (savingsRate >= 20) {
      p1Score = 21;
      p1Status = 'Strong';
      p1Message = `Solid savings rate of ${savingsRate.toFixed(1)}%, beating the 20% rule.`;
      p1Tip = 'Continue steady monthly contributions to your emergency fund.';
    } else if (savingsRate >= 10) {
      p1Score = 15;
      p1Status = 'Moderate';
      p1Message = `You are saving ${savingsRate.toFixed(1)}% of your income.`;
      p1Tip = 'Look at discretionary dining or shopping to push savings above 20%.';
    } else if (savingsRate > 0) {
      p1Score = 9;
      p1Status = 'Low';
      p1Message = `Only ${savingsRate.toFixed(1)}% saved this month.`;
      p1Tip = 'Trim non-essential subscriptions and set a strict weekend limit.';
    }

    // Pillar 2: Budget Adherence (max 20)
    let p2Score = 20;
    let p2Status = 'Disciplined';
    let p2Message = 'All budget categories are strictly within limits.';
    let p2Tip = 'Keep reviewing category utilization to avoid end-of-month surprises.';
    if (overspentCount === 1) {
      p2Score = 14;
      p2Status = 'Minor Leak';
      p2Message = '1 category exceeded its monthly budget.';
      p2Tip = 'Reallocate funds from unused categories to cover the deficit.';
    } else if (overspentCount === 2) {
      p2Score = 8;
      p2Status = 'Warning';
      p2Message = '2 categories have exceeded their monthly allocation.';
      p2Tip = 'Pause non-critical discretionary spending in these categories.';
    } else if (overspentCount > 2) {
      p2Score = 3;
      p2Status = 'Overbudget';
      p2Message = `${overspentCount} categories have breached their budget limits.`;
      p2Tip = 'Re-evaluate and calibrate monthly category limits.';
    } else if (categories.length === 0) {
      p2Score = 12;
      p2Status = 'Unconfigured';
      p2Message = 'No budget categories configured yet.';
      p2Tip = 'Set up category budgets to take full control of monthly expenses.';
    }

    // Pillar 3: Expense-to-Income Ratio (max 20)
    let p3Score = 0;
    let p3Status = 'High Burden';
    let p3Message = `Expenses consume ${expenseRatio.toFixed(1)}% of your monthly earnings.`;
    let p3Tip = 'Try to keep living costs below 70% of your earnings.';
    if (expenseRatio <= 50) {
      p3Score = 20;
      p3Status = 'Optimal';
      p3Message = `Living on only ${expenseRatio.toFixed(1)}% of income.`;
      p3Tip = 'Ideal position for accelerated wealth compounding.';
    } else if (expenseRatio <= 70) {
      p3Score = 16;
      p3Status = 'Balanced';
      p3Message = `Living costs are at ${expenseRatio.toFixed(1)}% of income.`;
      p3Tip = 'Well within sustainable living boundaries.';
    } else if (expenseRatio <= 90) {
      p3Score = 10;
      p3Status = 'Stretched';
      p3Message = `${expenseRatio.toFixed(1)}% of your income is committed.`;
      p3Tip = 'Careful monitoring advised to prevent accidental debt accumulation.';
    }

    // Pillar 4: Emergency Cushion (max 15)
    let p4Score = 4;
    let p4Status = 'Limited Buffer';
    let p4Message = 'Net surplus is minimal relative to monthly living costs.';
    let p4Tip = 'Build at least a 3-month emergency reserve in a liquid account.';
    if (savings >= totalSpent && totalSpent > 0) {
      p4Score = 15;
      p4Status = 'Resilient';
      p4Message = 'Net monthly savings exceed total expenses.';
      p4Tip = 'Excellent buffer against unexpected financial shocks.';
    } else if (savings >= totalSpent * 0.5) {
      p4Score = 11;
      p4Status = 'Moderate Buffer';
      p4Message = 'Healthy liquid buffer being accumulated.';
      p4Tip = 'Automate recurring monthly transfers to your emergency reserve.';
    } else if (savings > 0) {
      p4Score = 7;
      p4Status = 'Developing';
      p4Message = 'Positive cash flow maintained this cycle.';
      p4Tip = 'Keep growing the buffer before taking major discretionary commitments.';
    }

    // Pillar 5: Spending Consistency (max 10)
    const p5Score = totalSpent > 0 ? 9 : 6;
    const p5Status = 'Steady';
    const p5Message = 'Consistent spending cadence maintained across cycles.';
    const p5Tip = 'Smooth out large spikes by planning periodic bills in advance.';

    // Pillar 6: Financial Goals Progress (max 10)
    let p6Score = 3;
    let p6Status = 'Needs Focus';
    let p6Message = 'No active savings goals with committed funds.';
    let p6Tip = 'Create a targeted savings goal (e.g. Laptop, Travel, Emergency Fund).';
    if (hasGoalsWithProgress) {
      p6Score = 10;
      p6Status = 'Active & Funded';
      p6Message = `${goals.length} goals created with active progress.`;
      p6Tip = 'Maintain monthly deposits to meet your target dates on schedule.';
    } else if (goals.length > 0) {
      p6Score = 6;
      p6Status = 'Goals Set';
      p6Message = `${goals.length} goals defined, waiting for contributions.`;
      p6Tip = 'Allocate even ₹1,000 to kickstart momentum.';
    }

    const totalScore = Math.min(100, Math.max(0, p1Score + p2Score + p3Score + p4Score + p5Score + p6Score));
    const status = totalScore >= 75 ? 'Healthy' : totalScore >= 50 ? 'Average' : 'Needs Attention';

    const breakdown = [
      {
        pillar: 'Savings Rate',
        score: p1Score,
        maxScore: 25,
        status: p1Status,
        message: p1Message,
        actionTip: p1Tip,
        icon: '💰'
      },
      {
        pillar: 'Budget Adherence',
        score: p2Score,
        maxScore: 20,
        status: p2Status,
        message: p2Message,
        actionTip: p2Tip,
        icon: '🎯'
      },
      {
        pillar: 'Expense-to-Income Ratio',
        score: p3Score,
        maxScore: 20,
        status: p3Status,
        message: p3Message,
        actionTip: p3Tip,
        icon: '⚖️'
      },
      {
        pillar: 'Emergency Cushion',
        score: p4Score,
        maxScore: 15,
        status: p4Status,
        message: p4Message,
        actionTip: p4Tip,
        icon: '🛡️'
      },
      {
        pillar: 'Spending Consistency',
        score: p5Score,
        maxScore: 10,
        status: p5Status,
        message: p5Message,
        actionTip: p5Tip,
        icon: '📊'
      },
      {
        pillar: 'Goal Progression',
        score: p6Score,
        maxScore: 10,
        status: p6Status,
        message: p6Message,
        actionTip: p6Tip,
        icon: '🏆'
      }
    ];

    res.json({
      score: totalScore,
      status,
      rating: status,
      breakdown,
      summary: {
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        expenseRatio: parseFloat(expenseRatio.toFixed(1)),
        overspentCategories: overspentCount,
        activeGoals: activeGoals.length
      }
    });
  } catch (err) {
    console.error('Financial health score error:', err);
    res.status(500).json({ error: 'Failed to calculate financial health score' });
  }
});

// ============================================================
// GET /api/users/achievements - Professional Milestone Badges
// ============================================================
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    // 1. Fetch user data
    const [userRows] = await pool.execute('SELECT monthly_income FROM users WHERE id = ?', [userId]);
    const income = parseFloat(userRows[0]?.monthly_income || 0);

    // 2. Fetch total lifetime expenses & current month
    const [[allTimeExp]] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as totalSpent, COUNT(*) as txCount FROM expenses WHERE user_id = ?',
      [userId]
    );
    const txCount = parseInt(allTimeExp?.txCount || 0);

    // 3. Current month expenses & budget adherence
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [[currentSpentRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as spent FROM expenses WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, currentMonth, currentYear]
    );
    const currentMonthSpent = parseFloat(currentSpentRow?.spent || 0);
    const currentNetSavings = Math.max(0, income - currentMonthSpent);

    // 4. Overspent categories check
    const [catRows] = await pool.execute(
      `SELECT c.allocated_amount, COALESCE(SUM(e.amount), 0) as spent
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.allocated_amount`,
      [currentMonth, currentYear, userId]
    );
    const overspentCount = catRows.filter(c => parseFloat(c.allocated_amount || 0) > 0 && parseFloat(c.spent || 0) > parseFloat(c.allocated_amount || 0)).length;

    // 5. Savings goals
    const [goals] = await pool.execute('SELECT id, current_amount, target_amount, is_completed FROM savings_goals WHERE user_id = ?', [userId]);
    const goalsCount = goals.length;
    const completedGoalsCount = goals.filter(g => g.is_completed).length;

    // 6. Investments
    const [invRows] = await pool.execute('SELECT COUNT(*) as count FROM investments WHERE user_id = ?', [userId]);
    const investmentsCount = parseInt(invRows[0]?.count || 0);

    // Milestones definitions
    const achievements = [
      {
        id: 'first_goal',
        title: 'First Savings Goal',
        description: 'Created your first dedicated savings target',
        icon: '🏆',
        category: 'Goals',
        unlocked: goalsCount >= 1,
        progress: Math.min(1, goalsCount),
        target: 1,
        unlockedAt: goalsCount >= 1 ? 'Earned' : null
      },
      {
        id: 'saved_10k',
        title: 'Saved ₹10,000',
        description: 'Accumulated over ₹10,000 in monthly net savings',
        icon: '💰',
        category: 'Savings',
        unlocked: currentNetSavings >= 10000,
        progress: Math.min(10000, Math.round(currentNetSavings)),
        target: 10000,
        unlockedAt: currentNetSavings >= 10000 ? 'Earned' : null
      },
      {
        id: 'under_budget',
        title: 'Stayed Under Budget',
        description: 'Maintained every category limit without overspending',
        icon: '🎯',
        category: 'Discipline',
        unlocked: overspentCount === 0 && catRows.length > 0 && currentMonthSpent > 0,
        progress: overspentCount === 0 ? 1 : 0,
        target: 1,
        unlockedAt: overspentCount === 0 && currentMonthSpent > 0 ? 'Active' : null
      },
      {
        id: 'active_tracker',
        title: 'Consistent Tracker',
        description: 'Logged 5 or more expenses to keep data fresh',
        icon: '🔥',
        category: 'Activity',
        unlocked: txCount >= 5,
        progress: Math.min(5, txCount),
        target: 5,
        unlockedAt: txCount >= 5 ? 'Earned' : null
      },
      {
        id: 'smart_investor',
        title: 'Smart Investor',
        description: 'Added an investment or SIP plan to your portfolio',
        icon: '📈',
        category: 'Wealth',
        unlocked: investmentsCount >= 1,
        progress: Math.min(1, investmentsCount),
        target: 1,
        unlockedAt: investmentsCount >= 1 ? 'Earned' : null
      },
      {
        id: 'goal_crusher',
        title: 'Goal Crusher',
        description: 'Reached 100% completion on a savings goal',
        icon: '⭐',
        category: 'Goals',
        unlocked: completedGoalsCount >= 1,
        progress: Math.min(1, completedGoalsCount),
        target: 1,
        unlockedAt: completedGoalsCount >= 1 ? 'Earned' : null
      }
    ];

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    res.json({
      achievements,
      totalCount: achievements.length,
      unlockedCount,
      percentageUnlocked: Math.round((unlockedCount / achievements.length) * 100)
    });
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ============================================================
// GET /api/users/monthly-report - Comprehensive Monthly Report
// ============================================================
router.get('/monthly-report', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const now = new Date();
    const month = parseInt(req.query.month || (now.getMonth() + 1));
    const year = parseInt(req.query.year || now.getFullYear());

    // 1. User Profile
    const [userRows] = await pool.execute(
      'SELECT name, email, monthly_income, currency, risk_profile, total_budget FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0] || {};
    const income = parseFloat(user.monthly_income || 0);
    const totalBudget = parseFloat(user.total_budget || income || 20000);

    // 2. Current Month Total Expenses
    const [[currentSpentRow]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as totalSpent, COUNT(*) as txCount
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, month, year]
    );
    const totalSpent = parseFloat(currentSpentRow?.totalSpent || 0);
    const netSavings = Math.max(0, income - totalSpent);
    const savingsRate = income > 0 ? ((income - totalSpent) / income) * 100 : 0;

    // 3. Category Breakdown
    const [categories] = await pool.execute(
      `SELECT c.id, c.name, c.color, c.allocated_amount,
              COALESCE(SUM(e.amount), 0) as spent
       FROM budget_categories c
       LEFT JOIN expenses e ON e.category_id = c.id
            AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.color, c.allocated_amount
       ORDER BY spent DESC`,
      [month, year, userId]
    );

    let highestCategory = null;
    if (categories.length > 0 && parseFloat(categories[0].spent) > 0) {
      const topSpent = parseFloat(categories[0].spent);
      highestCategory = {
        name: categories[0].name,
        amount: topSpent,
        percentage: totalSpent > 0 ? Math.round((topSpent / totalSpent) * 100) : 0
      };
    }

    // 4. Weekly Breakdown (Weeks 1, 2, 3, 4)
    const [weeklyRows] = await pool.execute(
      `SELECT
         CASE
           WHEN DAY(expense_date) BETWEEN 1 AND 7 THEN 'Week 1'
           WHEN DAY(expense_date) BETWEEN 8 AND 14 THEN 'Week 2'
           WHEN DAY(expense_date) BETWEEN 15 AND 21 THEN 'Week 3'
           ELSE 'Week 4'
         END as weekName,
         COALESCE(SUM(amount), 0) as amount
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?
       GROUP BY weekName
       ORDER BY weekName ASC`,
      [userId, month, year]
    );

    // 5. Goals Summary
    const [goals] = await pool.execute(
      'SELECT name, target_amount, current_amount, is_completed, deadline FROM savings_goals WHERE user_id = ?',
      [userId]
    );

    // 6. Heuristic Health Score for report
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    let reportHealthScore = 65;
    if (savingsRate >= 20) reportHealthScore += 20;
    else if (savingsRate > 0) reportHealthScore += 10;
    if (budgetUtilization <= 100) reportHealthScore += 15;
    reportHealthScore = Math.min(100, Math.max(0, reportHealthScore));

    // 7. Structured AI recommendations
    const aiRecommendations = [];
    if (savingsRate < 20 && income > 0) {
      aiRecommendations.push({
        type: 'Savings Optimization',
        recommendation: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim to divert an additional ₹${Math.round(income * 0.05).toLocaleString('en-IN')} (5%) into savings on salary day.`,
        priority: 'High'
      });
    }
    if (highestCategory && highestCategory.percentage > 40) {
      aiRecommendations.push({
        type: 'Category Concentration',
        recommendation: `"${highestCategory.name}" accounts for ${highestCategory.percentage}% of your expenses. Setting a ₹${Math.round(highestCategory.amount * 0.85).toLocaleString('en-IN')} cap can save ₹${Math.round(highestCategory.amount * 0.15).toLocaleString('en-IN')} next month.`,
        priority: 'Medium'
      });
    }
    if (budgetUtilization > 95) {
      aiRecommendations.push({
        type: 'Budget Preservation',
        recommendation: `You have consumed ${budgetUtilization}% of your monthly budget. Pause discretionary entertainment until the new cycle starts.`,
        priority: 'High'
      });
    } else {
      aiRecommendations.push({
        type: 'Wealth Acceleration',
        recommendation: `Budget utilization is healthy at ${budgetUtilization}%. Consider starting an automated SIP for the surplus balance.`,
        priority: 'Low'
      });
    }

    res.json({
      success: true,
      report: {
        user: {
          name: user.name || 'Member',
          email: user.email,
          currency: user.currency || 'INR',
          riskProfile: user.risk_profile || 'Moderate'
        },
        period: {
          month,
          year,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
        },
        financials: {
          income,
          totalBudget,
          totalSpent,
          netSavings,
          savingsRate: parseFloat(savingsRate.toFixed(1)),
          budgetUtilization
        },
        highestCategory,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          color: c.color,
          allocated: parseFloat(c.allocated_amount || 0),
          spent: parseFloat(c.spent || 0),
          utilization: parseFloat(c.allocated_amount || 0) > 0 ? Math.round((parseFloat(c.spent || 0) / parseFloat(c.allocated_amount || 0)) * 100) : 0
        })),
        weeklyBreakdown: weeklyRows.map(w => ({
          week: w.weekName,
          amount: parseFloat(w.amount || 0)
        })),
        goalsSummary: {
          total: goals.length,
          completed: goals.filter(g => g.is_completed).length,
          totalSaved: goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0)
        },
        healthScore: reportHealthScore,
        healthStatus: reportHealthScore >= 75 ? 'Healthy' : reportHealthScore >= 50 ? 'Average' : 'Needs Attention',
        aiRecommendations
      }
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to generate monthly financial report' });
  }
});

module.exports = router;