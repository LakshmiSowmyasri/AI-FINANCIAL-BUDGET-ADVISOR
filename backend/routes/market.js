const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Curated list of mock indices with slight random variation for dynamic feel
const getMockIndices = () => {
  const variation = (percent) => (1 + (Math.random() * 2 - 1) * percent);
  return [
    { name: 'Nifty 50', symbol: '^NSEI', price: Math.round(23290.15 * variation(0.0015)), change: (Math.random() * 120 - 40).toFixed(2), changePercent: (Math.random() * 0.5 - 0.1).toFixed(2) },
    { name: 'SENSEX', symbol: '^BSESN', price: Math.round(76693.36 * variation(0.0012)), change: (Math.random() * 400 - 150).toFixed(2), changePercent: (Math.random() * 0.5 - 0.1).toFixed(2) },
    { name: 'S&P 500', symbol: '^GSPC', price: Math.round(5346.99 * variation(0.0008)), change: (Math.random() * 30 - 10).toFixed(2), changePercent: (Math.random() * 0.4 - 0.1).toFixed(2) },
    { name: 'NASDAQ 100', symbol: '^NDX', price: Math.round(19000.92 * variation(0.0010)), change: (Math.random() * 150 - 50).toFixed(2), changePercent: (Math.random() * 0.6 - 0.1).toFixed(2) }
  ].map(idx => {
    // Correct signs
    const changeVal = parseFloat(idx.change);
    idx.changePercent = ((changeVal / idx.price) * 100).toFixed(2);
    return idx;
  });
};

// Curated list of popular Indian & Global stocks for fallback search
const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Limited' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Limited' },
  { symbol: 'INFY', name: 'Infosys Limited' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'WIT', name: 'Wipro Limited' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Limited' },
  { symbol: 'SBIN', name: 'State Bank of India' }
];

// Curated financial news fallback
const MOCK_NEWS = [
  {
    title: 'RBI Keeps Repo Rate Unchanged at 6.5%, Focuses on Inflation Target',
    description: 'The Reserve Bank of India Monetary Policy Committee decided to keep the policy repo rate unchanged, continuing its stance of withdrawal of accommodation.',
    url: 'https://www.rbi.org.in',
    source: 'Financial Express',
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    sentiment: 'neutral'
  },
  {
    title: 'India GDP Growth Surges to 8.2% in FY24, Beating Estimates',
    description: 'Strong manufacturing and construction sectors propelled India\'s economic growth rate to a stellar 8.2% for the financial year ending March 2024.',
    url: 'https://www.moneycontrol.com',
    source: 'MoneyControl',
    published_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    sentiment: 'positive'
  },
  {
    title: 'Nifty Hits Record High as Foreign Investors Turn Net Buyers',
    description: 'The benchmark index Nifty 50 touched an all-time high amid robust capital inflows and strong domestic earnings reports.',
    url: 'https://www.nseindia.com',
    source: 'Economic Times',
    published_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    sentiment: 'positive'
  },
  {
    title: 'Tech Stocks Face Correction Amid US Fed Rate Cut Delay Concerns',
    description: 'Major technology shares registered losses globally as federal reserve minutes hinted at interest rates staying higher for longer.',
    url: 'https://www.bloomberg.com',
    source: 'Bloomberg',
    published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    sentiment: 'negative'
  },
  {
    title: 'Gold Prices Consolidation Continues Near Lifetime Highs',
    description: 'Gold spot prices traded steady as investors locked in profits following a rally triggered by geopolitical tensions and central bank buying.',
    url: 'https://www.reuters.com',
    source: 'Reuters',
    published_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    sentiment: 'neutral'
  },
  {
    title: 'Electric Vehicle Sales in India Grow 35% Year-on-Year in May',
    description: 'Led by two-wheelers and three-wheelers, EV registrations in India grew strongly, highlighting accelerating green mobility adoption.',
    url: 'https://www.livemint.com',
    source: 'LiveMint',
    published_at: new Date(Date.now() - 3600000 * 22).toISOString(),
    sentiment: 'positive'
  }
];

// Helper to determine sentiment of news articles
const analyzeSentiment = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  const positiveWords = ['growth', 'high', 'gain', 'profit', 'bullish', 'surges', 'all-time', 'record', 'upside', 'beating', 'increase'];
  const negativeWords = ['drop', 'loss', 'crash', 'bearish', 'fall', 'debt', 'inflation', 'correction', 'slashed', 'deficit', 'decline'];

  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(w => { if (text.includes(w)) positiveScore++; });
  negativeWords.forEach(w => { if (text.includes(w)) negativeScore++; });

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
};

