import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaCalendar, FaTag, FaCreditCard, FaSearch, FaWallet } from 'react-icons/fa';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

const ExpensesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
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
      font-size: 14px;
      color: var(--text-muted);
    }
  }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 11px;
  color: var(--btn-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
  
  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const Filters = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
  min-width: 240px;
  
  input {
    width: 100%;
    padding: 10px 16px 10px 42px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-main);
    font-size: 14px;
    transition: all 0.2s ease;
    
    &::placeholder {
      color: var(--text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-subtle);
    }
  }
  
  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 14px;
  }
`;

const Select = styled.select`
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-main);
  font-size: 14px;
  min-width: 150px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-subtle);
  }
`;

const ExpenseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ExpenseCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: 14px;
  padding: 16px 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s ease, transform 0.2s ease;
  
  &:hover {
    border-color: var(--secondary);
    transform: translateY(-1px);
  }
`;

const ExpenseInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  .icon {
    width: 42px;
    height: 42px;
    background: var(--secondary-subtle);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary);
    font-size: 16px;
    flex-shrink: 0;
  }
  
  .details {
    .description {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: var(--text-muted);
      
      span {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .category-tag {
        background: var(--primary-subtle);
        color: var(--primary);
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 500;
      }
    }
  }
`;

const ExpenseAmount = styled.div`
  text-align: right;
  
  .amount {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 8px;
    font-variant-numeric: tabular-nums;
  }
  
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    
    button {
      padding: 5px 10px;
      border: 1px solid transparent;
      border-radius: 7px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      
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
  padding: 30px;
  width: 100%;
  max-width: 480px;
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

const Expenses = () => {
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    categoryId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/budget/categories')
      ]);
      setExpenses(expensesRes.data.expenses || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, formData);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', formData);
        toast.success('Expense added');
      }
      setShowModal(false);
      setEditingExpense(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount,
      categoryId: expense.category_id || '',
      expenseDate: expense.expense_date ? expense.expense_date.split('T')[0] : '',
      paymentMethod: expense.payment_method || 'cash'
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      amount: '',
      categoryId: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash'
    });
    setShowModal(true);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch = !normalizedSearch || [
        exp.description,
        exp.merchant,
        exp.notes,
        exp.category_name
      ].some(value => String(value || '').toLowerCase().includes(normalizedSearch));
      const matchesCategory = !selectedCategory || String(exp.category_id) === String(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  if (loading) {
    return (
      <ExpensesContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="loading-spinner"></div>
        </div>
      </ExpensesContainer>
    );
  }

  return (
    <ExpensesContainer>
      <Header>
        <div className="title-group">
          <h1>Expenses Tracker</h1>
          <p>Monitor your daily transactions, categories, and payment methods</p>
        </div>
        <AddButton onClick={openAddModal}>
          <FaPlus size={13} /> Add Expense
        </AddButton>
      </Header>

      <Filters>
        <SearchInput>
          <FaSearch />
          <input
            type="text"
            placeholder="Search expenses by merchant or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchInput>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </Select>
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last">Last Month</option>
          <option value="3months">Last 3 Months</option>
        </Select>
      </Filters>

      <ExpenseList>
        {filteredExpenses.map((expense, index) => (
          <ExpenseCard
            key={expense.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
          >
            <ExpenseInfo>
              <div className="icon"><FaTag /></div>
              <div className="details">
                <div className="description">{expense.description || 'Expense'}</div>
                <div className="meta">
                  <span><FaCalendar size={11} /> {new Date(expense.expense_date).toLocaleDateString()}</span>
                  <span><FaCreditCard size={11} /> {expense.payment_method?.replace('_', ' ') || 'Cash'}</span>
                  <span className="category-tag">{expense.category_name || 'Uncategorized'}</span>
                </div>
              </div>
            </ExpenseInfo>
            <ExpenseAmount>
              <div className="amount">-₹{(expense.amount || 0).toLocaleString()}</div>
              <div className="actions">
                <button className="edit" onClick={() => openEditModal(expense)}>
                  <FaEdit size={11} /> Edit
                </button>
                <button className="delete" onClick={() => handleDelete(expense.id)}>
                  <FaTrash size={11} /> Delete
                </button>
              </div>
            </ExpenseAmount>
          </ExpenseCard>
        ))}

        {filteredExpenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <FaWallet size={40} style={{ marginBottom: '14px', opacity: 0.4, color: 'var(--secondary)' }} />
            <p style={{ fontSize: '15px', fontWeight: '500' }}>No expenses found matching your criteria.</p>
          </div>
        )}
      </ExpenseList>

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="What did you spend on?"
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                  min="0"
                  step="0.01"
                />
              </FormGroup>
              <FormGroup>
                <label>Category</label>
                <select
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </FormGroup>
              <FormGroup>
                <label>Date</label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                </select>
              </FormGroup>
              <ButtonGroup>
                <button type="submit" className="primary">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </ExpensesContainer>
  );
};

export default Expenses;
