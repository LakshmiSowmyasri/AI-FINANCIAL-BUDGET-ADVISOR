import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaPhone, FaMoneyBillWave, FaSave, FaLock } from 'react-icons/fa';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const ProfileContainer = styled.div`
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

const ProfileCard = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 32px;
  border: 1px solid var(--border);
  max-width: 600px;
  box-shadow: var(--shadow-sm);
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  
  .avatar {
    width: 76px;
    height: 76px;
    background: rgba(5, 150, 105, 0.12);
    border: 2px solid var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    font-size: 32px;
    font-weight: 700;
  }
  
  .info {
    .name {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    
    .email {
      color: var(--text-muted);
      font-size: 14px;
    }
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  
  .input-wrapper {
    position: relative;
    
    .icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 16px;
    }
    
    input {
      width: 100%;
      padding: 12px 16px 12px 44px;
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
      
      &:disabled {
        background: var(--bg-canvas);
        color: var(--text-muted);
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      &::placeholder {
        color: var(--text-muted);
        opacity: 0.6;
      }
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 10px;
`;

const SaveButton = styled.button`
  flex: 1;
  padding: 12px 24px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  color: var(--btn-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  
  &:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const InfoBox = styled.div`
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.25);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    color: var(--secondary);
    font-size: 18px;
    margin-top: 2px;
    flex-shrink: 0;
  }
  
  .content {
    flex: 1;
    
    h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    
    p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
  }
`;

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    monthlyIncome: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        monthlyIncome: user.monthlyIncome || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    await updateProfile({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      monthlyIncome: parseFloat(formData.monthlyIncome) || 0
    });
    
    setSaving(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <ProfileContainer>
      <Header>
        <h1>Profile Settings</h1>
        <p>Manage your account information and preferences</p>
      </Header>

      <ProfileCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AvatarSection>
          <div className="avatar">{formData.name?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="info">
            <div className="name">{formData.name || 'User'}</div>
            <div className="email">{formData.email}</div>
          </div>
        </AvatarSection>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <label>Full Name</label>
            <div className="input-wrapper">
              <FaUser className="icon" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
          </FormGroup>

          <FormGroup>
            <label>Email Address</label>
            <div className="input-wrapper">
              <FaEnvelope className="icon" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>
          </FormGroup>

          <FormGroup>
            <label>Phone Number</label>
            <div className="input-wrapper">
              <FaPhone className="icon" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
              />
            </div>
          </FormGroup>

          <FormGroup>
            <label>Monthly Income (₹)</label>
            <div className="input-wrapper">
              <FaMoneyBillWave className="icon" />
              <input
                type="number"
                name="monthlyIncome"
                value={formData.monthlyIncome}
                onChange={handleChange}
                placeholder="Your monthly income"
                min="0"
                step="0.01"
              />
            </div>
          </FormGroup>

          <ButtonGroup>
            <SaveButton type="submit" disabled={saving}>
              <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
            </SaveButton>
          </ButtonGroup>
        </Form>

        <InfoBox>
          <FaLock />
          <div className="content">
            <h4>Account Security</h4>
            <p>Your financial data is securely stored and encrypted. We never share your information with third parties.</p>
          </div>
        </InfoBox>
      </ProfileCard>
    </ProfileContainer>
  );
};

export default Profile;
