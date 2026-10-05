import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaPlus, FaNewspaper, FaChartBar,
  FaArrowUp, FaArrowDown, FaMinus, FaExternalLinkAlt, FaStar, FaTrash
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--text-main);
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  
  .title-group {
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.02em;

      svg {
        color: var(--secondary);
      }
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 2px;
    }
  }
`;

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--primary-subtle);
  color: var(--primary);
  border: 1px solid rgba(5, 150, 105, 0.25);

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const WideCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  grid-column: ${p => p.full ? 'span 2' : 'span 1'};
  @media (max-width: 900px) { grid-column: span 1; }
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;

  svg {
    color: var(--secondary);
  }
`;

/* --- Indices --- */
const IndicesRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const IndexCard = styled.div`
  background: ${p => p.up ? 'var(--primary-subtle)' : p.down ? 'var(--error-subtle)' : 'var(--bg-surface)'};
  border: 1px solid ${p => p.up ? 'rgba(5, 150, 105, 0.25)' : p.down ? 'rgba(220, 38, 38, 0.25)' : 'var(--border)'};
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  
  .name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .price {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-main);
    font-variant-numeric: tabular-nums;
  }
  .change {
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.up ? 'var(--primary)' : p.down ? 'var(--error)' : 'var(--text-muted)'};
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }
`;

/* --- Watchlist --- */
const WatchlistRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: none; }
`;

const WatchSymbol = styled.div`
  .sym { font-size: 14px; font-weight: 600; color: var(--text-main); }
  .name { font-size: 12px; color: var(--text-muted); }
`;

const PriceInfo = styled.div`
  text-align: right;
  .price { font-size: 14px; font-weight: 700; color: var(--text-main); font-variant-numeric: tabular-nums; }
  .chg { font-size: 12px; font-weight: 600; color: ${p => p.up ? 'var(--primary)' : p.down ? 'var(--error)' : 'var(--text-muted)'}; }
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  padding: 6px;
  opacity: 0.7;
  border-radius: 6px;
  transition: all 0.15s ease;
  &:hover { opacity: 1; background: var(--error-subtle); }
`;

const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--text-main);
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-subtle); }
  &::placeholder { color: var(--text-muted); }
`;



const SearchResults = styled.div`
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const SearchResultItem = styled.div`
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main);
  display: flex;
  justify-content: space-between;
  transition: background 0.15s ease;
  &:hover { background: var(--primary-subtle); color: var(--primary); }
  &:not(:last-child) { border-bottom: 1px solid var(--border); }
`;

/* --- News --- */
const NewsCard = styled.a`
  display: block;
  padding: 12px 0;
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  transition: all 0.15s;
  &:last-child { border-bottom: none; }
  &:hover .title { color: var(--secondary); }
`;

const NewsTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 5px;
  line-height: 1.5;
`;

const NewsMeta = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
`;

const SentimentDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.s === 'positive' ? 'var(--primary)' : p.s === 'negative' ? 'var(--error)' : 'var(--text-muted)'};
  display: inline-block;
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
`;

const Tab = styled.button`
  flex: 1;
  padding: 8px 12px;
  background: ${p => p.active ? 'var(--btn-primary-bg)' : 'transparent'};
  border: none;
  border-radius: 7px;
  color: ${p => p.active ? 'var(--btn-primary-text)' : 'var(--text-muted)'};
  font-size: 12px;
  font-weight: ${p => p.active ? '700' : '500'};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover:not([data-active="true"]) {
    color: var(--text-main);
  }
`;

