import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash, FaEdit, FaChartPie } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

const BudgetContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 26px;
`;

const Header = styled.div`
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
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    p {
      color: var(--text-muted);
      font-size: 14px;
    }
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
`;

const SummaryCard = styled.div`
  background: var(--bg-surface);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  
  .label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  
  .value {
    font-size: 24px;
    font-weight: 700;
    color: ${props => props.color || 'var(--text-main)'};
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
`;

const Section = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;

      svg {
        color: var(--primary);
      }
    }
  }
`;

const AISection = styled(Section)`
  background: var(--ai-bg);
  border-color: var(--ai-border);

  .section-header h2 svg {
    color: var(--ai-accent);
  }
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
  
  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.dotColor || 'var(--primary)'};
    flex-shrink: 0;
  }
  
  .info {
    flex: 1;
    
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;

      .name {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-main);
      }

      .status-text {
        font-size: 12px;
        font-weight: 600;
        color: ${props => props.progressColor};
      }
    }
    
    .progress-bar {
      height: 7px;
      background: var(--bg-canvas);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
      border: 1px solid var(--border);
      
      .fill {
        height: 100%;
        background: ${props => props.progressColor};
        width: ${props => Math.min(100, props.percentage || 0)}%;
        transition: width 0.4s ease;
      }
    }
    
    .stats {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      font-variant-numeric: tabular-nums;
    }
  }
  
  .actions {
    display: flex;
    gap: 8px;
    
    button {
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: 7px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.edit {
        background: var(--secondary-subtle);
        color: var(--secondary);
        border-color: rgba(13, 148, 136, 0.2);
        
        &:hover {
          filter: brightness(1.15);
        }
      }
      
      &.delete {
        background: var(--error-subtle);
        color: var(--error);
        border-color: rgba(220, 38, 38, 0.2);
        
        &:hover {
          filter: brightness(1.15);
        }
      }
    }
  }
`;

const RecommendationCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .type {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    background: rgba(139, 92, 246, 0.12);
    color: var(--ai-accent);
    border: 1px solid var(--ai-border);
    border-radius: 16px;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  
  .message {
    color: var(--text-main);
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.5;
  }
  
  .suggestion-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--text-muted);
    
    strong {
      color: var(--primary);
      font-weight: 600;
    }
  }
`;

const AddButton = styled.button`
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
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
  
  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(16, 24, 21, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  max-width: 440px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 20px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 18px;
  
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
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
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-subtle);
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
  
  button {
    flex: 1;
    padding: 12px 18px;
    border: none;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &.primary {
      background: var(--btn-primary-bg);
      color: var(--btn-primary-text);
      
      &:hover {
        background: var(--btn-primary-hover);
        transform: translateY(-1px);
      }
    }
    
    &.secondary {
      background: var(--bg-canvas);
      color: var(--text-main);
      border: 1px solid var(--border);
      
      &:hover {
        background: var(--border-subtle);
      }
    }
  }
