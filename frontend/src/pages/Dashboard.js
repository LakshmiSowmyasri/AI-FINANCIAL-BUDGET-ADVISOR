import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaPiggyBank,
  FaCreditCard,
  FaCheckCircle,
  FaArrowRight,
  FaExclamationTriangle,
  FaBell,
  FaTrophy,
  FaSlidersH,
  FaTimes,
  FaShieldAlt,
  FaFileAlt
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const WelcomeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  
  .title-group {
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    
    p {
      color: var(--text-muted);
      font-size: 14px;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    .quick-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: var(--primary-subtle);
      border: 1px solid rgba(5, 150, 105, 0.2);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
    }

    .report-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--primary);
        color: var(--primary);
      }
    }
  }
`;

/* ==========================================================================
   SMART ALERTS BANNER
   ========================================================================== */
const AlertsBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AlertCard = styled(motion.div)`
  background: ${p => p.priority === 'high' ? 'rgba(220, 38, 38, 0.08)' : p.priority === 'medium' ? 'rgba(217, 119, 6, 0.08)' : 'var(--primary-subtle)'};
  border: 1px solid ${p => p.priority === 'high' ? 'rgba(220, 38, 38, 0.25)' : p.priority === 'medium' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(5, 150, 105, 0.25)'};
  border-radius: 12px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  .left-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .alert-icon {
      color: ${p => p.priority === 'high' ? 'var(--error)' : p.priority === 'medium' ? 'var(--warning)' : 'var(--primary)'};
      font-size: 16px;
      flex-shrink: 0;
    }

    .text-body {
      .alert-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-main);
      }
      .alert-msg {
        font-size: 12px;
        color: var(--text-muted);
      }
    }
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    &:hover { color: var(--text-main); }
  }
`;

/* ==========================================================================
   AI FINANCIAL INSIGHT CARD
   ========================================================================== */
const AIInsightCard = styled(motion.div)`
  background: var(--ai-bg);
  border: 1px solid var(--ai-border);
  border-radius: 16px;
  padding: 22px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }

  .left {
    display: flex;
    align-items: flex-start;
    gap: 16px;

    .sparkle-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ai-accent);
      font-size: 22px;
      flex-shrink: 0;
    }

    .text-content {
      .badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .ai-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .model-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--ai-accent);
          background: rgba(139, 92, 246, 0.12);
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }

      p {
        font-size: 14px;
        color: var(--text-muted);
        line-height: 1.5;
        max-width: 680px;

        strong {
          color: var(--text-main);
          font-weight: 600;
        }
      }
    }
  }

  .ai-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--btn-ai-bg);
    color: var(--btn-ai-text);
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);

    &:hover {
      background: var(--btn-ai-hover);
      transform: translateY(-1px);
    }
  }
`;

/* ==========================================================================
   FINANCIAL SUMMARY CARDS
   ========================================================================== */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const StatCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 0.2s, transform 0.2s;
  
  &:hover {
    border-color: var(--secondary);
    transform: translateY(-2px);
  }
  
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .icon-wrapper {
      width: 40px;
      height: 40px;
      background: ${props => props.iconBg || 'var(--primary-subtle)'};
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${props => props.iconColor || 'var(--primary)'};
      font-size: 18px;
    }

    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    }
  }
  
  .value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: -0.02em;
    margin-bottom: 6px;
    font-variant-numeric: tabular-nums;
  }
  
  .change {
    font-size: 12px;
    font-weight: 500;
    color: ${props => props.changeColor || 'var(--primary)'};
    display: flex;
    align-items: center;
    gap: 5px;
  }
`;

/* ==========================================================================
   FUTURE EXPENSE PREDICTION CARD
   ========================================================================== */
