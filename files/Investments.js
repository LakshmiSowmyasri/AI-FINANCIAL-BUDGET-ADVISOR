import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartLine, FaPlus, FaCalculator, FaStar, FaShieldAlt, FaFire, FaLeaf, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
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

const AddBtn = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none; border-radius: 12px; color: white;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  transition: all 0.2s;
  &:hover { transform: translateY(-1px); filter: brightness(1.1); }
`;

const TabBar = styled.div`
  display: flex; gap: 6px; margin-bottom: 24px;
  background: #1e293b; border-radius: 14px; padding: 6px;
`;

const Tab = styled.button`
  flex: 1; padding: 10px 16px;
  background: ${p => p.active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent'};
  border: none; border-radius: 10px;
  color: ${p => p.active ? '#fff' : '#64748b'};
  font-size: 14px; font-weight: ${p => p.active ? '600' : '400'};
  cursor: pointer; transition: all 0.2s;
  &:hover:not([data-active="true"]) { color: #94a3b8; }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px; margin-bottom: 28px;
`;

const SummaryCard = styled.div`
  background: #1e293b;
  border: 1px solid ${p => p.highlight ? 'rgba(59,130,246,0.4)' : '#334155'};
  border-radius: 16px; padding: 20px;
  label { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .value { font-size: 22px; font-weight: 700; color: ${p => p.positive ? '#10b981' : p.negative ? '#ef4444' : '#f8fafc'}; }
  .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
`;

const SectionTitle = styled.h2`
  font-size: 18px; font-weight: 600; color: #f1f5f9;
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
`;

const RecommendationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px; margin-bottom: 32px;
`;

const FundCard = styled(motion.div)`
  background: #1e293b;
  border: 1px solid ${p => p.featured ? 'rgba(59,130,246,0.5)' : '#334155'};
  border-radius: 16px; padding: 20px;
  position: relative; overflow: hidden;
  cursor: pointer; transition: border-color 0.2s;
  &:hover { border-color: #3b82f6; }
  
  ${p => p.featured && `
    &::before {
      content: '⭐ Top Pick';
      position: absolute; top: 0; right: 0;
      background: linear-gradient(135deg, #f59e0b, #f97316);
      color: white; font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 0 16px 0 10px;
    }
  `}
`;

const FundHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
`;

const FundName = styled.div`
  .name { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 3px; }
  .category { font-size: 12px; color: #64748b; }
`;

const RiskBadge = styled.span`
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: ${p => p.risk === 'high' ? 'rgba(239,68,68,0.15)' : p.risk === 'medium-high' ? 'rgba(245,158,11,0.15)' : p.risk === 'medium' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)'};
  color: ${p => p.risk === 'high' ? '#f87171' : p.risk === 'medium-high' ? '#fbbf24' : p.risk === 'medium' ? '#60a5fa' : '#34d399'};
`;

const FundMeta = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0;
  .item { .label { font-size: 11px; color: #64748b; } .val { font-size: 13px; color: #e2e8f0; font-weight: 500; } }
`;

const MLScore = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  .label { font-size: 12px; color: #64748b; }
  .bar { flex: 1; height: 5px; background: #334155; border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b82f6, #10b981); }
  .score { font-size: 12px; font-weight: 600; color: #60a5fa; }
`;

const WhyBox = styled.div`
  background: rgba(59,130,246,0.08); border-left: 3px solid #3b82f6;
  border-radius: 0 8px 8px 0; padding: 10px 12px; margin: 12px 0;
  font-size: 12px; color: #93c5fd; line-height: 1.5;
`;

const BenefitChips = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;
`;

const Chip = styled.span`
  padding: 3px 10px; border-radius: 20px; font-size: 11px;
  background: ${p => p.green ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)'};
  color: ${p => p.green ? '#34d399' : '#a78bfa'};
  border: 1px solid ${p => p.green ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.25)'};
`;

const InvestBtn = styled.button`
  width: 100%; padding: 11px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none; border-radius: 10px;
  color: white; font-size: 14px; font-weight: 600;
  cursor: pointer; margin-top: 12px; transition: all 0.2s;
  &:hover { filter: brightness(1.1); }
`;

// SIP Calculator
const CalcCard = styled.div`
  background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px;
`;

const CalcGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const CalcGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px; display: flex; justify-content: space-between;
    span { color: #60a5fa; font-weight: 600; } }
  input[type=range] { width: 100%; accent-color: #3b82f6; }
`;

const ResultHighlight = styled.div`
  background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1));
  border: 1px solid rgba(59,130,246,0.25); border-radius: 16px; padding: 24px; text-align: center;
  margin-bottom: 20px;
  .amount { font-size: 36px; font-weight: 800; color: #60a5fa; }
  .label { color: #94a3b8; font-size: 14px; margin-top: 6px; }
`;

const ResultRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid rgba(51,65,85,0.5);
  .label { color: #94a3b8; font-size: 14px; }
  .val { font-size: 15px; font-weight: 600; color: ${p => p.gain ? '#10b981' : '#f1f5f9'}; }
`;

// Add Investment Modal
const ModalOverlay = styled(motion.div)`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 20px;
`;

const Modal = styled(motion.div)`
  background: #1e293b; border: 1px solid #334155; border-radius: 20px;
  padding: 32px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
`;

const ModalTitle = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
  h3 { font-size: 18px; font-weight: 700; color: #f8fafc; }
  button { background: none; border: none; color: #64748b; cursor: pointer; font-size: 20px; &:hover { color: #94a3b8; } }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  label { display: block; color: #94a3b8; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
`;

const FormInput = styled.input`
  width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #334155;
  border-radius: 10px; color: #f1f5f9; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s;
  &:focus { border-color: #3b82f6; }
  &::placeholder { color: #475569; }
`;

const FormSelect = styled.select`
  width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #334155;
  border-radius: 10px; color: #f1f5f9; font-size: 14px; outline: none; box-sizing: border-box;
  cursor: pointer; transition: border-color 0.2s;
  &:focus { border-color: #3b82f6; }
`;

const SaveBtn = styled.button`
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none; border-radius: 12px; color: white;
  font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px;
  &:hover { filter: brightness(1.1); }
`;

const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function Investments() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('recommendations');
  const [suggestions, setSuggestions] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [addForm, setAddForm] = useState({ type: 'sip', name: '', investedAmount: '', monthlyAmount: '', notes: '' });
  const [addLoading, setAddLoading] = useState(false);

  // SIP Calculator state
  const [sipCalc, setSipCalc] = useState({ monthly: 5000, years: 10, rate: 12, lumpsum: 0 });
  const [sipResult, setSipResult] = useState(null);
  const [sipBreakdown, setSipBreakdown] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [suggRes, portRes] = await Promise.all([
          axios.get(`${API}/investments/suggestions`, authHeaders),
          axios.get(`${API}/investments/portfolio`, authHeaders)
        ]);
        setSuggestions(suggRes.data.suggestions);
        setPortfolio(portRes.data);
      } catch (err) {
        toast.error('Failed to load investment data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-calculate SIP
  useEffect(() => {
    const calculateSIP = async () => {
      try {
        const { data } = await axios.post(`${API}/investments/calculate-sip`, {
          monthlyAmount: sipCalc.monthly,
          years: sipCalc.years,
          expectedReturn: sipCalc.rate,
          lumpsum: sipCalc.lumpsum
        }, authHeaders);
        setSipResult(data);
        setSipBreakdown(data.breakdown || []);
      } catch {}
    };
    calculateSIP();
  }, [sipCalc]);

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.investedAmount) return toast.error('Name and amount are required');
    setAddLoading(true);
    try {
      await axios.post(`${API}/investments/add`, addForm, authHeaders);
      toast.success('Investment added!');
      setShowModal(false);
      setAddForm({ type: 'sip', name: '', investedAmount: '', monthlyAmount: '', notes: '' });
      // Refresh portfolio
      const portRes = await axios.get(`${API}/investments/portfolio`, authHeaders);
      setPortfolio(portRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add investment');
    } finally {
      setAddLoading(false);
    }
  };

  const getRiskIcon = (risk) => {
    if (risk === 'high' || risk === 'medium-high') return <FaFire style={{ color: '#f87171' }} />;
    if (risk === 'medium') return <FaChartLine style={{ color: '#60a5fa' }} />;
    return <FaLeaf style={{ color: '#34d399' }} />;
  };

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>📈</div>
          <p>Loading investment recommendations...</p>
        </div>
      </Container>
    );
  }

  const summary = portfolio?.summary || {};

  return (
    <Container>
      <PageHeader>
        <h1><FaChartLine style={{ color: '#3b82f6' }} /> Investments</h1>
        <AddBtn onClick={() => setShowModal(true)}>
          <FaPlus /> Add Investment
        </AddBtn>
      </PageHeader>

      {/* Summary Cards */}
      <SummaryGrid>
        <SummaryCard>
          <label>Total Invested</label>
          <div className="value">{formatINR(summary.totalInvested || 0)}</div>
          <div className="sub">{summary.totalInvestments || 0} active investments</div>
        </SummaryCard>
        <SummaryCard positive={summary.totalGain >= 0} negative={summary.totalGain < 0}>
          <label>Current Value</label>
          <div className="value">{formatINR(summary.totalCurrentValue || 0)}</div>
          <div className="sub" style={{ color: summary.totalGain >= 0 ? '#10b981' : '#ef4444' }}>
            {summary.totalGain >= 0 ? '+' : ''}{formatINR(summary.totalGain || 0)} ({summary.gainPercent || 0}%)
          </div>
        </SummaryCard>
        <SummaryCard highlight>
          <label>Recommended Monthly SIP</label>
          <div className="value">{suggestions ? formatINR(suggestions.recommendedMonthlyInvestment) : '—'}</div>
          <div className="sub">Based on your income & risk profile</div>
        </SummaryCard>
        <SummaryCard>
          <label>Risk Profile</label>
          <div className="value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>
            {suggestions?.riskProfile || 'Moderate'}
          </div>
          <div className="sub">Savings rate: {suggestions?.savingsRate || 0}%</div>
        </SummaryCard>
      </SummaryGrid>

      {/* Tabs */}
      <TabBar>
        {[
          { id: 'recommendations', label: '🤖 AI Picks' },
          { id: 'portfolio', label: '💼 My Portfolio' },
          { id: 'calculator', label: '🧮 SIP Calculator' },
          { id: 'tax', label: '🏛️ Tax Saving' },
        ].map(t => (
          <Tab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>{t.label}</Tab>
        ))}
      </TabBar>

      <AnimatePresence mode="wait">
        {/* AI Recommendations */}
        {activeTab === 'recommendations' && (
          <motion.div key="rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionTitle><HiSparkles color="#f59e0b" /> ML-Powered Recommendations</SectionTitle>
            {suggestions?.reasoning?.map((r, i) => (
              <div key={i} style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', color: '#93c5fd', fontSize: '13px' }}>
                {r}
              </div>
            ))}
            <RecommendationGrid>
              {(suggestions?.topRecommendations || []).map((fund, i) => (
                <FundCard key={fund.id || i} featured={i === 0} whileHover={{ scale: 1.01 }}>
                  <FundHeader>
                    <FundName>
                      <div className="name">{fund.name}</div>
                      <div className="category">{fund.category} • {fund.fundHouse}</div>
                    </FundName>
                    <RiskBadge risk={fund.riskLevel}>{fund.riskLevel}</RiskBadge>
                  </FundHeader>

                  <MLScore>
                    <span className="label">AI Score</span>
                    <div className="bar"><div className="fill" style={{ width: `${(fund.mlScore || 0) * 100}%` }} /></div>
                    <span className="score">{((fund.mlScore || 0) * 100).toFixed(0)}%</span>
                  </MLScore>

                  <FundMeta>
                    <div className="item">
                      <div className="label">Expected Returns</div>
                      <div className="val">{fund.returns}</div>
                    </div>
                    <div className="item">
                      <div className="label">Min. Investment</div>
                      <div className="val">₹{fund.minInvestment}/mo</div>
                    </div>
                    <div className="item">
                      <div className="label">Recommended</div>
                      <div className="val" style={{ color: '#10b981' }}>{formatINR(fund.recommendedAmount)}/mo</div>
                    </div>
                    <div className="item">
                      <div className="label">Horizon</div>
                      <div className="val">{fund.horizon}</div>
                    </div>
                  </FundMeta>

                  <WhyBox>💡 {fund.whyRecommended}</WhyBox>

                  <BenefitChips>
                    {fund.taxBenefit && <Chip green>80C Tax Saving</Chip>}
                    {fund.lockIn && <Chip>{fund.lockIn}yr Lock-in</Chip>}
                    {getRiskIcon(fund.riskLevel)}
                  </BenefitChips>

                  <InvestBtn onClick={() => {
                    setAddForm(f => ({ ...f, name: fund.name, type: fund.type, monthlyAmount: fund.recommendedAmount }));
                    setShowModal(true);
                  }}>
                    + Add to Portfolio
                  </InvestBtn>
                </FundCard>
              ))}
            </RecommendationGrid>
          </motion.div>
        )}

        {/* Portfolio */}
        {activeTab === 'portfolio' && (
          <motion.div key="port" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionTitle><FaChartLine /> My Portfolio</SectionTitle>
            {(portfolio?.investments || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
                <p>No investments yet. Add your first investment or pick from AI recommendations!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {portfolio.investments.map(inv => {
                  const gain = parseFloat(inv.current_value) - parseFloat(inv.invested_amount);
                  const gainPct = inv.invested_amount > 0 ? (gain / inv.invested_amount * 100).toFixed(1) : 0;
                  return (
                    <div key={inv.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>{inv.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>{inv.type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '16px' }}>{formatINR(inv.current_value)}</div>
                        <div style={{ fontSize: '12px', color: gain >= 0 ? '#10b981' : '#ef4444' }}>
                          {gain >= 0 ? '+' : ''}{formatINR(gain)} ({gainPct}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* SIP Calculator */}
        {activeTab === 'calculator' && (
          <motion.div key="calc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CalcCard>
              <SectionTitle><FaCalculator /> SIP Calculator</SectionTitle>
              <CalcGrid>
                <div>
                  {[
                    { label: 'Monthly SIP', key: 'monthly', min: 500, max: 100000, step: 500, fmt: formatINR },
                    { label: 'Investment Period', key: 'years', min: 1, max: 40, step: 1, fmt: v => `${v} yrs` },
                    { label: 'Expected Return (p.a.)', key: 'rate', min: 4, max: 30, step: 0.5, fmt: v => `${v}%` },
                    { label: 'Lumpsum Amount', key: 'lumpsum', min: 0, max: 1000000, step: 5000, fmt: formatINR },
                  ].map(({ label, key, min, max, step, fmt }) => (
                    <CalcGroup key={key}>
                      <label>{label} <span>{fmt(sipCalc[key])}</span></label>
                      <input type="range" min={min} max={max} step={step} value={sipCalc[key]}
                        onChange={e => setSipCalc(s => ({ ...s, [key]: parseFloat(e.target.value) }))} />
                    </CalcGroup>
                  ))}
                </div>
                <div>
                  <ResultHighlight>
                    <div className="amount">{sipResult ? formatINR(sipResult.maturityAmount) : '—'}</div>
                    <div className="label">Maturity Value in {sipCalc.years} years</div>
                  </ResultHighlight>
                  {sipResult && (
                    <>
                      <ResultRow><span className="label">Total Invested</span><span className="val">{formatINR(sipResult.totalInvested)}</span></ResultRow>
                      <ResultRow gain><span className="label">Wealth Gained</span><span className="val">+{formatINR(sipResult.wealthGained)}</span></ResultRow>
                      <ResultRow><span className="label">Inflation-Adj. Value</span><span className="val">{formatINR(sipResult.realValueAdjusted)}</span></ResultRow>
                    </>
                  )}
                  {sipBreakdown.length > 0 && (
                    <div style={{ marginTop: '24px', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sipBreakdown}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Years', position: 'insideBottom', fill: '#64748b', fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                          <Tooltip formatter={v => formatINR(v)} labelFormatter={l => `Year ${l}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                          <Area type="monotone" dataKey="value" name="Value" stroke="#3b82f6" fill="url(#colorValue)" />
                          <Line type="monotone" dataKey="invested" name="Invested" stroke="#64748b" dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CalcGrid>
            </CalcCard>
          </motion.div>
        )}

        {/* Tax Saving */}
        {activeTab === 'tax' && (
          <motion.div key="tax" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionTitle><FaShieldAlt /> Tax Saving Investments (80C & More)</SectionTitle>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px', fontSize: '13px', color: '#6ee7b7' }}>
              💡 Section 80C allows up to ₹1.5 Lakh deduction. Section 80CCD(1B) gives extra ₹50K via NPS. Health insurance (80D) adds more savings.
            </div>
            <RecommendationGrid>
              {(suggestions?.taxSavingOptions || []).map((fund, i) => (
                <FundCard key={i} whileHover={{ scale: 1.01 }}>
                  <FundHeader>
                    <FundName>
                      <div className="name">{fund.name}</div>
                      <div className="category">{fund.category}</div>
                    </FundName>
                    <Chip green>Tax Saving</Chip>
                  </FundHeader>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.6' }}>{fund.description}</div>
                  <WhyBox>🏛️ {fund.whyRecommended}</WhyBox>
                  <FundMeta>
                    <div className="item"><div className="label">Returns</div><div className="val">{fund.returns}</div></div>
                    <div className="item"><div className="label">Lock-in</div><div className="val">{fund.lockIn ? `${fund.lockIn} years` : 'None'}</div></div>
                  </FundMeta>
                  <InvestBtn onClick={() => {
                    setAddForm(f => ({ ...f, name: fund.name, type: fund.type, monthlyAmount: fund.recommendedAmount }));
                    setShowModal(true);
                  }}>+ Add to Portfolio</InvestBtn>
                </FundCard>
              ))}
            </RecommendationGrid>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Investment Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <Modal initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <ModalTitle>
                <h3>➕ Add Investment</h3>
                <button onClick={() => setShowModal(false)}><FaTimes /></button>
              </ModalTitle>
              <form onSubmit={handleAddInvestment}>
                <FormGroup>
                  <label>Investment Type</label>
                  <FormSelect value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="sip">SIP / Mutual Fund</option>
                    <option value="stocks">Stocks</option>
                    <option value="fd">Fixed Deposit (FD)</option>
                    <option value="ppf">PPF</option>
                    <option value="nps">NPS</option>
                    <option value="gold">Gold / SGB</option>
                    <option value="elss">ELSS (Tax Saving)</option>
                    <option value="crypto">Crypto</option>
                    <option value="other">Other</option>
                  </FormSelect>
                </FormGroup>
                <FormGroup>
                  <label>Name / Fund Name</label>
                  <FormInput placeholder="e.g. Nifty 50 Index Fund" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
                </FormGroup>
                <FormGroup>
                  <label>Total Invested Amount (₹)</label>
                  <FormInput type="number" placeholder="50000" value={addForm.investedAmount} onChange={e => setAddForm(f => ({ ...f, investedAmount: e.target.value }))} required />
                </FormGroup>
                <FormGroup>
                  <label>Monthly SIP Amount (₹) — optional</label>
                  <FormInput type="number" placeholder="2000" value={addForm.monthlyAmount} onChange={e => setAddForm(f => ({ ...f, monthlyAmount: e.target.value }))} />
                </FormGroup>
                <FormGroup>
                  <label>Notes (optional)</label>
                  <FormInput placeholder="Any notes..." value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
                </FormGroup>
                <SaveBtn type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Investment'}</SaveBtn>
              </form>
            </Modal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}
