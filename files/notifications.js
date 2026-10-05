const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const pool = getPool();
  const [notifs] = await pool.execute(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  const [[{ count }]] = await pool.execute(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=FALSE', [req.user.id]);
  res.json({ notifications: notifs, unreadCount: count });
});

router.put('/:id/read', authenticate, async (req, res) => {
  const pool = getPool();
  await pool.execute('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

router.put('/read-all', authenticate, async (req, res) => {
  const pool = getPool();
  await pool.execute('UPDATE notifications SET is_read=TRUE WHERE user_id=?', [req.user.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticate, async (req, res) => {
  const pool = getPool();
  await pool.execute('DELETE FROM notifications WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// Internal: create notification (called by other routes)
router.createNotification = async (userId, type, title, message, actionUrl = null) => {
  try {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, type, title, message, actionUrl]);
  } catch (err) {
    console.error('Create notification error:', err.message);
  }
};

module.exports = router;
