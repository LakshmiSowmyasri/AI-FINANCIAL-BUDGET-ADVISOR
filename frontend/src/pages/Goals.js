import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaCoins,
  FaCheckCircle,
  FaLaptop,
  FaCar,
  FaHome,
  FaGraduationCap,
  FaPlane,
  FaPiggyBank,
  FaTimes
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import api from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 26px;
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
      margin-top: 4px;
    }
  }
`;

const AddGoalBtn = styled.button`
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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
`;

const SummaryCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow-sm);

  .label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .value {
    font-size: 24px;
    font-weight: 700;
    color: ${p => p.color || 'var(--text-main)'};
    font-variant-numeric: tabular-nums;
  }

  .sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
`;

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const GoalCard = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid ${p => p.isCompleted ? 'var(--primary)' : 'var(--border)'};
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: var(--shadow-md);
    border-color: ${p => p.isCompleted ? 'var(--primary)' : 'var(--secondary)'};
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;

    .icon-title {
      display: flex;
      align-items: center;
      gap: 12px;

      .icon-box {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: ${p => p.isCompleted ? 'rgba(5, 150, 105, 0.12)' : 'var(--bg-canvas)'};
        color: ${p => p.isCompleted ? 'var(--primary)' : 'var(--secondary)'};
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .name-group {
        h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 2px 0;
        }
        .category-tag {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: capitalize;
        }
      }
    }

    .action-icons {
      display: flex;
      gap: 6px;

      button {
        background: none;
        border: 1px solid var(--border);
        color: var(--text-muted);
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          color: var(--text-main);
          background: var(--bg-canvas);
        }

        &.delete:hover {
          color: var(--error);
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.2);
        }
      }
    }
  }

  .amounts-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 10px;

    .saved {
      font-size: 22px;
      font-weight: 800;
      color: ${p => p.isCompleted ? 'var(--primary)' : 'var(--text-main)'};
      font-variant-numeric: tabular-nums;
    }

    .target {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
  }

  .progress-bar-bg {
    width: 100%;
    height: 8px;
    background: var(--bg-canvas);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 14px;

    .fill {
      height: 100%;
      background: ${p => p.isCompleted ? 'var(--primary)' : 'var(--gradient-emerald)'};
      border-radius: 6px;
      transition: width 0.4s ease;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;

    .stat-item {
      .stat-label {
        font-size: 11px;
        color: var(--text-muted);
        margin-bottom: 2px;
      }
      .stat-val {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
      }
    }
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    .completion-pill {
      font-size: 12px;
      font-weight: 600;
      color: var(--primary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .deposit-btn {
      padding: 7px 14px;
      background: var(--primary-subtle);
      border: 1px solid rgba(5, 150, 105, 0.25);
      border-radius: 8px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;

      &:hover {
        background: var(--btn-primary-bg);
        color: var(--btn-primary-text);
      }
    }
  }
`;

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

const Modal = styled(motion.div)`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);

  .modal-header {
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
      &:hover {
        color: var(--text-main);
      }
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  input, select {
    width: 100%;
    padding: 11px 14px;
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text-main);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;

    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-subtle);
    }
  }
