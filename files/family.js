// family.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const pool = getPool();
  const [members] = await pool.execute('SELECT * FROM family_members WHERE user_id=? ORDER BY name', [req.user.id]);
  res.json({ members });
});

router.post('/', authenticate, async (req, res) => {
  const { name, relationship, email, phone, monthlyAllowance = 0 } = req.body;
  if (!name || !relationship) return res.status(400).json({ error: 'Name and relationship required' });
  const pool = getPool();
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO family_members (id, user_id, name, relationship, email, phone, monthly_allowance) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, relationship, email || null, phone || null, parseFloat(monthlyAllowance)]);
  res.status(201).json({ success: true, id });
});

router.put('/:id', authenticate, async (req, res) => {
  const { name, relationship, email, phone, monthlyAllowance } = req.body;
  const pool = getPool();
  await pool.execute(
    `UPDATE family_members SET name=COALESCE(?,name), relationship=COALESCE(?,relationship),
     email=COALESCE(?,email), phone=COALESCE(?,phone), monthly_allowance=COALESCE(?,monthly_allowance)
     WHERE id=? AND user_id=?`,
    [name, relationship, email, phone, monthlyAllowance ? parseFloat(monthlyAllowance) : null, req.params.id, req.user.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticate, async (req, res) => {
  const pool = getPool();
  await pool.execute('DELETE FROM family_members WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

module.exports = router;
