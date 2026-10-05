import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartLine, FaPlus, FaCalculator, FaShieldAlt, FaFire, FaLeaf, FaTimes } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
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
        color: var(--primary);
      }
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 2px;
    }
  }
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 11px;
  color: var(--btn-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.2);
  
  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 5px;
  overflow-x: auto;
`;

const Tab = styled.button`
  flex: 1;
  padding: 10px 16px;
  background: ${p => p.active ? 'var(--btn-primary-bg)' : 'transparent'};
  border: none;
  border-radius: 9px;
  color: ${p => p.active ? 'var(--btn-primary-text)' : 'var(--text-muted)'};
  font-size: 13px;
  font-weight: ${p => p.active ? '700' : '500'};
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  
  &:hover:not([data-active="true"]) {
    color: var(--text-main);
    background: ${p => p.active ? 'var(--btn-primary-bg)' : 'var(--primary-subtle)'};
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
`;

const SummaryCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid ${p => p.highlight ? 'var(--secondary)' : 'var(--border)'};
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  
  label {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .value {
    font-size: 22px;
    font-weight: 700;
    color: ${p => p.positive ? 'var(--primary)' : p.negative ? 'var(--error)' : 'var(--text-main)'};
    font-variant-numeric: tabular-nums;
  }
  .sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;

  svg {
    color: var(--secondary);
  }
`;

const RecommendationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const FundCard = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid ${p => p.featured ? 'var(--secondary)' : 'var(--border)'};
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s ease, transform 0.2s ease;
  
  &:hover {
    border-color: var(--secondary);
    transform: translateY(-2px);
  }
  
  ${p => p.featured && `
    &::before {
      content: '⭐ Top Pick';
      position: absolute; top: 0; right: 0;
      background: var(--warning);
      color: #101815; font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 0 14px 0 10px;
    }
  `}
`;

const FundHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const FundName = styled.div`
  .name { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; }
  .category { font-size: 12px; color: var(--text-muted); }
`;

const RiskBadge = styled.span`
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: ${p => p.risk === 'high' ? 'var(--error-subtle)' : p.risk === 'medium-high' ? 'var(--warning-subtle)' : p.risk === 'medium' ? 'var(--secondary-subtle)' : 'var(--primary-subtle)'};
  color: ${p => p.risk === 'high' ? 'var(--error)' : p.risk === 'medium-high' ? 'var(--warning)' : p.risk === 'medium' ? 'var(--secondary)' : 'var(--primary)'};
`;

const FundMeta = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0;
  .item { .label { font-size: 11px; color: var(--text-muted); } .val { font-size: 13px; color: var(--text-main); font-weight: 600; font-variant-numeric: tabular-nums; } }
`;

const MLScore = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  .label { font-size: 11px; font-weight: 600; color: var(--ai-accent); display: flex; align-items: center; gap: 4px; }
  .bar { flex: 1; height: 6px; background: var(--bg-canvas); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; background: var(--ai-accent); }
  .score { font-size: 12px; font-weight: 700; color: var(--ai-accent); }
`;

const WhyBox = styled.div`
  background: var(--ai-bg); border-left: 3px solid var(--ai-accent);
  border-radius: 0 8px 8px 0; padding: 10px 12px; margin: 12px 0;
  font-size: 12px; color: var(--text-muted); line-height: 1.5;
`;

const BenefitChips = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;
`;

const Chip = styled.span`
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
  background: ${p => p.green ? 'var(--primary-subtle)' : 'var(--ai-bg)'};
  color: ${p => p.green ? 'var(--primary)' : 'var(--ai-accent)'};
  border: 1px solid ${p => p.green ? 'rgba(5,150,105,0.2)' : 'var(--ai-border)'};
`;

const InvestBtn = styled.button`
  width: 100%; padding: 10px;
  background: var(--btn-primary-bg);
  border: none; border-radius: 9px;
  color: var(--btn-primary-text); font-size: 13px; font-weight: 600;
  cursor: pointer; margin-top: 12px; transition: all 0.15s ease;
  &:hover { background: var(--btn-primary-hover); transform: translateY(-1px); }
`;

// SIP Calculator
const CalcCard = styled.div`
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: 26px;
  box-shadow: var(--shadow-sm);
`;

const CalcGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const CalcGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 8px; display: flex; justify-content: space-between;
    span { color: var(--primary); font-weight: 700; } }
  input[type=range] { width: 100%; accent-color: var(--primary); }