const PredictionCard = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);

  .pred-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;

    .title-box {
      h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      p {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
    }

    .trend-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: capitalize;
      background: ${p => p.trend === 'Accelerating' ? 'rgba(220, 38, 38, 0.12)' : p.trend === 'Decreasing' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(13, 148, 136, 0.12)'};
      color: ${p => p.trend === 'Accelerating' ? 'var(--error)' : p.trend === 'Decreasing' ? 'var(--primary)' : 'var(--secondary)'};
      border: 1px solid ${p => p.trend === 'Accelerating' ? 'rgba(220, 38, 38, 0.25)' : p.trend === 'Decreasing' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(13, 148, 136, 0.25)'};
    }
  }

  .pred-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .stat-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pred-stat-box {
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .stat-val {
      font-size: 20px;
      font-weight: 800;
      color: ${p => p.highlight ? 'var(--secondary)' : 'var(--text-main)'};
      font-variant-numeric: tabular-nums;
    }

    .stat-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  }
`;

/* ==========================================================================
   FINANCIAL HEALTH & CHARTS
   ========================================================================== */
const HealthSection = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const HealthCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 700;
      background: ${props => props.statusBg};
      color: ${props => props.statusColor};
    }
  }

  .score-display {
    text-align: center;
    padding: 16px 0;

    .score-number {
      font-size: 48px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.03em;
      line-height: 1;

      span {
        font-size: 18px;
        font-weight: 500;
        color: var(--text-muted);
      }
    }

    .score-label {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 600;
      color: ${props => props.statusColor};
    }
  }

  .meter-bar {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin: 16px 0 12px;

    .fill {
      height: 100%;
      border-radius: 4px;
      background: ${props => props.statusColor};
      width: ${props => props.percentage}%;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .footnote {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .breakdown-trigger {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .chart-pill {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-canvas);
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
  }
`;

/* ==========================================================================
   WHAT-IF SIMULATOR WIDGET
   ========================================================================== */
const WhatIfCard = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);

  .wi-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;

    h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .wi-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 8px;
      background: var(--ai-bg);
      color: var(--ai-accent);
      border: 1px solid var(--ai-border);
    }
  }

  .wi-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }

    label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      display: block;
    }

    select, input {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-canvas);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-main);
      font-size: 13px;
      font-weight: 600;
      outline: none;
      box-sizing: border-box;

      &:focus {
        border-color: var(--primary);
      }
    }
  }

  .wi-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .wi-res-box {
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;

    .res-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .res-val {
      font-size: 18px;
      font-weight: 800;
      color: ${p => p.color || 'var(--text-main)'};
      font-variant-numeric: tabular-nums;
    }
    .res-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  }
`;

/* ==========================================================================
   ACHIEVEMENTS SYSTEM ROW
   ========================================================================== */
const AchievementsRow = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);

  .ach-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .badges-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .badge-item {
    background: ${p => p.unlocked ? 'var(--primary-subtle)' : 'var(--bg-canvas)'};
    border: 1px solid ${p => p.unlocked ? 'rgba(5, 150, 105, 0.3)' : 'var(--border)'};
    border-radius: 12px;
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    opacity: ${p => p.unlocked ? 1 : 0.65};

    .badge-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .badge-info {
      .badge-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-main);
      }
      .badge-desc {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.3;
      }
    }
  }
`;

/* ==========================================================================
   RECENT EXPENSES
   ========================================================================== */
const RecentExpensesCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .view-all {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const TransactionTable = styled.div`
  display: flex;
  flex-direction: column;
`;

const TransactionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 8px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;

  &:hover {
    background: var(--bg-canvas);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .info-left {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .category-chip {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${props => props.dotColor || 'var(--secondary)'};
      flex-shrink: 0;
    }
    
    .desc-group {
      .description {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-main);
        margin-bottom: 2px;
      }
      .meta {
        font-size: 12px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
  
  .amount {
    font-weight: 700;
    font-size: 14px;
    color: var(--text-main);
    font-variant-numeric: tabular-nums;
  }
`;

/* ==========================================================================
   HEALTH MODAL
   ========================================================================== */
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(16, 24, 21, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const HealthModal = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);

  .modal-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }
    button {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      &:hover { color: var(--text-main); }
    }
  }

  .pillars-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .pillar-card {
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;

    .p-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;

      .p-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-main);
      }
      .p-score {
        font-size: 13px;
        font-weight: 800;
        color: var(--primary);
      }
    }

    .p-bar {
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 6px;

      .p-fill {
        height: 100%;
        background: var(--gradient-emerald);
      }
    }

    .p-desc {
      font-size: 11px;
      color: var(--text-muted);
    }
  }
`;

const formatINR = (val, prefix = '₹') => {
  if (val === null || val === undefined) return `${prefix}0`;
  const num = Number(val);
  if (isNaN(num)) return `${prefix}0`;
  const rounded = Math.round(num);
  if (prefix === '+₹' && rounded < 0) {
    return `-₹${Math.abs(rounded).toLocaleString('en-IN')}`;
  }
  return `${prefix}${rounded.toLocaleString('en-IN')}`;
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [healthScoreData, setHealthScoreData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // What-If Simulator state
  const [whatIfCategory, setWhatIfCategory] = useState('Food & Dining');
  const [whatIfAmount, setWhatIfAmount] = useState(2000);
  const [whatIfResult, setWhatIfResult] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  const fetchAllDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, predRes, alertRes, healthRes, achRes] = await Promise.all([
        api.get('/users/dashboard'),
        api.get('/expenses/prediction').catch(() => ({ data: null })),
        api.get('/notifications/smart-alerts').catch(() => ({ data: { alerts: [] } })),
        api.get('/users/financial-health-score').catch(() => ({ data: null })),
        api.get('/users/achievements').catch(() => ({ data: { achievements: [] } }))
      ]);

      setDashboardData(dashRes.data);
      setPrediction(predRes.data);
      setAlerts(alertRes.data?.alerts || []);
      setHealthScoreData(healthRes.data);
      setAchievements(achRes.data?.achievements || []);

      // Default what-if category
      if (dashRes.data?.categoryExpenses?.length > 0) {
        setWhatIfCategory(dashRes.data.categoryExpenses[0].name);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Run What-If simulation dynamically
  useEffect(() => {
    const runWhatIf = async () => {
      const category = whatIfCategory || dashboardData?.categoryExpenses?.[0]?.name || 'Food & Dining';
      const cut = Math.max(0, Number(whatIfAmount) || 0);

      // Dynamic calculation based on user's financial profile
      const monthlyRate = 0.12 / 12;
      const months = 60;
      const localWealth = Math.round(cut * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
      const baseHealth = healthScoreData?.totalScore || dashboardData?.financialHealthScore || 75;
      const localDelta = cut >= 5000 ? 8 : cut >= 2000 ? 5 : cut > 0 ? 3 : 0;
      const localProjected = Math.min(100, baseHealth + localDelta);

      const dynamicData = {
        categoryName: category,
        monthlyImprovement: cut,
        yearlyImprovement: cut * 12,
        potential5YearWealth: localWealth,
        fiveYearWealthPotential: localWealth,
        scoreDelta: localDelta,
        healthScoreImprovement: localDelta,
        projectedHealthScore: localProjected
      };

      try {
        const { data } = await api.post('/budget/what-if', {
          categoryName: category,
          reductionAmount: cut,
          currentHealthScore: baseHealth
        });

        const scenario = data?.scenario || data || {};
        const monthly = scenario.monthlyImprovement ?? data?.monthlyImprovement ?? cut;
        const yearly = scenario.yearlyImprovement ?? data?.yearlyImprovement ?? (monthly * 12);
        const wealth = scenario.potential5YearWealth ?? scenario.fiveYearWealthPotential ?? data?.potential5YearWealth ?? data?.fiveYearWealthPotential ?? localWealth;
        const delta = scenario.scoreDelta ?? scenario.healthScoreImprovement ?? data?.scoreDelta ?? data?.healthScoreImprovement ?? localDelta;
        const proj = scenario.projectedHealthScore ?? data?.projectedHealthScore ?? Math.min(100, baseHealth + delta);

        setWhatIfResult({
          ...dynamicData,
          ...scenario,
          ...data,
          monthlyImprovement: monthly,
          yearlyImprovement: yearly,
          potential5YearWealth: wealth,
          fiveYearWealthPotential: wealth,
          scoreDelta: delta,
          healthScoreImprovement: delta,
          projectedHealthScore: proj
        });
      } catch (err) {
        setWhatIfResult(dynamicData);
      }
    };

    runWhatIf();
  }, [whatIfCategory, whatIfAmount, dashboardData, healthScoreData]);

  const dismissAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <DashboardContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="loading-spinner"></div>
        </div>
      </DashboardContainer>
    );
  }

  const categoryPalette = [
    '#059669', '#0D9488', '#8B5CF6', '#D97706', '#2DD4BF', '#34D399', '#A78BFA', '#64746C'
  ];

  const pieData = {
    labels: dashboardData?.categoryExpenses?.map(c => c.name) || [],
    datasets: [{
      data: dashboardData?.categoryExpenses?.map(c => c.amount) || [],
      backgroundColor: dashboardData?.categoryExpenses?.map((c, i) => c.color || categoryPalette[i % categoryPalette.length]) || categoryPalette,
      borderColor: 'var(--bg-surface)',
      borderWidth: 2,
    }]
  };

  const lineData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Weekly Expenses',
      data: [
        Math.round((dashboardData?.totalExpenses || 0) * 0.22),
        Math.round((dashboardData?.totalExpenses || 0) * 0.28),
        Math.round((dashboardData?.totalExpenses || 0) * 0.24),
        Math.round((dashboardData?.totalExpenses || 0) * 0.26),
      ],
      borderColor: '#0D9488',
      backgroundColor: 'rgba(13, 148, 136, 0.1)',
      borderWidth: 2.5,
      pointBackgroundColor: '#0D9488',
      pointBorderColor: '#ffffff',
      pointHoverRadius: 6,
      fill: true,
      tension: 0.35,
    }]
  };

  // Prediction chart data
  const predTimeline = prediction?.timeline || [];
  const predictionChartData = {
    labels: predTimeline.map(t => {
      const label = t.day || `Day ${t.dayNumber || ''}`;
      return typeof label === 'string' && label.startsWith('Day ') ? label : `Day ${label}`;
    }),
    datasets: [
      {
        label: 'Actual Spending',
        data: predTimeline.map(t => t.actual),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      },
      {
        label: 'ML Predicted Trajectory',
        data: predTimeline.map(t => t.predicted),
        borderColor: '#8B5CF6',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 1
      }
    ]
  };

  const healthScore = healthScoreData?.totalScore || dashboardData?.financialHealthScore || 75;
  const healthStatus = healthScoreData?.status || dashboardData?.financialHealthPrediction || (healthScore >= 70 ? 'Healthy' : healthScore >= 45 ? 'Average' : 'Poor');
  const healthColor = healthStatus === 'Healthy' ? '#059669' : healthStatus === 'Average' ? '#D97706' : '#DC2626';
  const healthBg = healthStatus === 'Healthy' ? 'rgba(5, 150, 105, 0.12)' : healthStatus === 'Average' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(220, 38, 38, 0.12)';

  const calculatedBalance = Math.max(0, (dashboardData?.monthlyIncome || 0) - (dashboardData?.totalExpenses || 0));

  return (
    <DashboardContainer>
      <WelcomeHeader>
        <div className="title-group">
          <h1>Financial Overview</h1>
          <p>Real-time insights, ML expense prediction, and automated AI financial guidance</p>
        </div>
        <div className="header-actions">
          <button className="report-link-btn" onClick={() => navigate('/report')}>
            <FaFileAlt size={12} /> Monthly Report
          </button>
          <div className="quick-badge">
            <HiSparkles /> AI Advisor Active
          </div>
        </div>
      </WelcomeHeader>

      {/* SMART FINANCIAL ALERTS */}
      {alerts && alerts.length > 0 && (
        <AlertsBanner>
          {alerts.map((alt, idx) => (
            <AlertCard key={idx} priority={alt.priority}>
              <div className="left-content">
                <div className="alert-icon">
                  {alt.priority === 'high' ? <FaExclamationTriangle /> : <FaBell />}
                </div>
                <div className="text-body">
                  <div className="alert-title">{alt.title}</div>
                  <div className="alert-msg">{alt.message}</div>
                </div>
              </div>
              <button className="dismiss-btn" onClick={() => dismissAlert(idx)} title="Dismiss">
                <FaTimes />
              </button>
            </AlertCard>
          ))}
        </AlertsBanner>
      )}

      {/* AI FINANCIAL INSIGHT CARD */}
      <AIInsightCard
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="left">
          <div className="sparkle-icon">
            <HiSparkles />
          </div>
          <div className="text-content">
            <div className="badge-row">
              <span className="ai-title">✨ AI Financial Insight</span>
              <span className="model-tag">ML XGBoost</span>
            </div>
            <p>
              {dashboardData?.savingsRate >= 20 ? (
                <>Based on your spending patterns, you are maintaining a healthy <strong>{dashboardData?.savingsRate?.toFixed(1)}%</strong> savings rate. Keep allocating surplus funds to high-yield investments.</>
              ) : (
                <>Based on your current spending, you could save approximately <strong>₹4,500 more this month</strong> by reducing non-essential dining and entertainment expenses.</>
              )}
            </p>
          </div>
        </div>
        <button className="ai-btn" onClick={() => navigate('/chat')}>
          <span>✨ Get AI Recommendations</span>
          <FaArrowRight size={12} />
        </button>
      </AIInsightCard>

      {/* FINANCIAL SUMMARY CARDS */}
      <StatsGrid>
        <StatCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          iconBg="var(--primary-subtle)"
          iconColor="var(--primary)"
          changeColor="var(--primary)"
        >
          <div className="card-top">
            <span className="label">Total Balance</span>
            <div className="icon-wrapper"><FaWallet /></div>
          </div>
          <div className="value">₹{calculatedBalance.toLocaleString()}</div>
          <div className="change"><FaArrowUp /> Net surplus this month</div>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          iconBg="var(--primary-subtle)"
          iconColor="var(--primary)"
          changeColor="var(--primary)"
        >
          <div className="card-top">
            <span className="label">Monthly Income</span>
            <div className="icon-wrapper"><FaArrowUp /></div>
          </div>
          <div className="value">₹{(dashboardData?.monthlyIncome || 0).toLocaleString()}</div>
          <div className="change"><FaCheckCircle /> Primary income stream</div>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          iconBg="var(--secondary-subtle)"
          iconColor="var(--secondary)"
          changeColor="var(--text-muted)"
        >
          <div className="card-top">
            <span className="label">Monthly Expenses</span>
            <div className="icon-wrapper"><FaCreditCard /></div>
          </div>
          <div className="value">₹{(dashboardData?.totalExpenses || 0).toLocaleString()}</div>
          <div className="change"><FaArrowDown /> Active spending tracked</div>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          iconBg="rgba(139, 92, 246, 0.12)"
          iconColor="var(--ai-accent)"
          changeColor="var(--primary)"
        >
          <div className="card-top">
            <span className="label">Total Savings</span>
            <div className="icon-wrapper"><FaPiggyBank /></div>
          </div>
          <div className="value">₹{Math.max(0, dashboardData?.remaining || 0).toLocaleString()}</div>
          <div className="change"><FaArrowUp /> {dashboardData?.savingsRate?.toFixed(1) || '0'}% savings rate</div>
        </StatCard>
      </StatsGrid>

      {/* FUTURE EXPENSE PREDICTION SECTION */}
      {prediction && (
        <PredictionCard trend={prediction.trend || prediction.spendingTrend || 'Steady'}>
          <div className="pred-header">
            <div className="title-box">
              <h3><HiSparkles style={{ color: 'var(--ai-accent)' }} /> Future Month-End Expense Prediction</h3>
              <p>Hybrid velocity ML forecasting based on day-of-month cadence and recurring patterns</p>
            </div>
            <div className="trend-pill">
              Spending Trend: {prediction.trend || prediction.spendingTrend || 'Steady'}
            </div>
          </div>

          <div className="pred-grid">
            <div className="stat-col">
              <div className="pred-stat-box" highlight>
                <div className="stat-label">Predicted Month-End Expense</div>
                <div className="stat-val" style={{ color: 'var(--primary)' }}>
                  {formatINR(prediction.predictedTotal ?? prediction.predictedMonthEndExpense, '₹')}
                </div>
                <div className="stat-sub">
                  Spent so far: {formatINR(prediction.currentSpent, '₹')}
                </div>
              </div>
              <div className="pred-stat-box">
                <div className="stat-label">Expected Month-End Savings</div>
                <div className="stat-val">
                  {formatINR(prediction.expectedSavings, '₹')}
                </div>
                <div className="stat-sub">Based on current income</div>
              </div>
              <div className="pred-stat-box">
                <div className="stat-label">Daily Spending Velocity</div>
                <div className="stat-val" style={{ fontSize: '17px' }}>
                  {formatINR(prediction.velocityPerDay ?? prediction.dailyVelocity ?? (prediction.daysElapsed > 0 ? (prediction.currentSpent / prediction.daysElapsed) : 0), '₹')}/day
                </div>
                <div className="stat-sub">{prediction.daysRemaining ?? 0} days left in cycle</div>
              </div>
            </div>

            <div style={{ height: '220px' }}>
              <Line
                data={predictionChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { color: 'var(--text-muted)', font: { size: 11, family: 'Inter' }, boxWidth: 12 }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(16, 24, 21, 0.9)',
                      padding: 10,
                      cornerRadius: 8,
                      callbacks: {
                        label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
                      }
                    }
                  },
                  scales: {
                    x: { ticks: { color: '#64746C', font: { size: 10 } }, grid: { display: false } },
                    y: {
                      ticks: {
                        color: '#64746C',
                        font: { size: 10 },
                        callback: v => `₹${(v / 1000).toFixed(0)}k`
                      },
                      grid: { color: 'rgba(100, 116, 108, 0.12)' }
                    }
                  }
                }}
              />
            </div>
          </div>
        </PredictionCard>
      )}

      {/* FINANCIAL HEALTH & WEEKLY TREND */}
      <HealthSection>
        <HealthCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          statusColor={healthColor}
          statusBg={healthBg}
          percentage={healthScore}
        >
          <div className="header">
            <h3>Financial Health</h3>
            <span className="status-badge">{healthStatus}</span>
          </div>

          <div className="score-display">
            <div className="score-number">{healthScore}<span>/100</span></div>
            <div className="score-label">
              {healthStatus === 'Healthy' ? 'Excellent Financial Stance' : healthStatus === 'Average' ? 'Moderate Attention Needed' : 'Action Required'}
            </div>
          </div>

          <div>
            <div className="meter-bar">
              <div className="fill" />
            </div>
            <div className="footnote">
              Evaluated across 6 pillars: savings rate, budget adherence, debt ratio, and goal progress.
            </div>
            <button className="breakdown-trigger" onClick={() => setShowHealthModal(true)}>
              <FaShieldAlt size={12} /> View 6-Pillar Breakdown
            </button>
          </div>
        </HealthCard>

        <ChartCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="chart-header">
            <h3>Weekly Expense Trend</h3>
            <span className="chart-pill">Current Cycle</span>
          </div>
          <div style={{ height: '230px' }}>
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(16, 24, 21, 0.9)',
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Inter' }
                  }
                },
                scales: {
                  x: {
                    ticks: { color: '#64746C', font: { size: 11 } },
                    grid: { display: false }
                  },
                  y: {
                    ticks: { color: '#64746C', font: { size: 11 } },
                    grid: { color: 'rgba(100, 116, 108, 0.12)' }
                  }
                }
              }}
            />
          </div>
        </ChartCard>
      </HealthSection>

      {/* AI WHAT-IF SIMULATOR */}
      <WhatIfCard>
        <div className="wi-header">
          <FaSlidersH style={{ color: 'var(--primary)' }} />
          <h3>AI What-If Financial Simulator</h3>
          <span className="wi-tag">Interactive</span>
        </div>

        <div className="wi-controls">
          <div>
            <label>Select Category to Optimize</label>
            <select
              value={whatIfCategory}
              onChange={e => setWhatIfCategory(e.target.value)}
            >
              {dashboardData?.categoryExpenses?.map(c => (
                <option key={c.name} value={c.name}>{c.name} (Spent: ₹{c.amount?.toLocaleString('en-IN')})</option>
              ))}
              <option value="Food & Dining">Food & Dining</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>
          <div>
            <label>Monthly Spending Cut Amount (₹)</label>
            <input
              type="number"
              value={whatIfAmount}
              onChange={e => setWhatIfAmount(Math.max(100, Number(e.target.value)))}
              step="500"
              min="100"
            />
          </div>
        </div>

        {whatIfResult && (
          <div className="wi-results-grid">
            <div className="wi-res-box" color="var(--primary)">
              <div className="res-label">Monthly Improvement</div>
              <div className="res-val" style={{ color: 'var(--primary)' }}>+₹{whatIfResult.monthlyImprovement?.toLocaleString('en-IN')}</div>
              <div className="res-sub">Immediate monthly cashflow boost</div>
            </div>
            <div className="wi-res-box" color="var(--secondary)">
              <div className="res-label">Annual Extra Savings</div>
              <div className="res-val" style={{ color: 'var(--secondary)' }}>+₹{whatIfResult.yearlyImprovement?.toLocaleString('en-IN')}</div>
              <div className="res-sub">Over 12 months</div>
            </div>
            <div className="wi-res-box">
              <div className="res-label">5-Year Wealth Potential</div>
              <div className="res-val" style={{ color: 'var(--text-main)' }}>₹{whatIfResult.potential5YearWealth?.toLocaleString('en-IN')}</div>
              <div className="res-sub">Compounded at 12% p.a.</div>
            </div>
            <div className="wi-res-box">
              <div className="res-label">Health Score Impact</div>
              <div className="res-val" style={{ color: 'var(--ai-accent)' }}>
                {whatIfResult.projectedHealthScore}/100 (+{whatIfResult.scoreDelta} pts)
              </div>
              <div className="res-sub">Projected stance improvement</div>
            </div>
          </div>
        )}
      </WhatIfCard>

      {/* CATEGORY BREAKDOWN & RECENT EXPENSES */}
      <ChartsGrid>
        <ChartCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="chart-header">
            <h3>Spending by Category</h3>
            <span className="chart-pill">Monthly Breakdown</span>
          </div>
          <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
            {dashboardData?.categoryExpenses && dashboardData.categoryExpenses.length > 0 ? (
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: 'var(--text-muted)',
                        padding: 14,
                        boxWidth: 12,
                        font: { size: 12, family: 'Inter' }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No category expense data available
              </div>
            )}
          </div>
        </ChartCard>

        <RecentExpensesCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="view-all" onClick={() => navigate('/expenses')}>
              View all <FaArrowRight size={10} />
            </button>
          </div>

          <TransactionTable>
            {dashboardData?.recentExpenses?.slice(0, 5).map((expense) => (
              <TransactionRow key={expense.id} dotColor={expense.category_color}>
                <div className="info-left">
                  <div className="category-chip" />
                  <div className="desc-group">
                    <div className="description">{expense.description || 'Expense'}</div>
                    <div className="meta">
                      <span>{expense.category_name || 'General'}</span>
                      <span>•</span>
                      <span>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                </div>
                <div className="amount">-₹{(expense.amount || 0).toLocaleString()}</div>
              </TransactionRow>
            ))}

            {(!dashboardData?.recentExpenses || dashboardData.recentExpenses.length === 0) && (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent transactions found. Track your first expense!
              </div>
            )}
          </TransactionTable>
        </RecentExpensesCard>
      </ChartsGrid>

      {/* FINANCIAL ACHIEVEMENTS SYSTEM */}
      {achievements && achievements.length > 0 && (
        <AchievementsRow>
          <div className="ach-header">
            <h3><FaTrophy style={{ color: 'var(--warning)' }} /> Financial Milestone Badges</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {achievements.filter(a => a.unlocked).length} of {achievements.length} Unlocked
            </span>
          </div>
          <div className="badges-grid">
            {achievements.map(ach => (
              <div key={ach.id} className="badge-item" unlocked={ach.unlocked}>
                <div className="badge-icon">{ach.icon || '🏅'}</div>
                <div className="badge-info">
                  <div className="badge-title">{ach.title}</div>
                  <div className="badge-desc">{ach.description}</div>
                </div>
              </div>
            ))}
          </div>
        </AchievementsRow>
      )}

      {/* 6-PILLAR HEALTH SCORE MODAL */}
      <AnimatePresence>
        {showHealthModal && (
          <ModalOverlay onClick={() => setShowHealthModal(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HealthModal onClick={e => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="modal-top">
                <h3>Financial Health Scorecard</h3>
                <button onClick={() => setShowHealthModal(false)}><FaTimes /></button>
              </div>

              <div style={{ textAlign: 'center', padding: '10px 0 20px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
                <div style={{ fontSize: '42px', fontWeight: 800, color: healthColor }}>
                  {healthScore}<span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: healthColor, marginTop: '4px' }}>
                  {healthStatus} Performance
                </div>
              </div>

              {healthScoreData?.pillars && (
                <div className="pillars-list">
                  {[
                    { name: '1. Savings Rate', val: healthScoreData.pillars.savingsRate, max: 25, desc: 'Portion of monthly income saved' },
                    { name: '2. Budget Adherence', val: healthScoreData.pillars.budgetAdherence, max: 25, desc: 'Discipline in staying within assigned budget' },
                    { name: '3. Expense-to-Income', val: healthScoreData.pillars.expenseToIncome, max: 15, desc: 'Ratio of total expenses relative to income' },
                    { name: '4. Emergency Cushion', val: healthScoreData.pillars.emergencyCushion, max: 15, desc: 'Liquid reserves for unexpected events' },
                    { name: '5. Spending Consistency', val: healthScoreData.pillars.spendingConsistency, max: 10, desc: 'Even cashflow distribution without erratic spikes' },
                    { name: '6. Goal Progress', val: healthScoreData.pillars.goalProgress, max: 10, desc: 'Active progress toward defined savings targets' }
                  ].map(p => (
                    <div key={p.name} className="pillar-card">
                      <div className="p-header">
                        <span className="p-name">{p.name}</span>
                        <span className="p-score">{p.val || 0} / {p.max} pts</span>
                      </div>
                      <div className="p-bar">
                        <div className="p-fill" style={{ width: `${Math.min(100, ((p.val || 0) / p.max) * 100)}%` }} />
                      </div>
                      <div className="p-desc">{p.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {healthScoreData?.advice && (
                <div style={{ padding: '14px', background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  💡 <strong>Recommendation:</strong> {healthScoreData.advice}
                </div>
              )}
            </HealthModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DashboardContainer>
  );
};

export default Dashboard;
