import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaBell, FaNewspaper, FaChartBar,
  FaArrowUp, FaArrowDown, FaMinus, FaExternalLinkAlt, FaStar, FaTrash
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  color: #e2e8f0;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  h1 { font-size: 24px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
`;

const LiveBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
  background: rgba(16,185,129,0.12); color: #34d399;
  border: 1px solid rgba(16,185,129,0.25);
  &::before { content: ''; width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const WideCard = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 18px;
  padding: 24px;
  grid-column: ${p => p.full ? 'span 2' : 'span 1'};
  @media (max-width: 900px) { grid-column: span 1; }
`;

const SectionTitle = styled.h2`
  font-size: 15px; font-weight: 600; color: #f1f5f9;
  display: flex; align-items: center; gap: 8px; margin: 0 0 16px;
`;

/* --- Indices --- */
const IndicesRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const IndexCard = styled.div`
  background: ${p => p.up ? 'rgba(16,185,129,0.07)' : p.down ? 'rgba(239,68,68,0.07)' : '#1e293b'};
  border: 1px solid ${p => p.up ? 'rgba(16,185,129,0.25)' : p.down ? 'rgba(239,68,68,0.25)' : '#334155'};
  border-radius: 14px; padding: 16px;
  .name { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .price { font-size: 20px; font-weight: 700; color: #f8fafc; }
  .change { font-size: 13px; font-weight: 600; color: ${p => p.up ? '#10b981' : p.down ? '#ef4444' : '#94a3b8'}; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
`;

/* --- Watchlist --- */
const WatchlistRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-bottom: 1px solid rgba(51,65,85,0.5);
  &:last-child { border-bottom: none; }