`;

const ResultHighlight = styled.div`
  background: var(--primary-subtle);
  border: 1px solid rgba(5,150,105,0.25); border-radius: 14px; padding: 22px; text-align: center;
  margin-bottom: 20px;
  .amount { font-size: 34px; font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
  .label { color: var(--text-muted); font-size: 13px; margin-top: 6px; font-weight: 500; }
`;

const ResultRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border);
  .label { color: var(--text-muted); font-size: 13px; }
  .val { font-size: 14px; font-weight: 600; color: ${p => p.gain ? 'var(--primary)' : 'var(--text-main)'}; font-variant-numeric: tabular-nums; }
`;

// Add Investment Modal
const ModalOverlay = styled(motion.div)`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(16,24,21,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px;
`;

const Modal = styled(motion.div)`
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 18px;
  padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg);
`;

const ModalTitle = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  h3 { font-size: 18px; font-weight: 700; color: var(--text-main); }
  button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; &:hover { color: var(--text-main); } }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  label { display: block; color: var(--text-muted); font-size: 13px; font-weight: 600; margin-bottom: 6px; }
`;

const FormInput = styled.input`
  width: 100%; padding: 11px 14px; background: var(--bg-canvas); border: 1px solid var(--border);
  border-radius: 9px; color: var(--text-main); font-size: 14px; outline: none; box-sizing: border-box;
  transition: all 0.2s ease;
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-subtle); }
  &::placeholder { color: var(--text-muted); }
`;

const FormSelect = styled.select`
  width: 100%; padding: 11px 14px; background: var(--bg-canvas); border: 1px solid var(--border);
  border-radius: 9px; color: var(--text-main); font-size: 14px; outline: none; box-sizing: border-box;
  cursor: pointer; transition: all 0.2s ease;
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-subtle); }
`;

const SaveBtn = styled.button`
  width: 100%; padding: 12px;
  background: var(--btn-primary-bg);
  border: none; border-radius: 10px; color: var(--btn-primary-text);
  font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 10px;
  transition: all 0.15s ease;
  &:hover { background: var(--btn-primary-hover); transform: translateY(-1px); }