// ============================================================
// GET /api/market/indices
// ============================================================
router.get('/indices', authenticate, async (req, res) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    return res.json({ data: getMockIndices(), source: 'mock_data' });
  }

  try {
    const symbols = ['^NSEI', '^BSESN', '^GSPC', '^NDX'];
    const names = { '^NSEI': 'Nifty 50', '^BSESN': 'SENSEX', '^GSPC': 'S&P 500', '^NDX': 'NASDAQ 100' };

    const promises = symbols.map(async (sym) => {
      try {
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`, { timeout: 4000 });
        const data = response.data;
        if (data && data.c) {
          const price = data.c;
          const change = (data.d || 0).toFixed(2);
          const changePercent = (data.dp || 0).toFixed(2);
          return { name: names[sym] || sym, symbol: sym, price, change, changePercent };
        }
      } catch (err) {
        console.error(`Finnhub error for ${sym}:`, err.message);
      }
      return null;
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);

    if (validResults.length > 0) {
      return res.json({ data: validResults, source: 'live' });
    } else {
      return res.json({ data: getMockIndices(), source: 'mock_data' });
    }
  } catch (error) {
    res.json({ data: getMockIndices(), source: 'mock_data' });
  }
});

// ============================================================
// GET /api/market/watchlist
// ============================================================
router.get('/watchlist', authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT symbol, company_name FROM stock_watchlist WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ watchlist: rows });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// ============================================================
// POST /api/market/watchlist
// ============================================================
router.post('/watchlist', authenticate, async (req, res) => {
  const { symbol, companyName } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required' });
  }

  try {
    const pool = getPool();
    // Check if duplicate
    const [existing] = await pool.execute(
      'SELECT id FROM stock_watchlist WHERE user_id = ? AND symbol = ?',
      [req.user.id, symbol]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Stock is already in your watchlist' });
    }

    await pool.execute(
      'INSERT INTO stock_watchlist (id, user_id, symbol, company_name) VALUES (?, ?, ?, ?)',
      [uuidv4(), req.user.id, symbol, companyName || symbol]
    );

    res.status(201).json({ success: true, message: 'Added to watchlist' });
  } catch (error) {
    console.error('Watchlist insert error:', error);
    res.status(500).json({ error: 'Failed to add stock to watchlist' });
  }
});

// ============================================================
// DELETE /api/market/watchlist/:symbol
// ============================================================
router.delete('/watchlist/:symbol', authenticate, async (req, res) => {
  const { symbol } = req.params;

  try {
    const pool = getPool();
    await pool.execute(
      'DELETE FROM stock_watchlist WHERE user_id = ? AND symbol = ?',
      [req.user.id, symbol]
    );
    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Watchlist delete error:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

// ============================================================
// GET /api/market/news
// ============================================================
router.get('/news', authenticate, async (req, res) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    return res.json({ articles: MOCK_NEWS });
  }

  try {
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?category=business&country=in&apiKey=${apiKey}`, { timeout: 4000 });
    if (response.data && response.data.articles) {
      const articles = response.data.articles.slice(0, 15).map(article => {
        const sentiment = analyzeSentiment(article.title || '', article.description || '');
        return {
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source?.name || 'News API',
          published_at: article.publishedAt || new Date().toISOString(),
          sentiment
        };
      });
      return res.json({ articles });
    }
    return res.json({ articles: MOCK_NEWS });
  } catch (error) {
    console.error('News API error:', error.message);
    res.json({ articles: MOCK_NEWS });
  }
});

// ============================================================
// GET /api/market/search/:query
// ============================================================
router.get('/search/:query', authenticate, async (req, res) => {
  const { query } = req.params;
  if (!query) {
    return res.json({ results: [] });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    // Fallback local search
    const filtered = POPULAR_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ results: filtered });
  }

  try {
    const response = await axios.get(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`, { timeout: 4000 });
    if (response.data && response.data.result) {
      const results = response.data.result.slice(0, 8).map(item => ({
        symbol: item.symbol,
        name: item.description
      }));
      return res.json({ results });
    }
    return res.json({ results: [] });
  } catch (error) {
    console.error('Finnhub search error:', error.message);
    // Fallback local search on error
    const filtered = POPULAR_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );
    res.json({ results: filtered });
  }
});

module.exports = router;
