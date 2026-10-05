import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaPaperPlane, FaRobot, FaTrash, FaChartLine, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import api from '../services/api';
import toast from 'react-hot-toast';

const pulse = keyframes`
  0%, 60%, 100% { transform: scale(1); opacity: 1; }
  30% { transform: scale(1.3); opacity: 0.6; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: var(--bg-surface);
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  .avatar {
    width: 42px;
    height: 42px;
    background: var(--gradient-ai);
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
  }
  
  .info h3 {
    color: var(--text-main);
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .info .status {
    color: var(--primary);
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
    
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      background: var(--primary);
      border-radius: 50%;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button`
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-canvas);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  
  &:hover {
    background: var(--error-subtle);
    border-color: rgba(220, 38, 38, 0.3);
    color: var(--error);
  }
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
`;

const MessageWrapper = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-direction: ${p => p.isUser ? 'row-reverse' : 'row'};
  animation: ${fadeIn} 0.25s ease;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${p => p.isUser ? 'var(--gradient-emerald)' : 'var(--gradient-ai)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: #ffffff;
`;

const Bubble = styled.div`
  max-width: 78%;
  padding: 13px 17px;
  border-radius: ${p => p.isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px'};
  background: ${p => p.isUser
    ? 'var(--btn-primary-bg)'
    : 'var(--bg-canvas)'};
  border: 1px solid ${p => p.isUser ? 'transparent' : 'var(--border)'};
  box-shadow: var(--shadow-sm);
  color: ${p => p.isUser ? 'var(--btn-primary-text)' : 'var(--text-main)'};
  font-size: 14px;
  line-height: 1.6;
  
  pre, code {
    background: rgba(16, 24, 21, 0.1);
    border-radius: 5px;
    padding: 2px 6px;
    font-size: 12px;
    font-family: monospace;
    color: var(--text-main);
  }
  
  strong { color: ${p => p.isUser ? 'inherit' : 'var(--ai-accent)'}; font-weight: 700; }
  em { color: var(--secondary); }
  
  ul, ol {
    padding-left: 18px;
    margin: 8px 0;
    li { margin-bottom: 4px; }
  }
  
  h2, h3 { color: ${p => p.isUser ? 'inherit' : 'var(--ai-accent)'}; margin: 10px 0 4px; font-size: 14px; }
`;

const MessageTime = styled.span`
  font-size: 10px;
  color: ${p => p.isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};
  margin-top: 4px;
  display: block;
  text-align: ${p => p.isUser ? 'right' : 'left'};
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: fit-content;
  
  span {
    width: 6px;
    height: 6px;
    background: var(--ai-accent);
    border-radius: 50%;
    animation: ${pulse} 1.2s infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const QuickPrompts = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid var(--border);
`;

const PromptChip = styled.button`
  padding: 6px 12px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:hover {
    background: var(--ai-bg);
    border-color: var(--ai-border);
    color: var(--ai-accent);
    transform: translateY(-1px);
  }
`;

const InputArea = styled.div`
  padding: 10px 0 16px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const InputWrapper = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
`;

const TextInput = styled.textarea`
  width: 100%;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-main);
  padding: 11px 38px 11px 14px;
  font-size: 14px;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  line-height: 1.4;
  
  &:focus {
    border-color: var(--ai-accent);
    box-shadow: 0 0 0 2px var(--ai-border);
  }
  &::placeholder { color: var(--text-muted); }
`;

const ClearInputBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 12px;
  background: var(--border-subtle);
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.15s ease;
  
  &:hover {
    color: var(--text-main);
    background: var(--border);
  }
`;

const ModalOverlay = styled.div`
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

const ConfirmModal = styled.div`
  background: var(--bg-surface);
  border-radius: 18px;
  padding: 26px;
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);

  .modal-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: rgba(220, 38, 38, 0.1);
    color: var(--error);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 8px;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 22px;
  }

  .btn-row {
    display: flex;
    gap: 10px;
    justify-content: flex-end;

    button {
      padding: 10px 18px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cancel-btn {
      background: var(--bg-canvas);
      border: 1px solid var(--border);
      color: var(--text-main);
      &:hover {
        background: var(--border-subtle);
      }
    }

    .danger-btn {
      background: var(--error);
      border: none;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
`;

const SendBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: ${p => p.disabled ? 'var(--bg-canvas)' : 'var(--btn-primary-bg)'};
  border: 1px solid ${p => p.disabled ? 'var(--border)' : 'transparent'};
  color: ${p => p.disabled ? 'var(--text-muted)' : 'var(--btn-primary-text)'};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  
  &:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  
  .icon {
    width: 64px;
    height: 64px;
    background: var(--ai-bg);
    border: 1px solid var(--ai-border);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--ai-accent);
    margin-bottom: 18px;
  }
  
  h3 { color: var(--text-main); font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  p { color: var(--text-muted); font-size: 13px; line-height: 1.5; max-width: 360px; }
`;

const AiBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ai-accent);
  background: var(--ai-bg);
  border: 1px solid var(--ai-border);
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 6px;
  letter-spacing: 0.03em;
`;

const QUICK_PROMPTS = [
  { label: '💻 Afford ₹50K Laptop?', message: 'Can I afford a ₹50,000 laptop?' },
  { label: '💡 Save More Money', message: 'How can I save more money?' },
  { label: '📈 Expense Spikes', message: 'Why are my expenses increasing?' },
  { label: '💰 Monthly Savings Goal', message: 'How much should I save every month?' },
  { label: '📊 Financial Analysis', message: 'Generate my complete financial health analysis with actionable recommendations.' },
  { label: '📈 Best SIP Plans', message: 'What are the best SIP plans for me based on my income and risk profile?' },
  { label: '🏛️ Tax Saving (80C)', message: 'How can I maximize my tax savings under Section 80C, 80D, and other sections?' },
];

function formatMessage(text) {
  // Convert markdown-style formatting to styled text
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/#{1,3} (.*)/g, '<h3>$1</h3>')
    .replace(/\n/g, '<br/>');
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await api.get('/chat/history');
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to load chat history');
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  const sendMessage = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', message: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/chat/message', {
        message: text,
        conversationHistory: messages.slice(-10)
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        message: data.response,
        messageType: data.messageType,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    setIsLoading(true);
    const userMsg = { role: 'user', message: '📊 Generate my financial health analysis', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await api.post('/chat/analyze', {});
      setMessages(prev => [...prev, {
        role: 'assistant',
        message: data.response,
        messageType: 'analysis',
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      toast.error('Analysis failed. Please try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearClick = () => {
    if (messages.length === 0) {
      toast('Chat history is already empty', { icon: 'ℹ️' });
      return;
    }
    setShowClearModal(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await api.delete('/chat/history');
      setMessages([]);
      setShowClearModal(false);
      toast.success('Chat history cleared');
    } catch (err) {
      console.error('Failed to clear chat history on server:', err);
      // Fallback: clear local view
      setMessages([]);
      setShowClearModal(false);
      toast.success('Chat history cleared');
    } finally {
      setIsClearing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <div className="avatar"><FaRobot /></div>
          <div className="info">
            <h3>AI Financial Advisor</h3>
            <span className="status">Powered by Claude AI</span>
          </div>
        </HeaderLeft>
        <HeaderActions>
          <ActionBtn onClick={triggerAnalysis}>
            <FaChartLine /> Analyze
          </ActionBtn>
          <ActionBtn onClick={handleClearClick} title="Clear Chat History">
            <FaTrash /> Clear
          </ActionBtn>
        </HeaderActions>
      </Header>

      {/* Messages */}
      <MessagesArea>
        {isHistoryLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading conversation...</div>
        ) : messages.length === 0 ? (
          <EmptyState>
            <div className="icon"><HiSparkles /></div>
            <h3>Your AI Financial Advisor</h3>
            <p>Ask me anything about budgeting, investing, tax planning, SIPs, or your personal finances. I analyze your data to give personalized advice.</p>
          </EmptyState>
        ) : (
          messages.map((msg, i) => (
            <MessageWrapper key={i} isUser={msg.role === 'user'}>
              <Avatar isUser={msg.role === 'user'}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </Avatar>
              <div>
                {msg.role !== 'user' && (
                  <AiBadge>
                    <HiSparkles size={11} /> AI Financial Recommendation
                  </AiBadge>
                )}
                <Bubble
                  isUser={msg.role === 'user'}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }}
                />
                <MessageTime isUser={msg.role === 'user'}>
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </MessageTime>
              </div>
            </MessageWrapper>
          ))
        )}

        {isLoading && (
          <MessageWrapper isUser={false}>
            <Avatar isUser={false}>🤖</Avatar>
            <Bubble isUser={false}>
              <TypingIndicator><span /><span /><span /></TypingIndicator>
            </Bubble>
          </MessageWrapper>
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      {/* Quick Prompts */}
      <QuickPrompts>
        {QUICK_PROMPTS.map(({ label, message }) => (
          <PromptChip key={label} onClick={() => sendMessage(message)} disabled={isLoading}>
            {label}
          </PromptChip>
        ))}
      </QuickPrompts>

      {/* Input */}
      <InputArea>
        <InputWrapper>
          <TextInput
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about investing, budgeting, tax saving... (Enter to send)"
            rows={1}
          />
          {input.length > 0 && (
            <ClearInputBtn
              type="button"
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              title="Clear text"
            >
              <FaTimes />
            </ClearInputBtn>
          )}
        </InputWrapper>
        <SendBtn onClick={() => sendMessage()} disabled={!input.trim() || isLoading}>
          <FaPaperPlane />
        </SendBtn>
      </InputArea>

      {/* Confirmation Modal */}
      {showClearModal && (
        <ModalOverlay onClick={() => !isClearing && setShowClearModal(false)}>
          <ConfirmModal onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              <FaExclamationTriangle />
            </div>
            <h3>Clear Chat History?</h3>
            <p>
              This will permanently delete all your conversation messages and AI financial analyses. This action cannot be undone.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmClear}
                disabled={isClearing}
              >
                <FaTrash size={12} /> {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </ConfirmModal>
        </ModalOverlay>
      )}
    </Container>
  );
}
