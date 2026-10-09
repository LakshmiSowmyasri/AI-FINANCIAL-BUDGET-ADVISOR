import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-canvas);
  padding: 24px 20px;
`;

const Card = styled(motion.div)`
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
    width: 58px; height: 58px;
    background: rgba(13, 148, 136, 0.12);
    border: 1px solid rgba(13, 148, 136, 0.25);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    font-size: 26px; color: var(--secondary);
  }
  h1 { font-size: 24px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; letter-spacing: -0.02em; }
  p { color: var(--text-muted); font-size: 14px; }
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
`;

const StepDot = styled.div`
  width: 32px; height: 5px;
  border-radius: 3px;
  background: ${p => p.active ? 'var(--primary)' : p.done ? 'var(--primary)' : 'var(--border)'};
  opacity: ${p => p.active || p.done ? '1' : '0.5'};
  transition: all 0.3s;
`;

const FormGroup = styled.div`
  margin-bottom: 18px;
  label { display: block; color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 6px; }
`;

const InputWrapper = styled.div`
  position: relative;
  .icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: var(--text-muted); font-size: 16px;
  }
`;

const Input = styled.input`
  width: 100%; padding: 12px 14px 12px 44px;
  background: var(--bg-canvas); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-main); font-size: 14px; outline: none;
  box-sizing: border-box; transition: all 0.2s;
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
  }
  &::placeholder { color: var(--text-muted); opacity: 0.6; }
`;

const OTPGrid = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 8px 0;
`;

const DevelopmentOtpNotice = styled.div`
  margin: 0 0 18px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-canvas);
  color: var(--text-muted);
  text-align: center;
  font-size: 13px;

  strong {
    display: block;
    margin-top: 6px;
    color: var(--text-main);
    font-size: 22px;
    letter-spacing: 0.2em;
  }
`;

const OTPBox = styled.input`
  width: 48px; height: 56px;
  background: var(--bg-canvas); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-main);
  font-size: 22px; font-weight: 700;
  text-align: center; outline: none; transition: all 0.2s;
  &:focus {
    border-color: var(--primary);
    background: rgba(5, 150, 105, 0.05);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
  }
`;

const Button = styled.button`
  width: 100%; padding: 12px 24px;
  background: ${p => p.disabled ? 'var(--border)' : 'var(--btn-primary-bg)'};
  border: none; border-radius: var(--radius-md);
  color: ${p => p.disabled ? 'var(--text-muted)' : 'var(--btn-primary-text)'};
  font-size: 15px; font-weight: 600;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s; margin-top: 8px;
  box-shadow: var(--shadow-sm);
  &:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
`;

const BackLink = styled.button`
  background: none; border: none;
  color: var(--text-muted); font-size: 14px;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  padding: 0; margin-bottom: 20px;
  &:hover { color: var(--text-main); }
`;

const ResendRow = styled.div`
  text-align: center; margin-top: 16px; font-size: 14px; color: var(--text-muted);
  button {
    background: none; border: none; color: var(--primary); cursor: pointer; font-size: 14px; font-weight: 500;
    &:hover:not(:disabled) { text-decoration: underline; }
    &:disabled { color: var(--text-muted); opacity: 0.5; cursor: not-allowed; }
  }
`;

const SuccessBox = styled.div`
  text-align: center; padding: 16px 0;
  .check { font-size: 52px; color: var(--primary); margin-bottom: 16px; }
  h3 { color: var(--primary); font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  p { color: var(--text-muted); font-size: 14px; line-height: 1.6; }
`;

