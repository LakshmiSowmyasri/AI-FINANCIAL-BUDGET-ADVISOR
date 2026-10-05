const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const { getPool } = require('../database/connection');

const formatINR = amount => Number(amount).toLocaleString('en-IN', {
  maximumFractionDigits: 2
});

const createNotification = async ({
  userId,
  type,
  title,
  message,
  actionUrl = null,
  dedupeKey = null,
  pool = getPool()
}) => {
  const id = dedupeKey
    ? uuidv5(`${userId}:${dedupeKey}`, uuidv5.URL)
    : uuidv4();

  const [result] = await pool.execute(
    `INSERT INTO notifications (id, user_id, type, title, message, action_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       message = VALUES(message),
       action_url = VALUES(action_url)`,
    [id, userId, type, title, message, actionUrl]
  );

  return result.affectedRows > 0;
};

const syncBudgetNotifications = async (userId, pool = getPool(), now = new Date()) => {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const previousDate = new Date(year, month - 2, 1);
  const previousMonth = previousDate.getMonth() + 1;
  const previousYear = previousDate.getFullYear();

  const [categories] = await pool.execute(
    `SELECT c.id, c.name, c.allocated_amount,
            COALESCE(SUM(e.amount), 0) AS currentSpent
     FROM budget_categories c
     LEFT JOIN expenses e
       ON e.category_id = c.id
      AND e.user_id = c.user_id
      AND MONTH(e.expense_date) = ?
      AND YEAR(e.expense_date) = ?
     WHERE c.user_id = ?
     GROUP BY c.id, c.name, c.allocated_amount`,
    [month, year, userId]
  );

  const [previousCategories] = await pool.execute(
    `SELECT c.id, COALESCE(SUM(e.amount), 0) AS previousSpent
     FROM budget_categories c
     LEFT JOIN expenses e
       ON e.category_id = c.id
      AND e.user_id = c.user_id
      AND MONTH(e.expense_date) = ?
      AND YEAR(e.expense_date) = ?
     WHERE c.user_id = ?
     GROUP BY c.id`,
    [previousMonth, previousYear, userId]
  );
  const previousById = new Map(
    previousCategories.map(category => [String(category.id), Number(category.previousSpent) || 0])
  );

  for (const category of categories) {
    const currentSpent = Number(category.currentSpent) || 0;
    const allocated = Number(category.allocated_amount) || 0;
    const categoryName = String(category.name || 'Budget category');

    if (allocated > 0 && currentSpent >= allocated) {
      const exceeded = currentSpent > allocated;
      await createNotification({
        userId,
        pool,
        type: 'budget_alert',
        title: exceeded ? `${categoryName} budget exceeded` : `${categoryName} budget limit reached`,
        message: `Your ${categoryName} spending has ${exceeded ? 'exceeded' : 'reached'} your monthly budget of ₹${formatINR(allocated)}. Current spending: ₹${formatINR(currentSpent)}.`,
        actionUrl: '/budget',
        dedupeKey: `budget:${category.id}:${monthKey}:limit`
      });
    } else if (allocated > 0 && currentSpent >= allocated * 0.8) {
      await createNotification({
        userId,
        pool,
        type: 'budget_alert',
        title: `${categoryName} budget almost reached`,
        message: `You have used ${Math.round((currentSpent / allocated) * 100)}% of your ${categoryName} monthly budget of ₹${formatINR(allocated)}. Current spending: ₹${formatINR(currentSpent)}.`,
        actionUrl: '/budget',
        dedupeKey: `budget:${category.id}:${monthKey}:approaching`
      });
    }

    const previousSpent = previousById.get(String(category.id)) || 0;
    if (previousSpent >= 500 && currentSpent > previousSpent) {
      const increasePercent = Math.round(((currentSpent - previousSpent) / previousSpent) * 100);
      if (increasePercent >= 15) {
        await createNotification({
          userId,
          pool,
          type: 'budget_alert',
          title: `${categoryName} spending increased`,
          message: `Your ${categoryName.toLowerCase()} spending increased by ${increasePercent}% compared with last month (₹${formatINR(previousSpent)} to ₹${formatINR(currentSpent)}).`,
          actionUrl: '/expenses',
          dedupeKey: `spending-trend:${category.id}:${monthKey}`
        });
      }
    }
  }
};

const notifyGoalProgress = async ({
  userId,
  goalId,
  goalName,
  currentAmount,
  targetAmount,
  pool = getPool()
}) => {
  const current = Number(currentAmount) || 0;
  const target = Number(targetAmount) || 0;
  if (target <= 0) return;

  if (current >= target) {
    await createNotification({
      userId,
      pool,
      type: 'goal_achieved',
      title: `Savings goal achieved: ${goalName}`,
      message: `Congratulations! You reached your '${goalName}' savings goal of ₹${formatINR(target)}.`,
      actionUrl: '/goals',
      dedupeKey: `goal:${goalId}:achieved`
    });
  } else if (current / target >= 0.75) {
    const remaining = target - current;
    await createNotification({
      userId,
      pool,
      type: 'system',
      title: `Savings goal almost there: ${goalName}`,
      message: `You are ₹${formatINR(remaining)} away from your '${goalName}' savings goal.`,
      actionUrl: '/goals',
      dedupeKey: `goal:${goalId}:75-percent`
    });
  }
};

module.exports = {
  createNotification,
  notifyGoalProgress,
  syncBudgetNotifications
};
