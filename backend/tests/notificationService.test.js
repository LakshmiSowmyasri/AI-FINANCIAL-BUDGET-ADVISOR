const test = require('node:test');
const assert = require('node:assert/strict');
const {
  notifyGoalProgress,
  syncBudgetNotifications
} = require('../services/notificationService');

const createFakePool = ({ categories, previousCategories }) => {
  const notifications = new Map();

  return {
    notifications,
    async execute(sql, params) {
      if (sql.includes('SELECT c.id, c.name, c.allocated_amount')) {
        return [categories];
      }
      if (sql.includes('SELECT c.id, COALESCE(SUM(e.amount), 0) AS previousSpent')) {
        return [previousCategories];
      }
      if (sql.includes('INSERT INTO notifications')) {
        const [id, userId, type, title, message, actionUrl] = params;
        const existing = notifications.get(id);
        notifications.set(id, {
          id,
          userId,
          type,
          title,
          message,
          actionUrl,
          isRead: existing?.isRead || false
        });
        return [{ affectedRows: existing ? 2 : 1 }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
};

test('saves an exceeded category budget notification and deduplicates repeated checks', async () => {
  const pool = createFakePool({
    categories: [{ id: 'education-id', name: 'Education', allocated_amount: 10000, currentSpent: 12000 }],
    previousCategories: [{ id: 'education-id', previousSpent: 6000 }]
  });

  await syncBudgetNotifications('user-id', pool, new Date(2026, 9, 5));
  await syncBudgetNotifications('user-id', pool, new Date(2026, 9, 5));

  const exceeded = [...pool.notifications.values()].filter(notification =>
    notification.title === 'Education budget exceeded'
  );
  assert.equal(exceeded.length, 1);
  assert.equal(exceeded[0].type, 'budget_alert');
  assert.equal(
    exceeded[0].message,
    'Your Education spending has exceeded your monthly budget of ₹10,000. Current spending: ₹12,000.'
  );
  assert.equal([...pool.notifications.values()].filter(notification =>
    notification.title === 'Education spending increased'
  ).length, 1);
});

test('creates one approaching alert then upgrades to one exceeded alert as spending changes', async () => {
  const categories = [{ id: 'education-id', name: 'Education', allocated_amount: 10000, currentSpent: 9000 }];
  const pool = createFakePool({
    categories,
    previousCategories: [{ id: 'education-id', previousSpent: 7000 }]
  });

  await syncBudgetNotifications('user-id', pool, new Date(2026, 9, 5));
  categories[0].currentSpent = 12000;
  await syncBudgetNotifications('user-id', pool, new Date(2026, 9, 5));
  await syncBudgetNotifications('user-id', pool, new Date(2026, 9, 5));

  const all = [...pool.notifications.values()];
  assert.equal(all.filter(notification => notification.title === 'Education budget almost reached').length, 1);
  assert.equal(all.filter(notification => notification.title === 'Education budget exceeded').length, 1);
  assert.equal(all.filter(notification => notification.title === 'Education spending increased').length, 1);
  assert.match(
    all.find(notification => notification.title === 'Education budget exceeded').message,
    /Current spending: ₹12,000/
  );
  assert.match(
    all.find(notification => notification.title === 'Education spending increased').message,
    /₹12,000/
  );
});

test('saves a completed savings-goal notification only once', async () => {
  const pool = createFakePool({ categories: [], previousCategories: [] });
  const goal = {
    userId: 'user-id',
    goalId: 'education-goal',
    goalName: 'Education',
    currentAmount: 12000,
    targetAmount: 12000,
    pool
  };

  await notifyGoalProgress(goal);
  await notifyGoalProgress(goal);

  assert.equal(pool.notifications.size, 1);
  const [notification] = pool.notifications.values();
  assert.equal(notification.type, 'goal_achieved');
  assert.match(notification.message, /reached your 'Education' savings goal/);
});