const PasswordStrength = styled.div`
  margin-top: 8px;
  .bar { height: 4px; border-radius: 2px; background: var(--border); overflow: hidden; margin-bottom: 4px; }
  .fill {
    height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s;
    background: ${p => p.strength < 2 ? 'var(--error)' : p.strength < 3 ? 'var(--warning)' : 'var(--primary)'};
    width: ${p => (p.strength / 4) * 100}%;
  }
  .label {
    font-size: 12px; font-weight: 500;
    color: ${p => p.strength < 2 ? 'var(--error)' : p.strength < 3 ? 'var(--warning)' : 'var(--primary)'};
  }
`;

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=newpassword, 4=done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Resend countdown
  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data } = await axios.post(`${API}/auth/forgot-password`, { email: normalizedEmail });
      setEmail(normalizedEmail);
      setDevelopmentOtp(data.developmentOtp || '');
      toast.success(data.developmentOtp ? 'Development OTP is shown below.' : 'OTP sent to your email!');
      setStep(2);
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handling
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return toast.error('Enter the complete 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/verify-reset-otp`, { email, otp: code });
      setResetToken(data.resetToken);
      toast.success('OTP verified!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/forgot-password`, { email });
      setDevelopmentOtp(data.developmentOtp || '');
      toast.success(data.developmentOtp ? 'New development OTP is shown below.' : 'New OTP sent!');
      setOtp(['', '', '', '', '', '']);
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    }
    finally { setLoading(false); }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { resetToken, newPassword });
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Container>
      <Card initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {step < 4 && (
          <BackLink onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)}>
            <FaArrowLeft /> {step === 1 ? 'Back to Login' : 'Back'}
          </BackLink>
        )}

        <Logo>
          <div className="icon">
            {step === 4 ? <FaCheckCircle /> : <FaShieldAlt />}
          </div>
          <h1>
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'New Password'}
            {step === 4 && 'Password Reset!'}
          </h1>
          <p>
            {step === 1 && 'Enter your email to receive a reset OTP'}
            {step === 2 && (developmentOtp ? 'Enter the development code shown below' : `We sent a 6-digit code to ${email}`)}
            {step === 3 && 'Create a strong new password'}
            {step === 4 && 'Your password has been updated successfully'}
          </p>
        </Logo>

        <StepIndicator>
          {[1, 2, 3].map(s => (
            <StepDot key={s} active={step === s} done={step > s} />
          ))}
        </StepIndicator>

        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === 1 && (
            <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendOTP}>
              <FormGroup>
                <label>Email Address</label>
                <InputWrapper>
                  <FaEnvelope className="icon" />
                  <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </InputWrapper>
              </FormGroup>
              <Button type="submit" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP'}</Button>
            </motion.form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyOTP}>
              {developmentOtp && (
                <DevelopmentOtpNotice>
                  Local development only — this code was not emailed.
                  <strong>{developmentOtp}</strong>
                </DevelopmentOtpNotice>
              )}
              <FormGroup>
                <label>Enter 6-Digit OTP</label>
                <OTPGrid onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <OTPBox
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text" inputMode="numeric"
                      maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </OTPGrid>
              </FormGroup>
              <Button type="submit" disabled={loading || otp.join('').length < 6}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <ResendRow>
                Didn't receive it?{' '}
                <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </ResendRow>
            </motion.form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <motion.form key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleResetPassword}>
              <FormGroup>
                <label>New Password</label>
                <InputWrapper>
                  <FaLock className="icon" />
                  <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoFocus />
                </InputWrapper>
                {newPassword && (
                  <PasswordStrength strength={strength}>
                    <div className="bar"><div className="fill" /></div>
                    <span className="label">{['', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</span>
                  </PasswordStrength>
                )}
              </FormGroup>
              <FormGroup>
                <label>Confirm Password</label>
                <InputWrapper>
                  <FaLock className="icon" />
                  <Input
                    type="password" placeholder="Re-enter password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : undefined }}
                  />
                </InputWrapper>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>Passwords do not match</p>
                )}
              </FormGroup>
              <Button type="submit" disabled={loading || newPassword !== confirmPassword}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </motion.form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <SuccessBox>
                <div className="check">✅</div>
                <h3>Password Reset Successful!</h3>
                <p>Your password has been updated. You can now log in with your new password.</p>
              </SuccessBox>
              <Button onClick={() => navigate('/login')} style={{ marginTop: '16px' }}>
                Go to Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 4 && (
          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          </p>
        )}
      </Card>
    </Container>
  );
}
