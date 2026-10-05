// budget.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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

router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, allocatedAmount = 0, color = '#3b82f6', icon = 'wallet' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const pool = getPool();
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO budget_categories (id, user_id, name, allocated_amount, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, name, parseFloat(allocatedAmount), color, icon]);
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', authenticate, async (req, res) => {
  try {
    const { name, allocatedAmount, color, icon } = req.body;
    const pool = getPool();
    await pool.execute(
      `UPDATE budget_categories SET name=COALESCE(?,name), allocated_amount=COALESCE(?,allocated_amount),
       color=COALESCE(?,color), icon=COALESCE(?,icon) WHERE id=? AND user_id=?`,
      [name, allocatedAmount ? parseFloat(allocatedAmount) : null, color, icon, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM budget_categories WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