`;

const PresetPills = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;

  .pill {
    padding: 6px 12px;
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;

    &:hover, &.active {
      background: var(--primary-subtle);
      border-color: rgba(5, 150, 105, 0.3);
      color: var(--primary);
    }
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 10px;
  color: var(--btn-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const CATEGORY_PRESETS = [
  { name: 'Laptop', icon: FaLaptop, category: 'tech', amount: 60000 },
  { name: 'Emergency Fund', icon: FaPiggyBank, category: 'emergency', amount: 150000 },
  { name: 'Travel', icon: FaPlane, category: 'travel', amount: 40000 },
  { name: 'Education', icon: FaGraduationCap, category: 'education', amount: 80000 },
  { name: 'Car Down Payment', icon: FaCar, category: 'vehicle', amount: 200000 },
  { name: 'House Down Payment', icon: FaHome, category: 'home', amount: 500000 }
];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);

  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'general',
    priority: 'medium',
    monthlyContribution: ''
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/goals');
      setGoals(data.goals || []);
      setSummary(data.summary || {});
    } catch (err) {
      toast.error('Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      targetAmount: preset.amount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.targetAmount) {
      return toast.error('Name and target amount are required');
    }

    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, form);
        toast.success('Goal updated!');
      } else {
        await api.post('/goals', form);
        toast.success('Savings goal created!');
      }
      setShowModal(false);
      setEditingGoal(null);
      setForm({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: 'general', priority: 'medium', monthlyContribution: '' });
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save goal');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      return toast.error('Please enter a valid deposit amount');
    }
    try {
      const { data } = await api.post(`/goals/${selectedGoal.id}/deposit`, { amount: depositAmount });
      toast.success(data.message || 'Deposit successful!');
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedGoal(null);
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deposit failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const getCategoryIcon = (category) => {
    const preset = CATEGORY_PRESETS.find(p => p.category === category);
    if (preset) {
      const IconComp = preset.icon;
      return <IconComp />;
    }
    return <FaPiggyBank />;
  };

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '16px' }}>Loading savings goals...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <div className="title-group">
          <h1><HiSparkles /> Smart Savings Goals</h1>
          <p>Track targets, calculate required monthly savings, and hit milestones</p>
        </div>
        <AddGoalBtn onClick={() => { setEditingGoal(null); setForm({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: 'general', priority: 'medium', monthlyContribution: '' }); setShowModal(true); }}>
          <FaPlus size={12} /> Create Goal
        </AddGoalBtn>
      </PageHeader>

      {/* Summary Cards */}
      <SummaryGrid>
        <SummaryCard color="var(--primary)">
          <div className="label">Total Saved</div>
          <div className="value">₹{(summary.totalCurrent || 0).toLocaleString('en-IN')}</div>
          <div className="sub">{summary.overallProgress || 0}% overall progress</div>
        </SummaryCard>
        <SummaryCard color="var(--secondary)">
          <div className="label">Target Amount</div>
          <div className="value">₹{(summary.totalTarget || 0).toLocaleString('en-IN')}</div>
          <div className="sub">Across {summary.totalGoals || 0} goals</div>
        </SummaryCard>
        <SummaryCard color="var(--text-main)">
          <div className="label">Remaining Needed</div>
          <div className="value">₹{(summary.totalRemaining || 0).toLocaleString('en-IN')}</div>
          <div className="sub">To achieve all targets</div>
        </SummaryCard>
        <SummaryCard color="var(--primary)">
          <div className="label">Completed Goals</div>
          <div className="value">{summary.completedGoals || 0} / {summary.totalGoals || 0}</div>
          <div className="sub">{summary.activeGoals || 0} active in progress</div>
        </SummaryCard>
      </SummaryGrid>

      {/* Goals Grid */}
      <GoalsGrid>
        {goals.map(goal => (
          <GoalCard key={goal.id} isCompleted={goal.isCompleted}>
            <div>
              <div className="top-row">
                <div className="icon-title">
                  <div className="icon-box">
                    {getCategoryIcon(goal.category)}
                  </div>
                  <div className="name-group">
                    <h3>{goal.name}</h3>
                    <span className="category-tag">{goal.category} • {goal.priority} priority</span>
                  </div>
                </div>
                <div className="action-icons">
                  <button onClick={() => {
                    setEditingGoal(goal);
                    setForm({
                      name: goal.name,
                      targetAmount: goal.targetAmount,
                      currentAmount: goal.currentAmount,
                      deadline: goal.deadline || '',
                      category: goal.category,
                      priority: goal.priority,
                      monthlyContribution: goal.monthlyContribution || ''
                    });
                    setShowModal(true);
                  }} title="Edit Goal">
                    <FaEdit size={12} />
                  </button>
                  <button className="delete" onClick={() => handleDelete(goal.id)} title="Delete Goal">
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>

              <div className="amounts-row">
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Savings</div>
                  <div className="saved">₹{goal.currentAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="target">
                  Target: <strong>₹{goal.targetAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="progress-bar-bg">
                <div className="fill" style={{ width: `${goal.progressPercent}%` }} />
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Progress</div>
                  <div className="stat-val" style={{ color: goal.isCompleted ? 'var(--primary)' : 'var(--text-main)' }}>
                    {goal.progressPercent}%
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Remaining Amount</div>
                  <div className="stat-val">₹{goal.remainingAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Req. Monthly Savings</div>
                  <div className="stat-val" style={{ color: 'var(--secondary)' }}>
                    {goal.requiredMonthlySavings > 0 ? `₹${goal.requiredMonthlySavings.toLocaleString('en-IN')}/mo` : '—'}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Target Date</div>
                  <div className="stat-val">
                    {goal.deadline ? new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Flexible'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer">
              {goal.isCompleted ? (
                <span className="completion-pill">
                  <FaCheckCircle /> Goal Achieved!
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {goal.monthsLeft ? `${goal.monthsLeft} months remaining` : 'Ongoing'}
                </span>
              )}
              {!goal.isCompleted && (
                <button
                  className="deposit-btn"
                  onClick={() => { setSelectedGoal(goal); setShowDepositModal(true); }}
                >
                  <FaCoins size={12} /> Add Funds
                </button>
              )}
            </div>
          </GoalCard>
        ))}

        {goals.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <FaPiggyBank size={40} style={{ color: 'var(--secondary)', marginBottom: '14px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No savings goals created yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
              Create your first target like an Emergency Fund, Laptop, or Vacation to unlock automatic progress tracking and calculations.
            </p>
            <AddGoalBtn onClick={() => setShowModal(true)}>
              <FaPlus size={12} /> Create Your First Goal
            </AddGoalBtn>
          </div>
        )}
      </GoalsGrid>

      {/* Create / Edit Goal Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Modal onClick={e => e.stopPropagation()} initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}>
              <div className="modal-header">
                <h3>{editingGoal ? 'Edit Savings Goal' : 'Create New Goal'}</h3>
                <button onClick={() => setShowModal(false)}><FaTimes /></button>
              </div>

              {!editingGoal && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Quick Presets:
                  </label>
                  <PresetPills>
                    {CATEGORY_PRESETS.map(preset => (
                      <div
                        key={preset.name}
                        className={`pill ${form.name === preset.name ? 'active' : ''}`}
                        onClick={() => handleSelectPreset(preset)}
                      >
                        <preset.icon size={12} /> {preset.name}
                      </div>
                    ))}
                  </PresetPills>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <FormGroup>
                  <label>Goal Name</label>
                  <input
                    type="text"
                    placeholder="e.g., MacBook Pro, Emergency Fund"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormGroup>
                    <label>Goal Target (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g., 50000"
                      value={form.targetAmount}
                      onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                      required
                      min="1"
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Current Savings (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={form.currentAmount}
                      onChange={e => setForm({ ...form, currentAmount: e.target.value })}
                      min="0"
                    />
                  </FormGroup>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormGroup>
                    <label>Target Date</label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={e => setForm({ ...form, deadline: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </FormGroup>
                </div>

                <FormGroup>
                  <label>Planned Monthly Deposit (₹) - Optional</label>
                  <input
                    type="number"
                    placeholder="e.g., 5000"
                    value={form.monthlyContribution}
                    onChange={e => setForm({ ...form, monthlyContribution: e.target.value })}
                    min="0"
                  />
                </FormGroup>

                <SubmitBtn type="submit">
                  {editingGoal ? 'Update Goal' : 'Create Savings Goal'}
                </SubmitBtn>
              </form>
            </Modal>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && selectedGoal && (
          <ModalOverlay onClick={() => setShowDepositModal(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Modal onClick={e => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="modal-header">
                <h3>Add Savings to {selectedGoal.name}</h3>
                <button onClick={() => setShowDepositModal(false)}><FaTimes /></button>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-canvas)', borderRadius: '10px', marginBottom: '18px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target:</span>
                  <strong>₹{selectedGoal.targetAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Currently Saved:</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>₹{selectedGoal.currentAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <form onSubmit={handleDeposit}>
                <FormGroup>
                  <label>Deposit Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g., 2000"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    required
                    min="1"
                    autoFocus
                  />
                </FormGroup>
                <SubmitBtn type="submit">
                  Confirm Deposit
                </SubmitBtn>
              </form>
            </Modal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}
