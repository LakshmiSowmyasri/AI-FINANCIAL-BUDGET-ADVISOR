# 🚀 AI Financial Budget Advisor — Enhanced Setup Guide

## What's New in This Version

| Feature | Status | Notes |
|---|---|---|
| 🤖 Claude AI Chatbot | ✅ | Requires `ANTHROPIC_API_KEY` |
| 🗄️ MySQL Database | ✅ | Full schema with audit logs |
| 📧 Email OTP (Forgot Password) | ✅ | Uses Gmail SMTP |
| 📈 Investment Recommendations | ✅ | ML-scoring engine built-in |
| 📊 SIP Calculator | ✅ | Compound growth + charts |
| 📰 Financial News | ✅ | Requires `NEWS_API_KEY` |
| 📉 Stock Data | ✅ | Requires `FINNHUB_API_KEY` |
| 💼 Transaction Logs | ✅ | Full audit trail |
| 📱 SMS Auto-Import | ✅ | Parse bank SMS transactions |
| 🛡️ Rate Limiting | ✅ | Built-in |

---

## Prerequisites

- **Node.js** 18+ 
- **MySQL** 8.0+ (or XAMPP / MySQL Workbench)
- **npm** 9+

---

## Step 1 — MySQL Setup

### Option A: XAMPP (recommended for local dev)
1. Download XAMPP → start **Apache** + **MySQL**
2. Open `http://localhost/phpmyadmin`
3. Click **New** → create database named `budget_advisor`

### Option B: Command Line
```sql
mysql -u root -p
CREATE DATABASE budget_advisor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

The schema is **auto-created** when you first start the backend server — no need to run `schema.sql` manually.

---

## Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
```

### Edit `.env` — Required Fields

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=budget_advisor

# JWT (generate a random string)
JWT_SECRET=my-super-secret-key-at-least-32-chars-long
```

### Install & Start

```bash
npm install
npm run dev
# Server starts at http://localhost:5000
# Visit http://localhost:5000/api/health to verify
```

---

## Step 3 — Gmail App Password (Email OTP)

> The system sends OTPs from `aifinancialbudgetadvisor@gmail.com`

1. Log into **aifinancialbudgetadvisor@gmail.com**
2. Go to → **Google Account** → **Security** → **2-Step Verification** (enable it)
3. Then go to → **Security** → **App passwords**
4. Select **Mail** + **Other (Custom name)** → name it "Budget Advisor"
5. Copy the 16-character password
6. Add to `.env`:
   ```env
   EMAIL_USER=aifinancialbudgetadvisor@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop   # your 16-char app password (no spaces)
   ```

> ✅ Once configured, OTPs are sent automatically on Forgot Password, registration, and login.

---

## Step 4 — Claude AI API Key

> The AI chatbot uses Claude (Anthropic's model) for financial advice.

1. Sign up at **https://console.anthropic.com**
2. Create an API key
3. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

> Without this key, the chatbot uses a built-in rule-based financial advisor (still functional).

---

## Step 5 — Free API Keys for Market Data

### Finnhub (Stock Prices + Search) — Free: 60 req/min
1. Register at **https://finnhub.io/register**
2. Copy your API key
3. ```env
   FINNHUB_API_KEY=your_key_here
   ```

### Alpha Vantage (Historical Data) — Free: 25 req/day
1. Get key at **https://www.alphavantage.co/support/#api-key**
2. ```env
   ALPHA_VANTAGE_API_KEY=your_key_here
   ```

### NewsAPI (Financial News) — Free: 100 req/day
1. Register at **https://newsapi.org/register**
2. ```env
   NEWS_API_KEY=your_key_here
   ```

> All APIs have **generous free tiers**. The app works without them — it shows curated fallback data.

---

## Step 6 — Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` in the `frontend/` folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm start
# Opens at http://localhost:3000
```

---

## Step 7 — Add New Pages to App.js

In your `frontend/src/App.js`, add these imports and routes:

```jsx
import ForgotPassword from './pages/ForgotPassword';
import Investments from './pages/Investments';
import Market from './pages/Market';
import Chat from './pages/Chat';

