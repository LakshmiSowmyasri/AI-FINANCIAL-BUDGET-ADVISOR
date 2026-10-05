-- ============================================================
-- AI Financial Budget Advisor - Enhanced MySQL Schema
-- ============================================================

-- Users table with enhanced security fields
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    monthly_income DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    risk_profile ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    profile_picture VARCHAR(500),
    date_of_birth DATE,
    occupation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(20),
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('login', 'register', 'reset', 'verify_email') NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_email (email),
    INDEX idx_otp_phone (phone),
    INDEX idx_otp_expires (expires_at)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_token (token),
    INDEX idx_reset_user (user_id)
);

-- Budget categories
CREATE TABLE IF NOT EXISTS budget_categories (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    allocated_amount DECIMAL(12, 2) DEFAULT 0,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#4CAF50',
    icon VARCHAR(50) DEFAULT 'wallet',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Expenses with enhanced transaction tracking
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36),
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    expense_date DATE NOT NULL,
    payment_method ENUM('cash', 'credit_card', 'debit_card', 'upi', 'net_banking', 'other') DEFAULT 'cash',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NULL,
    merchant VARCHAR(255),
    transaction_ref VARCHAR(100),
    receipt_url VARCHAR(500),
    tags JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
);

-- Transaction logs (audit trail)
CREATE TABLE IF NOT EXISTS transaction_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    transaction_id VARCHAR(36),
    action ENUM('create', 'update', 'delete', 'import') NOT NULL,
    entity_type ENUM('expense', 'investment', 'budget', 'goal') NOT NULL,
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_txn_user (user_id),
    INDEX idx_txn_date (created_at)
);

-- SMS transactions (from bank SMS auto-import)
CREATE TABLE IF NOT EXISTS sms_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    sms_text TEXT NOT NULL,
    transaction_type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    merchant VARCHAR(255),
    bank_name VARCHAR(100),
    transaction_date TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    expense_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    monthly_allowance DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Savings goals
CREATE TABLE IF NOT EXISTS savings_goals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    deadline DATE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    category VARCHAR(50) DEFAULT 'general',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Investment portfolio
CREATE TABLE IF NOT EXISTS investments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('sip', 'stocks', 'mf', 'fd', 'ppf', 'nps', 'gold', 'crypto', 'rd', 'elss', 'other') NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50),
    units DECIMAL(15, 6) DEFAULT 0,
    buy_price DECIMAL(15, 4) DEFAULT 0,
    current_price DECIMAL(15, 4) DEFAULT 0,
    invested_amount DECIMAL(12, 2) DEFAULT 0,
    current_value DECIMAL(12, 2) DEFAULT 0,
    monthly_sip_amount DECIMAL(12, 2) DEFAULT 0,
    start_date DATE,
    maturity_date DATE,
    expected_returns VARCHAR(20),
    risk_level ENUM('low', 'low-medium', 'medium', 'medium-high', 'high') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Investment history (price tracking)
CREATE TABLE IF NOT EXISTS investment_history (
    id VARCHAR(36) PRIMARY KEY,
    investment_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action ENUM('buy', 'sell', 'sip', 'dividend', 'rebalance') NOT NULL,
    units DECIMAL(15, 6) DEFAULT 0,
    price DECIMAL(15, 4) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Investment suggestions (AI-generated)
CREATE TABLE IF NOT EXISTS investment_suggestions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50),
    description TEXT,
    expected_returns VARCHAR(50),
    risk_level ENUM('low', 'low-medium', 'medium', 'medium-high', 'high') DEFAULT 'medium',
    min_investment DECIMAL(12, 2),
    recommended_amount DECIMAL(12, 2),
    recommendation_reason TEXT,
    ml_confidence_score DECIMAL(5, 4) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stock watchlist
CREATE TABLE IF NOT EXISTS stock_watchlist (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    target_price DECIMAL(15, 4),
    alert_enabled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_symbol (user_id, symbol)
);

-- Chat history (AI chatbot conversations)
CREATE TABLE IF NOT EXISTS chat_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'analysis', 'recommendation', 'alert') DEFAULT 'text',
    metadata JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('budget_alert', 'investment', 'sip_reminder', 'goal_achieved', 'market_alert', 'system', 'security') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ML model predictions cache
CREATE TABLE IF NOT EXISTS ml_predictions (
    id VARCHAR(36) PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    prediction_type ENUM('price', 'trend', 'volatility', 'recommendation') NOT NULL,
    predicted_value DECIMAL(15, 4),
    confidence_score DECIMAL(5, 4),
    features JSON,
    prediction_date DATE NOT NULL,
    valid_until DATE,
    model_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ml_symbol (symbol),
    INDEX idx_ml_date (prediction_date)
);

-- Financial news cache
CREATE TABLE IF NOT EXISTS financial_news (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(1000),
    source VARCHAR(100),
    category VARCHAR(50),
    symbols JSON,
    sentiment ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral',
    published_at TIMESTAMP,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_news_published (published_at),
    INDEX idx_news_category (category)
);

-- User sessions (security)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_user (user_id),
    INDEX idx_session_token (token_hash)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_categories_user ON budget_categories(user_id);
CREATE INDEX idx_family_user ON family_members(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_chat_user ON chat_history(user_id, timestamp);
CREATE INDEX idx_sms_user ON sms_transactions(user_id, transaction_date);
CREATE INDEX idx_investments_user ON investments(user_id, is_active);
CREATE INDEX idx_inv_history ON investment_history(investment_id, transaction_date);