const DisclaimerBox = styled.div`
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 16px;
  line-height: 1.5;
`;

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Market() {
  const [indices, setIndices] = useState([]);
  const [news, setNews] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeNewsTab, setActiveNewsTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');

  // Load all data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [indRes, wlRes] = await Promise.all([
          api.get('/market/indices'),
          api.get('/market/watchlist')
        ]);
        setIndices(indRes.data.data || []);
        setDataSource(indRes.data.source || '');
        setWatchlist(wlRes.data.watchlist || []);
      } catch (err) {
        toast.error('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Load news
  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const { data } = await api.get('/market/news?category=business');
        setNews(data.articles || []);
      } catch {}
      finally { setNewsLoading(false); }
    };
    loadNews();
  }, []);

  // Search stocks
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/market/search/${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.results || []);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addToWatchlist = async (symbol, name) => {
    try {
      await api.post('/market/watchlist', { symbol, companyName: name });
      toast.success(`${symbol} added to watchlist`);
      setWatchlist(prev => [...prev, { symbol, company_name: name }]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      if (err.response?.status === 400) toast.error('Already in watchlist');
      else toast.error('Failed to add');
    }
  };

  const removeFromWatchlist = async (symbol) => {
    try {
      await api.delete(`/market/watchlist/${symbol}`);
      setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
      toast.success('Removed from watchlist');
    } catch { toast.error('Failed to remove'); }
  };

  const filteredNews = news.filter(n => {
    if (activeNewsTab === 'all') return true;
    return n.sentiment === activeNewsTab;
  });

  const getChangeDisplay = (change, pct) => {
    const val = parseFloat(change || 0);
    const Icon = val > 0 ? FaArrowUp : val < 0 ? FaArrowDown : FaMinus;
    const color = val > 0 ? '#10b981' : val < 0 ? '#ef4444' : 'var(--text-secondary)';
    return { Icon, color, up: val > 0, down: val < 0 };
  };

  return (
    <Container>
      <PageHeader>
        <h1><FaChartBar style={{ color: 'var(--primary)' }} /> Market</h1>
        <LiveBadge>LIVE</LiveBadge>
      </PageHeader>

      {/* Indices */}
      <IndicesRow>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <IndexCard key={i} style={{ minHeight: 80, background: 'var(--bg-surface)', animation: 'pulse 1.5s infinite' }} />
          ))
        ) : indices.length > 0 ? indices.map((idx, i) => {
          const { up, down } = getChangeDisplay(idx.change);
          return (
            <IndexCard key={i} up={up} down={down}>
              <div className="name">{idx.name || idx.symbol}</div>
              <div className="price">{Number(idx.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="change">
                {up ? <FaArrowUp size={10} /> : down ? <FaArrowDown size={10} /> : <FaMinus size={10} />}
                {parseFloat(idx.change || 0).toFixed(2)} ({parseFloat(idx.changePercent || 0).toFixed(2)}%)
              </div>
            </IndexCard>
          );
        }) : (
          <div style={{ gridColumn: 'span 4', color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
            Market indices unavailable — configure FINNHUB_API_KEY for live data
          </div>
        )}
      </IndicesRow>

      <Grid>
        {/* Watchlist */}
        <WideCard>
          <SectionTitle><FaStar color="var(--warning)" /> My Watchlist</SectionTitle>
          <SearchRow>
            <SearchInput
              placeholder="Search symbol or company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </SearchRow>
          {searchResults.length > 0 && (
            <SearchResults>
              {searchResults.slice(0, 6).map((r, i) => (
                <SearchResultItem key={i} onClick={() => addToWatchlist(r.symbol, r.name)}>
                  <span><strong>{r.symbol}</strong> — {r.name}</span>
                  <span style={{ color: 'var(--primary)' }}><FaPlus size={11} /></span>
                </SearchResultItem>
              ))}
            </SearchResults>
          )}
          {watchlist.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '13px' }}>
              <FaStar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No stocks in watchlist. Search and add stocks above.</p>
            </div>
          ) : (
            watchlist.map(w => (
              <WatchlistRow key={w.symbol}>
                <WatchSymbol>
                  <div className="sym">{w.symbol}</div>
                  <div className="name">{w.company_name || w.symbol}</div>
                </WatchSymbol>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PriceInfo>
                    <div className="price">—</div>
                    <div className="chg">Configure API for price</div>
                  </PriceInfo>
                  <DeleteBtn onClick={() => removeFromWatchlist(w.symbol)}>
                    <FaTrash size={13} />
                  </DeleteBtn>
                </div>
              </WatchlistRow>
            ))
          )}
        </WideCard>

        {/* Financial News */}
        <WideCard>
          <SectionTitle><FaNewspaper color="var(--ai-accent)" /> Financial News</SectionTitle>
          <TabBar>
            {[
              { id: 'all', label: 'All' },
              { id: 'positive', label: '📈 Positive' },
              { id: 'negative', label: '📉 Negative' },
              { id: 'neutral', label: '➖ Neutral' },
            ].map(t => (
              <Tab key={t.id} active={activeNewsTab === t.id} onClick={() => setActiveNewsTab(t.id)}>{t.label}</Tab>
            ))}
          </TabBar>
          {newsLoading ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>Loading news...</div>
          ) : filteredNews.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>No news available. Configure NEWS_API_KEY for live news.</div>
          ) : (
            filteredNews.slice(0, 8).map((article, i) => (
              <NewsCard key={i} href={article.url} target="_blank" rel="noopener noreferrer">
                <NewsTitle className="title">{article.title}</NewsTitle>
                <NewsMeta>
                  <SentimentDot s={article.sentiment} />
                  <span>{article.source}</span>
                  <span>·</span>
                  <span>{timeAgo(article.published_at)}</span>
                  <FaExternalLinkAlt size={10} style={{ marginLeft: 'auto', color: 'var(--border)' }} />
                </NewsMeta>
              </NewsCard>
            ))
          )}
        </WideCard>

        {/* Market Overview - full width */}
        <WideCard full>
          <SectionTitle><FaChartBar color="var(--primary)" /> Market Overview</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { title: 'NSE', desc: 'National Stock Exchange of India', url: 'https://www.nseindia.com', color: '#0D9488' },
              { title: 'BSE', desc: 'Bombay Stock Exchange', url: 'https://www.bseindia.com', color: '#059669' },
              { title: 'MoneyControl', desc: 'Stock screener & portfolio tracker', url: 'https://www.moneycontrol.com', color: '#D97706' },
              { title: 'Screener.in', desc: 'Fundamental stock analysis', url: 'https://www.screener.in', color: '#8B5CF6' },
              { title: 'Groww', desc: 'Invest in Mutual Funds & Stocks', url: 'https://groww.in', color: '#059669' },
              { title: 'Zerodha', desc: 'Discount broker & Kite platform', url: 'https://zerodha.com', color: '#0D9488' },
            ].map(link => (
              <a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'var(--bg-canvas)', border: `1px solid var(--border)`, borderRadius: '12px', padding: '16px', textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = link.color}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ width: 36, height: 36, background: link.color + '20', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaChartBar style={{ color: link.color }} />
                </div>

                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{link.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{link.desc}</div>
                </div>

                <FaExternalLinkAlt size={11} style={{ color: 'var(--border-color)', marginLeft: 'auto', flexShrink: 0 }} />
              </a>
            ))}
          </div>
          {dataSource === 'mock_data' && (
            <DisclaimerBox>
              ⚠️ Showing simulated data. Configure <code>FINNHUB_API_KEY</code> and <code>ALPHA_VANTAGE_API_KEY</code> in <code>.env</code> for real-time prices. Free tiers available at finnhub.io and alphavantage.co
            </DisclaimerBox>
          )}
        </WideCard>
      </Grid>
    </Container>
  );
}
