require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database/connection');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budget');
const familyRoutes = require('./routes/family');
const investmentRoutes = require('./routes/investments');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const smsRoutes = require('./routes/sms');
const autoImportRoutes = require('./routes/autoImport');
const marketRoutes = require('./routes/market');
const goalRoutes = require('./routes/goals');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'capacitor://localhost',
    'ionic://localhost'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests. Please try again in 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Strict for auth endpoints
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/', generalLimiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// API Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expenses', autoImportRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/goals', goalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Financial Budget Advisor API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: {
      ai_chatbot: !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your_'),
      email_otp: !!process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_'),
      stock_data: !!process.env.FINNHUB_API_KEY && !process.env.FINNHUB_API_KEY.includes('your_'),
      news: !!process.env.NEWS_API_KEY && !process.env.NEWS_API_KEY.includes('your_'),
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
});

// ============================================================
// Start Server
// ============================================================
const startServer = async () => {
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`\n🚀 AI Financial Budget Advisor Server`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