`;

const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function Investments() {
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

  // Investment Planner state
  const [plannerForm, setPlannerForm] = useState({
    riskProfile: 'Moderate',
    monthlyInvestment: 10000,
    durationYears: 10,
    goal: 'Wealth Creation'
  });
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const runSimulation = async () => {
      try {
        setPlannerLoading(true);
        setPlannerError('');
        const { data } = await api.post('/investments/simulate-plan', plannerForm, {
          signal: controller.signal
        });
        const result = data?.plan || data;

        if (!result || !Number.isFinite(Number(result.simulatedWealth ?? result.estimatedFutureValue))) {
          throw new Error('The investment simulator returned an invalid result. Please try again.');
        }

        setPlannerResult({
          ...result,
          simulatedWealth: Number(result.simulatedWealth ?? result.estimatedFutureValue),
          totalInvested: Number(result.totalInvested),
          wealthGained: Number(result.wealthGained ?? result.estimatedGain),
          expectedAnnualReturn: Number(result.expectedAnnualReturn ?? result.blendedReturnRate),
          assetAllocation: (result.assetAllocation || result.allocation || []).map(asset => ({
            ...asset,
            name: asset.name || asset.category,
            monthlyShare: asset.monthlyShare ?? asset.monthlyAmount
          })),
          trajectory: (result.trajectory || []).map(point => ({
            ...point,
            projectedValue: point.projectedValue ?? point.estimatedValue,
            year: point.year ?? point.label
          }))
        });
      } catch (err) {
        if (isCurrentRequest && err.code !== 'ERR_CANCELED') {
          setPlannerError(
            err.response?.data?.error ||
            err.message ||
            'Unable to run the investment simulation. Check your connection and try again.'
          );
        }
      } finally {
        if (isCurrentRequest) setPlannerLoading(false);
      }
    };

    runSimulation();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [plannerForm]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [suggRes, portRes] = await Promise.all([
          api.get('/investments/suggestions'),
          api.get('/investments/portfolio')
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
        const { data } = await api.post('/investments/calculate-sip', {
          monthlyAmount: sipCalc.monthly,
          years: sipCalc.years,
          expectedReturn: sipCalc.rate,
          lumpsum: sipCalc.lumpsum
        });
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
      await api.post('/investments/add', addForm);
      toast.success('Investment added!');
      setShowModal(false);
      setAddForm({ type: 'sip', name: '', investedAmount: '', monthlyAmount: '', notes: '' });
      // Refresh portfolio
      const portRes = await api.get('/investments/portfolio');
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
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
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
        <div className="title-group">
          <h1><FaChartLine style={{ color: 'var(--secondary)' }} /> Investments & SIP Portfolio</h1>
          <p>AI recommendations, SIP projections, and tax-saving asset allocations</p>
        </div>
        <AddBtn onClick={() => setShowModal(true)}>
          <FaPlus size={12} /> Add Investment
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
          <div className="sub" style={{ color: summary.totalGain >= 0 ? 'var(--primary)' : 'var(--error)' }}>
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
          { id: 'planner', label: '💡 Investment Planner' },
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
            <SectionTitle><HiSparkles style={{ color: 'var(--ai-accent)' }} /> ML-Powered Recommendations</SectionTitle>
            {suggestions?.reasoning?.map((r, i) => (
              <div key={i} style={{ background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', color: 'var(--text-main)', fontSize: '13px' }}>
                ✨ {r}
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
                      <div className="label">Growth</div>
                      <div className="val">{fund.returns}</div>
                    </div>
                    <div className="item">
                      <div className="label">Starting Amount</div>
                      <div className="val">₹{fund.minInvestment}</div>
                    </div>
                    <div className="item">
                      <div className="label">Monthly Amount</div>
                      <div className="val" style={{ color: 'var(--primary)' }}>{formatINR(fund.recommendedAmount)}</div>
                    </div>
                    <div className="item">
                      <div className="label">Duration</div>
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

        {/* Investment Planner Simulation */}
        {activeTab === 'planner' && (
          <motion.div key="planner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CalcCard>
              <SectionTitle><HiSparkles style={{ color: 'var(--primary)' }} /> AI Investment Simulator & Asset Allocation</SectionTitle>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-8px', marginBottom: '22px' }}>
                Simulate portfolio growth across diversified asset classes tailored to your risk tolerance and life milestones.
              </p>

              {/* Risk Profile Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Select Risk Appetite:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { id: 'Conservative', label: '🛡️ Conservative', desc: 'Capital preservation • Fixed-income & Gold focus (~8.5% p.a.)' },
                    { id: 'Moderate', label: '⚖️ Moderate', desc: 'Balanced growth • Index + Flexicap + Debt (~11.5% p.a.)' },
                    { id: 'Aggressive', label: '🚀 Aggressive', desc: 'High equity velocity • Mid/Small cap & Tech (~14.0% p.a.)' }
                  ].map(r => (
                    <div
                      key={r.id}
                      onClick={() => setPlannerForm(p => ({ ...p, riskProfile: r.id }))}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: plannerForm.riskProfile === r.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: plannerForm.riskProfile === r.id ? 'var(--primary-subtle)' : 'var(--bg-canvas)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '14px', color: plannerForm.riskProfile === r.id ? 'var(--primary)' : 'var(--text-main)', marginBottom: '4px' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Controls & Results Grid */}
              <CalcGrid>
                <div>
                  <CalcGroup>
                    <label>
                      Monthly Investment Amount
                      <span>{formatINR(plannerForm.monthlyInvestment)}/mo</span>
                    </label>
                    <input
                      type="range"
                      min={1000}
                      max={100000}
                      step={1000}
                      value={plannerForm.monthlyInvestment}
                      onChange={e => setPlannerForm(p => ({ ...p, monthlyInvestment: Number(e.target.value) }))}
                    />
                  </CalcGroup>

                  <CalcGroup>
                    <label>
                      Investment Horizon
                      <span>{plannerForm.durationYears} Years</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={plannerForm.durationYears}
                      onChange={e => setPlannerForm(p => ({ ...p, durationYears: Number(e.target.value) }))}
                    />
                  </CalcGroup>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Financial Target / Goal
                    </label>
                    <FormSelect
                      value={plannerForm.goal}
                      onChange={e => setPlannerForm(p => ({ ...p, goal: e.target.value }))}
                    >
                      <option value="Wealth Creation">💎 Wealth Creation</option>
                      <option value="Retirement">🏖️ Retirement Corpus</option>
                      <option value="House Down Payment">🏡 House Down Payment</option>
                      <option value="Education">🎓 Higher Education</option>
                      <option value="Emergency Reserve">🛡️ Emergency Reserve</option>
                    </FormSelect>
                  </div>

                  {/* Asset Allocation Breakdown */}
                  {plannerResult?.assetAllocation && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                        Simulated Asset Allocation
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {plannerResult.assetAllocation.map(asset => (
                          <div key={asset.name} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{asset.name}</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: asset.color }}>{asset.percentage}% ({formatINR(asset.monthlyShare)}/mo)</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${asset.percentage}%`, height: '100%', background: asset.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulation Output Column */}
                <div>
                  <ResultHighlight style={{ opacity: plannerLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                    <div className="amount">{plannerResult ? formatINR(plannerResult.simulatedWealth) : plannerLoading ? 'Calculating…' : '—'}</div>
                    <div className="label">
                      Expected Wealth in {plannerForm.durationYears} Years for "{plannerForm.goal}"
                    </div>
                  </ResultHighlight>

                  {plannerError && (
                    <div role="alert" style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      background: 'var(--error-subtle)',
                      border: '1px solid var(--error)',
                      borderRadius: '10px',
                      color: 'var(--error)',
                      fontSize: '12px',
                      lineHeight: '1.5'
                    }}>
                      {plannerError}
                    </div>
                  )}

                  {plannerResult && (
                    <>
                      <ResultRow>
                        <span className="label">Total Principal Invested</span>
                        <span className="val">{formatINR(plannerResult.totalInvested)}</span>
                      </ResultRow>
                      <ResultRow gain>
                        <span className="label">Expected Compounding Gain</span>
                        <span className="val">+{formatINR(plannerResult.wealthGained)}</span>
                      </ResultRow>
                      <ResultRow>
                        <span className="label">Blended Expected Return</span>
                        <span className="val" style={{ color: 'var(--secondary)' }}>{plannerResult.expectedAnnualReturn}% p.a.</span>
                      </ResultRow>
                    </>
                  )}

                  {/* Growth Trajectory Chart */}
                  {plannerResult?.trajectory && plannerResult.trajectory.length > 0 && (
                    <div style={{ marginTop: '20px', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={plannerResult.trajectory}>
                          <defs>
                            <linearGradient id="colorPlanner" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                          <Tooltip formatter={v => formatINR(v)} labelFormatter={l => `Year ${l}`} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)' }} />
                          <Area type="monotone" dataKey="projectedValue" name="Simulated Wealth" stroke="#059669" fill="url(#colorPlanner)" strokeWidth={2} />
                          <Line type="monotone" dataKey="invested" name="Invested Principal" stroke="var(--text-muted)" dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Disclaimer banner */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5'
                  }}>
                    ⚖️ <strong>Disclaimer:</strong> {plannerResult?.disclaimer || 'Investment projections are simulated estimates based on historical asset class performance and are not guaranteed returns. Past performance does not guarantee future results.'}
                  </div>
                </div>
              </CalcGrid>
            </CalcCard>
          </motion.div>
        )}

        {/* Portfolio */}
        {activeTab === 'portfolio' && (
          <motion.div key="port" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SectionTitle><FaChartLine /> My Portfolio</SectionTitle>
            {(portfolio?.investments || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
                <p>No investments yet. Add your first investment or pick from AI recommendations!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {portfolio.investments.map(inv => {
                  const gain = parseFloat(inv.current_value) - parseFloat(inv.invested_amount);
                  const gainPct = inv.invested_amount > 0 ? (gain / inv.invested_amount * 100).toFixed(1) : 0;
                  return (
                    <div key={inv.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>{inv.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{inv.type}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '16px' }}>{formatINR(inv.current_value)}</div>
                        <div style={{ fontSize: '12px', color: gain >= 0 ? 'var(--primary)' : 'var(--error)' }}>
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
                              <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 11 }} label={{ value: 'Years', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                          <Tooltip formatter={v => formatINR(v)} labelFormatter={l => `Year ${l}`} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)' }} />
                          <Area type="monotone" dataKey="value" name="Value" stroke="#0D9488" fill="url(#colorValue)" strokeWidth={2} />
                          <Line type="monotone" dataKey="invested" name="Invested" stroke="var(--text-muted)" dot={false} strokeDasharray="4 4" />
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
            <div style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px', fontSize: '13px', color: 'var(--primary)' }}>
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
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.6' }}>{fund.description}</div>
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
