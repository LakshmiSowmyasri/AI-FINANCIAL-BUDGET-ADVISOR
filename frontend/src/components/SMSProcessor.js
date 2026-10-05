import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSms, FaUpload, FaSync, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  h3 {
    color: var(--text-primary);
    font-size: 20px;
  }

  svg {
    color: var(--primary);
    font-size: 24px;
  }
`;

const Description = styled.p`
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.6;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const Button = styled(motion.button)`
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: var(--text-on-accent);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border);
`;

const ResultsContainer = styled(motion.div)`
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
`;

const ResultItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--card-bg);
  border-radius: 8px;
  border-left: 4px solid ${props => props.status === 'success' ? '#22c55e' : props.status === 'error' ? '#ef4444' : '#f59e0b'};

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .content {
    flex: 1;
  }

  .amount {
    font-weight: 600;
    color: ${props => props.type === 'credit' ? '#22c55e' : '#ef4444'};
  }

  .merchant {
    color: var(--text-secondary);
    font-size: 13px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border);

  .number {
    font-size: 24px;
    font-weight: 700;
    color: ${props => props.color || 'var(--primary)'};
  }

  .label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
`;

const InfoBox = styled.div`
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  svg {
    color: var(--primary);
    margin-top: 2px;
    flex-shrink: 0;
  }

  p {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }
`;

const sampleMessages = `Your account XX1234 has been debited with Rs. 2,500.00 on 2024-01-15 at SWIGGY. Avl Bal: Rs. 45,230.50.

An amount of Rs. 45,000.00 has been CREDITED to your account XX5678 on 2024-01-14 via NEFT from EMPLOYER PVT LTD. Avl Bal: Rs. 1,23,450.00.

Thank you for using your card ending 9012 at AMAZON for Rs. 3,499.00 on 2024-01-13. Total outstanding: Rs. 15,230.00.

UPI transaction successful! Rs. 500 sent to ZOMATO on 2024-01-12. Ref: 123456789012.`;

const SMSProcessor = () => {
  const [messages, setMessages] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleProcess = async () => {
    if (!messages.trim()) {
      toast.error('Please enter SMS messages');
      return;
    }

    setLoading(true);
    try {
      // Split messages by double newline or single newline
      const messageList = messages
        .split(/\n\n+/)
        .map(m => m.trim())
        .filter(m => m.length > 0);

      if (messageList.length === 0) {
        toast.error('No valid messages found');
        setLoading(false);
        return;
      }

      const response = await api.post('/sms/process', {
        messages: messageList
      });

      setResults(response.data.results);
      
      if (response.data.results.processed.length > 0) {
        toast.success(`Processed ${response.data.results.processed.length} transactions!`);
      }
      
      if (response.data.results.failed.length > 0) {
        toast.error(`Failed to process ${response.data.results.failed.length} messages`);
      }
    } catch (error) {
      console.error('SMS processing error:', error);
      toast.error(error.response?.data?.message || 'Failed to process SMS messages');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setMessages(sampleMessages);
    toast.success('Sample SMS messages loaded!');
  };

  const clearResults = () => {
    setResults(null);
    setMessages('');
  };

  return (
    <Container>
      <Header>
        <FaSms />
        <h3>SMS Transaction Import</h3>
      </Header>

      <Description>
        Paste your bank SMS messages here to automatically import transactions. 
        The system will detect debits, credits, amounts, and merchants from your SMS.
      </Description>

      <InfoBox>
        <FaExclamationTriangle />
        <p>
          <strong>Supported formats:</strong> Bank debit/credit alerts, UPI notifications, 
          card transaction SMS. Messages should include amount, date, and merchant details.
        </p>
      </InfoBox>

      <TextArea
        placeholder="Paste your bank SMS messages here...

Example:
Your account XX1234 has been debited with Rs. 2,500.00 on 2024-01-15 at SWIGGY."
        value={messages}
        onChange={(e) => setMessages(e.target.value)}
      />

      <ButtonGroup>
        <PrimaryButton
          onClick={handleProcess}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaSync />
          {loading ? 'Processing...' : 'Process Messages'}
        </PrimaryButton>

        <SecondaryButton
          onClick={loadSampleData}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaUpload />
          Load Sample
        </SecondaryButton>

        {results && (
          <SecondaryButton
            onClick={clearResults}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaTimesCircle />
            Clear
          </SecondaryButton>
        )}
      </ButtonGroup>

      {results && (
        <ResultsContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
            Processing Results
          </h4>

          <StatsGrid>
            <StatCard color="#22c55e">
              <div className="number">{results.processed.length}</div>
              <div className="label">Processed</div>
            </StatCard>
            <StatCard color="#ef4444">
              <div className="number">{results.failed.length}</div>
              <div className="label">Failed</div>
            </StatCard>
            <StatCard color="#f59e0b">
              <div className="number">{results.skipped.length}</div>
              <div className="label">Skipped</div>
            </StatCard>
          </StatsGrid>

          {results.processed.length > 0 && (
            <>
              <h5 style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Successfully Processed
              </h5>
              {results.processed.map((item, index) => (
                <ResultItem key={index} status="success" type={item.type}>
                  <FaCheckCircle color="#22c55e" />
                  <div className="content">
                    <span className="amount">
                      {item.type === 'credit' ? '+' : '-'}₹{item.amount.toLocaleString()}
                    </span>
                    <div className="merchant">{item.merchant}</div>
                  </div>
                </ResultItem>
              ))}
            </>
          )}

          {results.failed.length > 0 && (
            <>
              <h5 style={{ margin: '16px 0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Failed to Process
              </h5>
              {results.failed.slice(0, 3).map((item, index) => (
                <ResultItem key={index} status="error">
                  <FaTimesCircle color="#ef4444" />
                  <div className="content">
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {item.sms.substring(0, 50)}...
                    </div>
                    <div className="merchant">{item.error}</div>
                  </div>
                </ResultItem>
              ))}
              {results.failed.length > 3 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  +{results.failed.length - 3} more failed
                </div>
              )}
            </>
          )}
        </ResultsContainer>
      )}
    </Container>
  );
};

export default SMSProcessor;
