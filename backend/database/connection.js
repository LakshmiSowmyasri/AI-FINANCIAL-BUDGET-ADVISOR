const mysql = require('mysql2/promise');

let pool = null;

const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'budget_advisor',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+05:30',
    multipleStatements: false,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });
};

const getPool = () => {
  if (!pool) {
    pool = createPool();
    pool.on('error', (err) => {
      console.error('MySQL Pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        pool = createPool();
      }
    });
  }
  return pool;
};

const initDatabase = async () => {
  const fs = require('fs');
  const path = require('path');

  // Create DB if not exists
  const tempPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 1
  });

  try {
    await tempPool.execute(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'budget_advisor'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ Database ensured:', process.env.DB_NAME || 'budget_advisor');
    await tempPool.end();

    // Now run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const p = getPool();
      const statements = schema
        .split(';')
        .map(s => s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          await p.execute(stmt);
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
            console.warn('Schema warning:', err.message.substring(0, 100));
          }
        }
      }
      console.log('✅ Schema initialized successfully');
    }

    // Test connection
    const conn = await getPool().getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
  } catch (error) {
    console.error('❌ Database init error:', error.message);
    throw error;
  }
};

module.exports = { getPool, initDatabase };