// Inside <Routes>:
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/investments" element={<PrivateRoute><Investments /></PrivateRoute>} />
<Route path="/market" element={<PrivateRoute><Market /></PrivateRoute>} />
<Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
```

### Add to Login page
Find your Login form and add a link:
```jsx
<Link to="/forgot-password">Forgot Password?</Link>
```

---

## Step 8 — Add Sidebar Navigation Links

In your sidebar component, add:
```jsx
{ path: '/chat',        icon: <FaRobot />,     label: 'AI Advisor'  },
{ path: '/investments', icon: <FaChartLine />,  label: 'Investments' },
{ path: '/market',      icon: <FaChartBar />,   label: 'Market'      },
```

---

## Project Structure (Enhanced Files)

```
backend/
├── database/
│   ├── schema.sql          ← NEW: Full MySQL schema (20+ tables)
│   └── connection.js       ← NEW: Pool with auto-init
├── middleware/
│   └── auth.js             ← Enhanced JWT middleware
├── routes/
│   ├── auth.js             ← NEW: Forgot password + OTP flows
│   ├── chat.js             ← NEW: Claude AI chatbot
│   ├── investments.js      ← NEW: ML recommendations + SIP calc
│   ├── market.js           ← NEW: Stock data + news + watchlist
│   ├── expenses.js         ← Enhanced: full audit logs
│   ├── budget.js           ← Categories CRUD
│   ├── users.js            ← Profile management
│   ├── family.js           ← Family members
│   ├── notifications.js    ← Push notifications
│   ├── sms.js              ← Bank SMS parsing
│   ├── autoImport.js       ← Bulk CSV import
│   └── otp.js              ← OTP send/verify
├── services/
│   └── emailOtpService.js  ← NEW: Gmail OTP + email templates
├── server.js               ← Enhanced with security middleware
├── package.json            ← All new dependencies
└── .env.example            ← Template with all keys

frontend/src/
├── pages/
│   ├── Chat.js             ← NEW: AI chatbot UI
│   ├── ForgotPassword.js   ← NEW: 3-step OTP reset flow
│   ├── Investments.js      ← NEW: ML picks + SIP calculator
│   └── Market.js           ← NEW: Live prices + news + watchlist
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | User accounts + profile |
| `otp_verifications` | OTP codes with expiry |
| `password_reset_tokens` | Secure reset tokens |
| `budget_categories` | Income/expense categories |
| `expenses` | All financial transactions |
| `transaction_logs` | Full audit trail |
| `sms_transactions` | Bank SMS imports |
| `investments` | Portfolio holdings |
| `investment_history` | Buy/sell history |
| `investment_suggestions` | AI/ML recommendations cache |
| `savings_goals` | Financial goals |
| `family_members` | Family budget tracking |
| `stock_watchlist` | Tracked stocks |
| `chat_history` | AI conversation history |
| `notifications` | In-app alerts |
| `ml_predictions` | ML model cache |
| `financial_news` | News cache |
| `user_sessions` | Active sessions |

---

## API Health Check

After starting the backend, visit:
```
http://localhost:5000/api/health
```

You'll see which features are configured:
```json
{
  "status": "OK",
  "features": {
    "ai_chatbot": true,
    "email_otp": true,
    "stock_data": false,
    "news": false
  }
}
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ER_ACCESS_DENIED` | Check `DB_USER`/`DB_PASSWORD` in `.env` |
| `Email not sending` | Verify Gmail App Password (not your login password) |
| `Claude API error` | Check `ANTHROPIC_API_KEY` is valid |
| `CORS error` | Ensure `FRONTEND_URL=http://localhost:3000` in backend `.env` |
| `JWT expired` | User needs to re-login; adjust `JWT_EXPIRES_IN` |
| `Module not found` | Run `npm install` in both `backend/` and `frontend/` |

---

## Security Features Included

- ✅ Bcrypt password hashing (cost 12)
- ✅ JWT authentication
- ✅ Rate limiting (10 auth req / 15 min)
- ✅ Helmet.js security headers
- ✅ SQL injection prevention (parameterized queries)
- ✅ OTP expiry (10 minutes)
- ✅ Password reset token expiry (15 minutes)
- ✅ Account deactivation support
- ✅ Full transaction audit trail
- ✅ CORS restricted to configured origins
