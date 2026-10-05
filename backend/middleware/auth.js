const jwt = require('jsonwebtoken');
const { getPool } = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id, name, email, monthly_income, currency, risk_profile, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!users.length) return res.status(401).json({ error: 'User not found' });
    if (!users[0].is_active) return res.status(403).json({ error: 'Account deactivated' });

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

module.exports = { generateToken, authenticate };
