import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaRupeeSign, FaCommentDots } from 'react-icons/fa';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import OTPAuth from '../components/OTPAuth';

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
`;

const Tab = styled.button`
  flex: 1;
  padding: 11px 16px;
  border: 1px solid ${props => props.active ? 'var(--primary)' : 'var(--border)'};
  border-radius: var(--radius-md);
  background: ${props => props.active ? 'rgba(5, 150, 105, 0.1)' : 'var(--bg-canvas)'};
  color: ${props => props.active ? 'var(--primary)' : 'var(--text-muted)'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-canvas);
  padding: 24px 20px;
`;

const LoginCard = styled(motion.div)`
  width: 100%;
  max-width: 440px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 36px 32px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 28px;
  
  .icon {
    width: 58px;
    height: 58px;
    background: rgba(5, 150, 105, 0.12);
    border: 1px solid rgba(5, 150, 105, 0.25);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    font-size: 26px;
    color: var(--primary);
  }
  
  h1 {
    font-size: 24px;
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const InputGroup = styled.div`
  position: relative;
  
  .icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 16px;
  }
  
  .toggle-password {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    transition: color 0.2s;
    
    &:hover {
      color: var(--text-main);
    }
  }
`;

const Input = styled.input`
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
  
  &::placeholder {
    color: var(--text-muted);
    opacity: 0.6;
  }
`;

const PasswordInput = styled(Input)`
  padding-right: 44px;
`;

const LoginButton = styled.button`
  padding: 12px 24px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: var(--radius-md);
  color: var(--btn-primary-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
  
  &:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 0;
  color: var(--text-muted);
  font-size: 13px;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
`;

const RegisterLink = styled.div`
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  
  a {
    color: var(--primary);
    font-weight: 600;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: var(--radius-sm);
  color: var(--error);
  font-size: 13px;
  margin-bottom: 12px;
`;

const ForgotPasswordLink = styled.div`
  text-align: right;
  margin-top: -6px;
  margin-bottom: 4px;
  font-size: 13px;
  
  a {
    color: var(--secondary);
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState('password');
  
  const { login, user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(formData.email, null, formData.password);
    
    if (!success) {
      setError('Invalid email or password');
    }
    
    setLoading(false);
  };

  return (
    <LoginContainer>
      <LoginCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Logo>
          <div className="icon"><FaRupeeSign /></div>
          <h1>Welcome Back</h1>
          <p>Sign in to manage your finances</p>
        </Logo>

        <TabContainer>
          <Tab 
            active={authMethod === 'password'} 
            onClick={() => setAuthMethod('password')}
          >
            <FaLock /> Password
          </Tab>
          <Tab 
            active={authMethod === 'otp'} 
            onClick={() => setAuthMethod('otp')}
          >
            <FaCommentDots /> OTP
          </Tab>
        </TabContainer>

        <AnimatePresence mode="wait">
          {authMethod === 'password' ? (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {error && <ErrorMessage>{error}</ErrorMessage>}

              <Form onSubmit={handleSubmit}>
                <InputGroup>
                  <FaEnvelope className="icon" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </InputGroup>

                <InputGroup>
                  <FaLock className="icon" />
                  <PasswordInput
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </InputGroup>

                <ForgotPasswordLink>
                  <Link to="/forgot-password">Forgot Password?</Link>
                </ForgotPasswordLink>

                <LoginButton type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </LoginButton>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <OTPAuth 
                purpose="login"
                onBack={() => setAuthMethod('password')}
                onSuccess={(data) => {
                  // Store token and redirect
                  localStorage.setItem('token', data.token);
                  window.location.href = '/dashboard';
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Divider>or</Divider>

        <RegisterLink>
          Don't have an account? <Link to="/register">Create Account</Link>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
