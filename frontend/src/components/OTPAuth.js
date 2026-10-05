import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaMobile, FaArrowLeft } from 'react-icons/fa';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  text-align: center;
  color: var(--text-main);
  margin-bottom: 24px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const TypeSelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`;

const TypeButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid ${props => props.active ? 'var(--primary)' : 'var(--border)'};
  border-radius: var(--radius-md);
  background: ${props => props.active ? 'rgba(5, 150, 105, 0.1)' : 'var(--bg-canvas)'};
  color: ${props => props.active ? 'var(--primary)' : 'var(--text-muted)'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 600;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Icon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 16px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px 12px 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-canvas);
  color: var(--text-main);
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s ease;

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

const Button = styled(motion.button)`
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.2s;

  &:hover {
    color: var(--text-main);
  }
`;

const OTPInput = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 24px 0;
`;

const OTPDigit = styled.input`
  width: 46px;
  height: 54px;
  text-align: center;
  font-size: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-canvas);
  color: var(--text-main);
  font-weight: 700;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    background: rgba(5, 150, 105, 0.04);
  }
`;

const Timer = styled.p`
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
`;

const ResendLink = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
  margin-left: 5px;

  &:disabled {
    color: var(--text-muted);
    cursor: not-allowed;
    text-decoration: none;
  }
`;

const OTPAuth = ({ onBack, onSuccess, purpose = 'login' }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  React.useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!identifier) {
      toast.error(`Please enter your ${type}`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/otp/send', {
        identifier,
        type,
        purpose
      });

      if (response.data) {
        toast.success('OTP sent successfully!');
        setStep(2);
        setTimer(60);
        setCanResend(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter complete OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/otp/verify', {
        identifier,
        otp: otpCode,
        type,
        purpose
      });

      if (response.data) {
        toast.success('Verified successfully!');
        onSuccess(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/otp/send', {
        identifier,
        type,
        purpose
      });
      toast.success('OTP resent!');
      setTimer(60);
      setCanResend(false);
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  return (
    <Container>
      <BackButton onClick={onBack}>
        <FaArrowLeft /> Back to password login
      </BackButton>

      <Title>{purpose === 'login' ? 'Login with OTP' : 'Register with OTP'}</Title>

      {step === 1 ? (
        <>
          <TypeSelector>
            <TypeButton
              active={type === 'email'}
              onClick={() => setType('email')}
            >
              <FaEnvelope /> Email
            </TypeButton>
            <TypeButton
              active={type === 'phone'}
              onClick={() => setType('phone')}
            >
              <FaMobile /> Phone
            </TypeButton>
          </TypeSelector>

          <Form onSubmit={handleSendOTP}>
            <InputGroup>
              <Icon>
                {type === 'email' ? <FaEnvelope /> : <FaMobile />}
              </Icon>
              <Input
                type={type === 'email' ? 'email' : 'tel'}
                placeholder={type === 'email' ? 'Enter your email' : 'Enter your phone number'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </InputGroup>

            <Button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>
          </Form>
        </>
      ) : (
        <>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Enter the 6-digit code sent to {identifier}
          </p>

          <OTPInput>
            {otp.map((digit, index) => (
              <OTPDigit
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
              />
            ))}
          </OTPInput>

          <Button
            onClick={handleVerifyOTP}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>

          <Timer>
            {canResend ? (
              <>Didn't receive code? <ResendLink onClick={handleResendOTP}>Resend</ResendLink></>
            ) : (
              `Resend in ${timer}s`
            )}
          </Timer>
        </>
      )}
    </Container>
  );
};

export default OTPAuth;
