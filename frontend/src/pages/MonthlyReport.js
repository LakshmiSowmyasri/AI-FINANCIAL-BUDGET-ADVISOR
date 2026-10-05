import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FaFileAlt,
  FaPrint,
  FaChartPie
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 26px;
  color: var(--text-main);

  @media print {
    background: #ffffff !important;
    color: #111827 !important;
    padding: 0 !important;
    gap: 16px !important;
  }
`;

const HeaderBar = styled.div`
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
      margin-top: 4px;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;

    @media print {
      display: none !important;
    }
  }
`;

const Select = styled.select`
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: var(--primary);
  }
`;

const PrintBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 10px;
  color: var(--btn-primary-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);

  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const PrintableSheet = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 28px;

  @media print {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #111827 !important;
  }
`;

const StatementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 22px;
  border-bottom: 2px solid var(--border);

  .corp-info {
    h2 {
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.02em;

      span.logo-sym {
        color: var(--primary);
      }
    }
    p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }

  .statement-meta {
    text-align: right;
    .period-badge {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary);
    }
    .user-info {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
  }
`;

const KPIBanner = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
`;

const KPICard = styled.div`
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;

  @media print {
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .value {
    font-size: 22px;
    font-weight: 800;
    color: ${p => p.color || 'var(--text-main)'};
    font-variant-numeric: tabular-nums;
  }

  .meta {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
  }
`;

const InsightsSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  @media print {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
`;

const InsightBox = styled.div`
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;

  @media print {
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  h4 {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-main);
  }
`;

const TableWrapper = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;

  @media print {
    border: 1px solid #e5e7eb;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
      background: var(--bg-canvas);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      @media print {
        background: #f3f4f6;
        color: #374151;
        border-bottom: 1px solid #d1d5db;
      }
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text-main);

      @media print {
        border-bottom: 1px solid #e5e7eb;
        color: #111827;
      }
    }

    tr:last-child td {
      border-bottom: none;
    }
  }
`;

const WeeklyBars = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 10px;

  .week-col {
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    text-align: center;

    @media print {
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .week-lbl {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .week-val {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
  }
`;

const RecommendationCard = styled.div`
  padding: 14px 18px;
  border-radius: 12px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  @media print {
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .badge {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;

    &.High {
      background: rgba(220, 38, 38, 0.12);
      color: var(--error);
      border: 1px solid rgba(220, 38, 38, 0.2);
    }
    &.Medium {
      background: rgba(217, 119, 6, 0.12);
      color: var(--warning);
      border: 1px solid rgba(217, 119, 6, 0.2);
    }
    &.Low {
      background: rgba(5, 150, 105, 0.12);
      color: var(--primary);
      border: 1px solid rgba(5, 150, 105, 0.2);
    }
  }

  .rec-content {
    .rec-type {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 3px;
    }
    .rec-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }
  }
`;

export default function MonthlyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/monthly-report?month=${selectedMonth}&year=${selectedYear}`);
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      toast.error('Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <ReportContainer>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '16px' }}>Generating comprehensive monthly report...</p>
        </div>
      </ReportContainer>
    );
  }

  if (!report) {
    return (
      <ReportContainer>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p>No report data available for selected period.</p>
        </div>
      </ReportContainer>
    );
  }

  const { financials, period, user, highestCategory, categories, weeklyBreakdown, healthScore, healthStatus, aiRecommendations } = report;

  return (
    <ReportContainer>
      <HeaderBar>
        <div className="title-group">
          <h1><FaFileAlt /> AI Monthly Financial Report</h1>
          <p>Executive performance overview, category audits, and AI optimization recommendations</p>
        </div>
        <div className="actions">
          <Select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </Select>
          <Select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </Select>
          <PrintBtn onClick={handlePrint}>
            <FaPrint /> Print / Export PDF
          </PrintBtn>
        </div>
      </HeaderBar>

      <PrintableSheet>
        {/* Statement Header */}
        <StatementHeader>
          <div className="corp-info">
            <h2><span className="logo-sym">₹</span> BudgetAI Financial Statement</h2>
            <p>Certified Personal Finance Diagnostic & AI Audit</p>
          </div>
          <div className="statement-meta">
            <div className="period-badge">{period.monthName} {period.year}</div>
            <div className="user-info">Account Holder: <strong>{user.name}</strong> ({user.email})</div>
            <div className="user-info">Risk Profile: <strong>{user.riskProfile}</strong></div>
          </div>
        </StatementHeader>

        {/* Financial KPI Banner */}
        <KPIBanner>
          <KPICard color="var(--primary)">
            <div className="label">Monthly Income</div>
            <div className="value">₹{financials.income.toLocaleString('en-IN')}</div>
            <div className="meta">Baseline inflow</div>
          </KPICard>
          <KPICard color="var(--secondary)">
            <div className="label">Total Budget</div>
            <div className="value">₹{financials.totalBudget.toLocaleString('en-IN')}</div>
            <div className="meta">Assigned limit</div>
          </KPICard>
          <KPICard color="var(--text-main)">
            <div className="label">Total Expenses</div>
            <div className="value">₹{financials.totalSpent.toLocaleString('en-IN')}</div>
            <div className="meta">{financials.budgetUtilization}% of budget</div>
          </KPICard>
          <KPICard color="var(--primary)">
            <div className="label">Net Savings</div>
            <div className="value">₹{financials.netSavings.toLocaleString('en-IN')}</div>
            <div className="meta">{financials.savingsRate}% savings rate</div>
          </KPICard>
        </KPIBanner>

        {/* Executive Diagnostics */}
        <InsightsSection>
          {/* Health Score Pillar */}
          <InsightBox>
            <h4><HiSparkles style={{ color: 'var(--primary)' }} /> Financial Health Status</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                border: '4px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: '800',
                color: 'var(--primary)'
              }}>
                {healthScore}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {healthStatus} Rating
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {healthScore >= 75 ? 'Exceptional cashflow discipline and strong savings velocity.' : 'Solid progress with opportunities to curb discretionary spending.'}
                </div>
              </div>
            </div>
          </InsightBox>

          {/* Highest Spending Category */}
          <InsightBox>
            <h4><FaChartPie style={{ color: 'var(--secondary)' }} /> Spending Concentration</h4>
            {highestCategory ? (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{highestCategory.name}</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--warning)' }}>₹{highestCategory.amount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Accounts for <strong>{highestCategory.percentage}%</strong> of all expenses recorded this cycle.
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
                No significant category concentration detected.
              </div>
            )}
          </InsightBox>
        </InsightsSection>

        {/* Category Breakdown Table */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Category Budget Utilization</h3>
          <TableWrapper>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budget Allocated</th>
                  <th>Actual Spent</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: '600' }}>{cat.name}</td>
                      <td>₹{cat.allocated.toLocaleString('en-IN')}</td>
                      <td>₹{cat.spent.toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', background: 'var(--bg-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, cat.utilization)}%`, height: '100%', background: cat.utilization > 100 ? 'var(--error)' : 'var(--primary)' }} />
                          </div>
                          <span>{cat.utilization}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: cat.utilization > 100 ? 'var(--error)' : cat.utilization >= 80 ? 'var(--warning)' : 'var(--primary)'
                        }}>
                          {cat.utilization > 100 ? 'Over Budget' : cat.utilization >= 80 ? 'Near Limit' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No category expense records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrapper>
        </div>

        {/* Weekly Spending Breakdown */}
        {weeklyBreakdown && weeklyBreakdown.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Weekly Spending Flow</h3>
            <WeeklyBars>
              {weeklyBreakdown.map(wb => (
                <div key={wb.week} className="week-col">
                  <div className="week-lbl">{wb.week}</div>
                  <div className="week-val">₹{wb.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </WeeklyBars>
          </div>
        )}

        {/* AI Strategic Recommendations */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiSparkles style={{ color: 'var(--ai-accent)' }} /> AI Financial Recommendations
          </h3>
          {aiRecommendations && aiRecommendations.length > 0 ? (
            aiRecommendations.map((rec, i) => (
              <RecommendationCard key={i}>
                <span className={`badge ${rec.priority}`}>{rec.priority}</span>
                <div className="rec-content">
                  <div className="rec-type">{rec.type}</div>
                  <div className="rec-text">{rec.recommendation}</div>
                </div>
              </RecommendationCard>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Your financial trends are balanced. Maintain existing budgeting rules.</p>
          )}
        </div>

        {/* Sign-off footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Generated by BudgetAI FinTech Engine • Confidential Personal Report</span>
          <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </PrintableSheet>
    </ReportContainer>
  );
}
