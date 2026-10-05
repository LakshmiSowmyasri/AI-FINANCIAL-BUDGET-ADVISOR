import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaPlus, FaTrash, FaEdit, FaUser, FaEnvelope, FaPhone, FaMoneyBillWave, FaHeart } from 'react-icons/fa';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

const FamilyContainer = styled.div`
  padding: 8px;
`;

const Header = styled.div`
  margin-bottom: 28px;
  
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  
  p {
    color: var(--text-muted);
    font-size: 14px;
  }
`;

const SummaryCard = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--shadow-sm);
  
  .icon {
    width: 56px;
    height: 56px;
    background: rgba(5, 150, 105, 0.12);
    border: 1px solid rgba(5, 150, 105, 0.2);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    font-size: 26px;
  }
  
  .content {
    flex: 1;
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    
    p {
      color: var(--text-muted);
      font-size: 14px;
    }
  }
  
  .stats {
    text-align: right;
    
    .value {
      font-size: 26px;
      font-weight: 700;
      color: var(--primary);
    }
    
    .label {
      font-size: 13px;
      color: var(--text-muted);
    }
  }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  color: var(--btn-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
  
  &:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
`;

const MembersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const MemberCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
  }
  
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    
    .avatar {
      width: 52px;
      height: 52px;
      background: rgba(13, 148, 136, 0.12);
      border: 1px solid rgba(13, 148, 136, 0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary);
      font-size: 22px;
    }
    
    .info {
      flex: 1;
      
      .name {
        font-size: 17px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 4px;
      }
      
      .relationship {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        background: rgba(13, 148, 136, 0.1);
        border: 1px solid rgba(13, 148, 136, 0.2);
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary);
      }
    }
    
    .actions {
      display: flex;
      gap: 8px;
      
      button {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
        
        &.edit {
          background: rgba(13, 148, 136, 0.1);
          color: var(--secondary);
          border-color: rgba(13, 148, 136, 0.2);
          
          &:hover {
            background: rgba(13, 148, 136, 0.2);
          }
        }
        
        &.delete {
          background: rgba(220, 38, 38, 0.1);
          color: var(--error);
          border-color: rgba(220, 38, 38, 0.2);
          
          &:hover {
            background: rgba(220, 38, 38, 0.2);
          }
        }
      }
    }
  }
  
  .details {
    .detail-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      
      &:last-child {
        border-bottom: none;
      }
      
      svg {
        color: var(--text-muted);
        font-size: 15px;
      }
      
      .label {
        font-size: 13px;
        color: var(--text-muted);
        width: 90px;
      }
      
      .value {
        flex: 1;
        font-size: 14px;
        color: var(--text-main);
        
        &.allowance {
          font-weight: 700;
          color: var(--primary);
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%;
  max-width: 460px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  
  h2 {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 24px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 18px;
  
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  
  input, select {
    width: 100%;
    padding: 11px 14px;
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 14px;
    box-sizing: border-box;
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  
  button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    
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
      border: 1px solid var(--border);
      color: var(--text-main);
      
      &:hover {
        border-color: var(--text-muted);
      }
    }
  }
`;

const Family = () => {
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    email: '',
    phone: '',
    monthlyAllowance: ''
  });

  const relationships = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, summaryRes] = await Promise.all([
        api.get('/family'),
        api.get('/family/budget-summary')
      ]);
      setMembers(membersRes.data.members);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load family data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.put(`/family/${editingMember.id}`, formData);
        toast.success('Family member updated');
      } else {
        await api.post('/family', formData);
        toast.success('Family member added');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save family member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this family member?')) return;
    try {
      await api.delete(`/family/${id}`);
      toast.success('Family member removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove family member');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loading-spinner"></div></div>;

  return (
    <FamilyContainer>
      <Header>
        <h1>Family Management</h1>
        <p>Manage family members and their monthly allowances</p>
      </Header>

      <SummaryCard>
        <div className="icon"><FaUsers /></div>
        <div className="content">
          <h3>Family Budget Overview</h3>
          <p>{summary.familyCount} family members • Total monthly allowances</p>
        </div>
        <div className="stats">
          <div className="value">₹{summary.totalFamilyAllowance?.toLocaleString() || '0'}</div>
          <div className="label">Monthly Allowances</div>
        </div>
      </SummaryCard>

      <AddButton onClick={() => { setEditingMember(null); setFormData({ name: '', relationship: '', email: '', phone: '', monthlyAllowance: '' }); setShowModal(true); }}>
        <FaPlus /> Add Family Member
      </AddButton>

      <MembersGrid>
        {members.map((member, index) => (
          <MemberCard
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="header">
              <div className="avatar"><FaUser /></div>
              <div className="info">
                <div className="name">{member.name}</div>
                <div className="relationship"><FaHeart size={10} /> {member.relationship}</div>
              </div>
              <div className="actions">
                <button className="edit" onClick={() => { setEditingMember(member); setFormData(member); setShowModal(true); }}>
                  <FaEdit />
                </button>
                <button className="delete" onClick={() => handleDelete(member.id)}>
                  <FaTrash />
                </button>
              </div>
            </div>
            <div className="details">
              {member.email && (
                <div className="detail-item">
                  <FaEnvelope />
                  <span className="label">Email</span>
                  <span className="value">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="detail-item">
                  <FaPhone />
                  <span className="label">Phone</span>
                  <span className="value">{member.phone}</span>
                </div>
              )}
              <div className="detail-item">
                <FaMoneyBillWave />
                <span className="label">Allowance</span>
                <span className="value allowance">₹{member.monthly_allowance?.toLocaleString()}/month</span>
              </div>
            </div>
          </MemberCard>
        ))}
      </MembersGrid>

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <FaUsers size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No family members added yet. Add your family to manage allowances!</p>
        </div>
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</h2>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Full name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={e => setFormData({...formData, relationship: e.target.value})}
                  required
                >
                  <option value="">Select relationship</option>
                  {relationships.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormGroup>
              <FormGroup>
                <label>Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </FormGroup>
              <FormGroup>
                <label>Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </FormGroup>
              <FormGroup>
                <label>Monthly Allowance (₹)</label>
                <input
                  type="number"
                  value={formData.monthlyAllowance}
                  onChange={e => setFormData({...formData, monthlyAllowance: e.target.value})}
                  placeholder="0.00"
                  min="0"
                />
              </FormGroup>
              <ButtonGroup>
                <button type="submit" className="primary">
                  {editingMember ? 'Update' : 'Add'} Member
                </button>
                <button type="button" className="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </FamilyContainer>
  );
};

export default Family;