`;

const Budget = () => {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
    color: '#059669',
    icon: 'wallet'
  });

  const fintechColors = ['#059669', '#0D9488', '#8B5CF6', '#D97706', '#2DD4BF', '#10B981', '#34D399', '#64746C'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, summaryRes, recommendationsRes] = await Promise.all([
        api.get('/budget/categories'),
        api.get('/budget/summary'),
        api.get('/budget/recommendations')
      ]);
      setCategories(categoriesRes.data.categories || []);
      setSummary(summaryRes.data || {});
      setRecommendations(recommendationsRes.data.recommendations || []);
    } catch (error) {
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleTotalBudgetSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(totalBudgetInput);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    try {
      await api.put('/budget/total-budget', { totalBudget: val });
      toast.success('Total Budget updated');
      setShowBudgetModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update total budget');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name.trim(),
        allocatedAmount: formData.allocatedAmount !== '' ? parseFloat(formData.allocatedAmount) : 0,
        color: formData.color || '#059669',
        icon: formData.icon || 'wallet'
      };
      if (editingCategory) {
        await api.put(`/budget/categories/${editingCategory.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/budget/categories', payload);
        toast.success('Category added');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save category:', error);
      const msg = error.response?.data?.error || 'Failed to save category';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/budget/categories/${id}`);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Section 9: Progress Color Semantics
  // Emerald (< 80%), Amber (80% - 100%), Red (> 100%)
  const getProgressColor = (percent) => {
    if (percent > 100) return '#DC2626'; // Red exceeded
    if (percent >= 80) return '#D97706';  // Amber approaching limit
    return '#059669';                    // Emerald normal/healthy
  };

  if (loading) {
    return (
      <BudgetContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="loading-spinner"></div>
        </div>
      </BudgetContainer>
    );
  }

  return (
    <BudgetContainer>
      <Header>
        <div className="title-group">
          <h1>Budget Management</h1>
          <p>Allocate monthly limits and track category-level utilization</p>
        </div>
        <AddButton onClick={() => { setEditingCategory(null); setFormData({ name: '', allocatedAmount: '', color: '#059669' }); setShowModal(true); }}>
          <FaPlus size={12} /> Add Category
        </AddButton>
      </Header>

      <SummaryCards>
        <SummaryCard color="var(--primary)">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div className="label" style={{ margin: 0 }}>Total Budget</div>
            <button
              onClick={() => { setTotalBudgetInput(summary.totalBudget || ''); setShowBudgetModal(true); }}
              style={{
                background: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                color: 'var(--primary)',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Edit Total Budget"
            >
              <FaEdit size={10} /> Edit
            </button>
          </div>
          <div className="value">₹{(summary.totalBudget || 0).toLocaleString()}</div>
        </SummaryCard>
        <SummaryCard color="var(--secondary)">
          <div className="label">Total Spent</div>
          <div className="value">₹{(summary.totalSpent || 0).toLocaleString()}</div>
        </SummaryCard>
        <SummaryCard color={(summary.remaining || 0) >= 0 ? 'var(--primary)' : 'var(--error)'}>
          <div className="label">Remaining Budget</div>
          <div className="value">₹{(summary.remaining || 0).toLocaleString()}</div>
        </SummaryCard>
        <SummaryCard color="var(--primary)">
          <div className="label">Savings Rate</div>
          <div className="value">{(summary.savingsRate || 0).toFixed(1)}%</div>
        </SummaryCard>
      </SummaryCards>

      <Section>
        <div className="section-header">
          <h2><FaChartPie /> Budget Categories & Utilization</h2>
        </div>
        
        {categories.map((category) => {
          const usagePercent = Math.round((category.spent_amount / (category.allocated_amount || 1)) * 100) || 0;
          const progressColor = getProgressColor(usagePercent);

          return (
            <CategoryItem
              key={category.id}
              dotColor={category.color || 'var(--primary)'}
              percentage={usagePercent}
              progressColor={progressColor}
            >
              <div className="color-dot" />
              <div className="info">
                <div className="name-row">
                  <span className="name">{category.name}</span>
                  <span className="status-text">
                    {usagePercent > 100 ? 'Budget Exceeded' : usagePercent >= 80 ? 'Approaching Limit' : `${usagePercent}%`}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="fill" />
                </div>
                <div className="stats">
                  <span>Spent: ₹{(category.spent_amount || 0).toLocaleString()}</span>
                  <span>Limit: ₹{(category.allocated_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="actions">
                <button className="edit" onClick={() => { setEditingCategory(category); setFormData({ name: category.name, allocatedAmount: category.allocated_amount, color: category.color || '#059669', icon: category.icon || 'wallet' }); setShowModal(true); }}>
                  <FaEdit size={12} />
                </button>
                <button className="delete" onClick={() => handleDelete(category.id)}>
                  <FaTrash size={12} />
                </button>
              </div>
            </CategoryItem>
          );
        })}

        {categories.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px', fontSize: '14px' }}>
            No budget categories found. Add your first category to start budgeting!
          </p>
        )}
      </Section>

      {/* SECTION 3 & 5: AI Smart Recommendations with Violet Identity */}
      <AISection>
        <div className="section-header">
          <h2><HiSparkles /> ✨ AI Smart Recommendations</h2>
        </div>
        {recommendations.map((rec, index) => (
          <RecommendationCard key={index}>
            <div className="type"><HiSparkles /> {rec.type || 'AI Insight'}</div>
            <div className="message">{rec.message}</div>
            <div className="suggestion-row">
              {rec.suggestedAllocation && (
                <div>
                  Suggested allocation: <strong>₹{rec.suggestedAllocation?.toLocaleString()}</strong>
                </div>
              )}
              {rec.potentialSavings && (
                <div>
                  Potential savings: <strong>₹{rec.potentialSavings?.toLocaleString()}</strong>
                </div>
              )}
            </div>
          </RecommendationCard>
        ))}
        {recommendations.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 16px', fontSize: '13px' }}>
            Tracking your monthly expenses enables the AI model to generate automated saving suggestions.
          </p>
        )}
      </AISection>

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <label>Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Groceries"
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Monthly Budget (₹)</label>
                <input
                  type="number"
                  value={formData.allocatedAmount}
                  onChange={e => setFormData({...formData, allocatedAmount: e.target.value})}
                  placeholder="0.00"
                  required
                  min="0"
                />
              </FormGroup>
              <FormGroup>
                <label>Category Accent Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {fintechColors.map(color => (
                    <div
                      key={color}
                      onClick={() => setFormData({...formData, color})}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: color,
                        cursor: 'pointer',
                        border: formData.color === color ? '2px solid var(--text-main)' : '2px solid transparent',
                        boxShadow: formData.color === color ? '0 0 0 2px var(--primary-subtle)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </FormGroup>
              <ButtonGroup>
                <button type="submit" className="primary">
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}

      {showBudgetModal && (
        <Modal onClick={() => setShowBudgetModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>Set Fixed Total Budget</h2>
            <form onSubmit={handleTotalBudgetSubmit}>
              <FormGroup>
                <label>Total Monthly Budget (₹)</label>
                <input
                  type="number"
                  value={totalBudgetInput}
                  onChange={e => setTotalBudgetInput(e.target.value)}
                  placeholder="20000"
                  min="0"
                  step="1"
                  required
                  autoFocus
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                  This sets your overall fixed budget. Adding or editing categories will allocate from this amount and decrease your Remaining Budget without increasing Total Budget.
                </p>
              </FormGroup>
              <ButtonGroup>
                <button type="submit" className="primary">
                  Save Total Budget
                </button>
                <button type="button" className="secondary" onClick={() => setShowBudgetModal(false)}>
                  Cancel
                </button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </BudgetContainer>
  );
};

export default Budget;