`;

const WatchSymbol = styled.div`
  .sym { font-size: 14px; font-weight: 600; color: #f1f5f9; }
  .name { font-size: 12px; color: #64748b; }
`;

const PriceInfo = styled.div`
  text-align: right;
  .price { font-size: 15px; font-weight: 600; color: #f1f5f9; }
  .chg { font-size: 12px; color: ${p => p.up ? '#10b981' : p.down ? '#ef4444' : '#64748b'}; }
`;

const DeleteBtn = styled.button`
  background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; opacity: 0.6;
  &:hover { opacity: 1; }
`;

const SearchRow = styled.div`
  display: flex; gap: 10px; margin-bottom: 16px;
`;

const SearchInput = styled.input`
  flex: 1; padding: 11px 14px; background: #0f172a;
  border: 1px solid #334155; border-radius: 10px;
  color: #f1f5f9; font-size: 14px; outline: none;
  &:focus { border-color: #3b82f6; }
  &::placeholder { color: #475569; }
`;

const AddBtn = styled.button`
  padding: 10px 16px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none; border-radius: 10px; color: white;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  &:hover { filter: brightness(1.1); }
`;

const SearchResults = styled.div`
  background: #0f172a; border: 1px solid #334155;
  border-radius: 10px; overflow: hidden; margin-bottom: 12px;
`;

const SearchResultItem = styled.div`
  padding: 11px 14px; cursor: pointer; font-size: 13px; color: #e2e8f0;
  display: flex; justify-content: space-between;
  &:hover { background: rgba(59,130,246,0.08); }
  &:not(:last-child) { border-bottom: 1px solid #1e293b; }
`;

/* --- News --- */
const NewsCard = styled.a`
  display: block; padding: 14px 0; text-decoration: none;
  border-bottom: 1px solid rgba(51,65,85,0.5); transition: all 0.15s;
  &:last-child { border-bottom: none; }
  &:hover .title { color: #60a5fa; }
`;

const NewsTitle = styled.div`
  font-size: 14px; font-weight: 500; color: #e2e8f0; margin-bottom: 5px; line-height: 1.5;
`;

const NewsMeta = styled.div`
  display: flex; gap: 10px; align-items: center; font-size: 12px; color: #64748b;
`;

const SentimentDot = styled.span`
  width: 6px; height: 6px; border-radius: 50%;
  background: ${p => p.s === 'positive' ? '#10b981' : p.s === 'negative' ? '#ef4444' : '#94a3b8'};
  display: inline-block;
`;

const TabBar = styled.div`
  display: flex; gap: 6px; margin-bottom: 20px;
  background: #1e293b; border-radius: 14px; padding: 6px;
`;

const Tab = styled.button`
  flex: 1; padding: 9px 14px;
  background: ${p => p.active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent'};
  border: none; border-radius: 10px;
  color: ${p => p.active ? '#fff' : '#64748b'};
  font-size: 13px; font-weight: ${p => p.active ? '600' : '400'};
  cursor: pointer; transition: all 0.2s;
`;

const DisclaimerBox = styled.div`
  font-size: 12px; color: #475569; background: rgba(51,65,85,0.4);
  border-radius: 8px; padding: 10px 14px; margin-top: 16px;
`;

const formatINR = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Market() {
  const { token } = useAuth();
  const [indices, setIndices] = useState([]);
  const [news, setNews] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchPrices, setWatchPrices] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeNewsTab, setActiveNewsTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Load all data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [indRes, wlRes] = await Promise.all([
          axios.get(`${API}/market/indices`, authHeaders),
          axios.get(`${API}/market/watchlist`, authHeaders)
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
        const { data } = await axios.get(`${API}/market/news?category=business`, authHeaders);
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
        const { data } = await axios.get(`${API}/market/search/${encodeURIComponent(searchQuery)}`, authHeaders);
        setSearchResults(data.results || []);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addToWatchlist = async (symbol, name) => {
    try {
      await axios.post(`${API}/market/watchlist`, { symbol, companyName: name }, authHeaders);
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
      await axios.delete(`${API}/market/watchlist/${symbol}`, authHeaders);
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
    const color = val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8';
    return { Icon, color, up: val > 0, down: val < 0 };
  };

  return (
    <Container>
      <PageHeader>
        <h1><FaChartBar style={{ color: '#3b82f6' }} /> Market</h1>
        <LiveBadge>LIVE</LiveBadge>
      </PageHeader>

      {/* Indices */}
      <IndicesRow>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <IndexCard key={i} style={{ minHeight: 80, background: '#1e293b', animation: 'pulse 1.5s infinite' }} />
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
          <div style={{ gridColumn: 'span 4', color: '#64748b', fontSize: '13px', padding: '12px 0' }}>
            Market indices unavailable — configure FINNHUB_API_KEY for live data
          </div>
        )}
      </IndicesRow>

      <Grid>
        {/* Watchlist */}
        <WideCard>
          <SectionTitle><FaStar color="#f59e0b" /> My Watchlist</SectionTitle>
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
                  <span style={{ color: '#3b82f6' }}><FaPlus size={11} /></span>
                </SearchResultItem>
              ))}
            </SearchResults>
          )}
          {watchlist.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 0', fontSize: '13px' }}>
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
          <SectionTitle><FaNewspaper color="#8b5cf6" /> Financial News</SectionTitle>
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
            <div style={{ color: '#64748b', padding: '20px 0', fontSize: '13px' }}>Loading news...</div>
          ) : filteredNews.length === 0 ? (
            <div style={{ color: '#64748b', padding: '20px 0', fontSize: '13px' }}>No news available. Configure NEWS_API_KEY for live news.</div>
          ) : (
            filteredNews.slice(0, 8).map((article, i) => (
              <NewsCard key={i} href={article.url} target="_blank" rel="noopener noreferrer">
                <NewsTitle className="title">{article.title}</NewsTitle>
                <NewsMeta>
                  <SentimentDot s={article.sentiment} />
                  <span>{article.source}</span>
                  <span>·</span>
                  <span>{timeAgo(article.published_at)}</span>
                  <FaExternalLinkAlt size={10} style={{ marginLeft: 'auto', color: '#475569' }} />
                </NewsMeta>
              </NewsCard>
            ))
          )}
        </WideCard>

        {/* Market Overview - full width */}
        <WideCard full>
          <SectionTitle><FaChartBar color="#3b82f6" /> Market Overview</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { title: 'NSE', desc: 'National Stock Exchange of India', url: 'https://www.nseindia.com', color: '#3b82f6' },
              { title: 'BSE', desc: 'Bombay Stock Exchange', url: 'https://www.bseindia.com', color: '#10b981' },
              { title: 'MoneyControl', desc: 'Stock screener & portfolio tracker', url: 'https://www.moneycontrol.com', color: '#f59e0b' },
              { title: 'Screener.in', desc: 'Fundamental stock analysis', url: 'https://www.screener.in', color: '#8b5cf6' },
              { title: 'Groww', desc: 'Invest in Mutual Funds & Stocks', url: 'https://groww.in', color: '#00d09c' },
              { title: 'Zerodha', desc: 'Discount broker & Kite platform', url: 'https://zerodha.com', color: '#387ed1' },
            ].map(link => (
              <a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ background: '#0f172a', border: `1px solid ${link.color}30`, borderRadius: '12px', padding: '16px', textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = link.color}
                onMouseOut={e => e.currentTarget.style.borderColor = link.color + '30'}>
                <div style={{ width: 36, height: 36, background: link.color + '20', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaChartBar style={{ color: link.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{link.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{link.desc}</div>
                </div>
                <FaExternalLinkAlt size={11} style={{ color: '#475569', marginLeft: 'auto', flexShrink: 0 }} />
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
