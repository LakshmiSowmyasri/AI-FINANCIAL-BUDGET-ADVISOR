import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaRobot, FaTrash, FaChartLine, FaLightbulb, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const pulse = keyframes`
  0%, 60%, 100% { transform: scale(1); opacity: 1; }
  30% { transform: scale(1.4); opacity: 0.6; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  background: #0f172a;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  .avatar {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
  }
  
  .info h3 {
    color: #f8fafc;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }
  
  .info .status {
    color: #10b981;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button`
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.08);
  color: #93c5fd;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
  }
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
  scrollbar-color: #334155 transparent;
  
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
`;

const MessageWrapper = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-direction: ${p => p.isUser ? 'row-reverse' : 'row'};
  animation: ${fadeIn} 0.3s ease;
`;

const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${p => p.isUser ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: white;
`;

const Bubble = styled.div`
  max-width: 75%;
  padding: 14px 18px;
  border-radius: ${p => p.isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px'};
  background: ${p => p.isUser
    ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
    : 'rgba(30, 41, 59, 0.9)'};
  border: 1px solid ${p => p.isUser ? 'transparent' : 'rgba(71, 85, 105, 0.4)'};
  color: ${p => p.isUser ? '#ffffff' : '#e2e8f0'};
  font-size: 14px;
  line-height: 1.7;
  
  pre, code {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 13px;
    font-family: monospace;
  }
  
  strong { color: #93c5fd; }
  em { color: #a78bfa; }
  
  ul, ol {
    padding-left: 20px;
    margin: 8px 0;
    li { margin-bottom: 4px; }
  }
  
  h2, h3 { color: #93c5fd; margin: 12px 0 6px; font-size: 15px; }
`;

const MessageTime = styled.span`
  font-size: 11px;
  color: #475569;
  margin-top: 4px;
  display: block;
  text-align: ${p => p.isUser ? 'right' : 'left'};
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
  
  span {
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: ${pulse} 1.4s infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const QuickPrompts = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid rgba(71, 85, 105, 0.3);
`;

const PromptChip = styled.button`
  padding: 8px 14px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 20px;
  color: #93c5fd;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background: rgba(59, 130, 246, 0.12);
    border-color: #3b82f6;
    transform: translateY(-1px);
  }
`;

const InputArea = styled.div`
  padding: 12px 0 16px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const TextInput = styled.textarea`
  flex: 1;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 16px;
  color: #f1f5f9;
  padding: 12px 16px;
  font-size: 14px;
  resize: none;
  min-height: 48px;
  max-height: 120px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  line-height: 1.5;
  
  &:focus { border-color: #3b82f6; }
  &::placeholder { color: #475569; }
`;

const SendBtn = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${p => p.disabled ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)'};
  border: none;
  color: ${p => p.disabled ? '#475569' : 'white'};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover:not(:disabled) { transform: scale(1.05); filter: brightness(1.1); }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  
  .icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
    border: 2px solid rgba(59, 130, 246, 0.2);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    margin-bottom: 24px;
  }
  
  h3 { color: #f8fafc; font-size: 22px; margin-bottom: 8px; }
  p { color: #64748b; font-size: 14px; line-height: 1.6; max-width: 360px; }
`;

const QUICK_PROMPTS = [
  { label: '📊 Financial Analysis', message: 'Generate my complete financial health analysis with actionable recommendations.' },
  { label: '📈 Best SIP Plans', message: 'What are the best SIP plans for me based on my income and risk profile?' },
  { label: '💰 Save Tax', message: 'How can I maximize my tax savings under Section 80C, 80D, and other sections?' },
  { label: '🎯 Retirement Plan', message: 'How much should I save monthly for retirement at age 60?' },
  { label: '🛡️ Insurance Needs', message: 'What insurance coverage do I need based on my financial situation?' },
  { label: '💳 Debt Strategy', message: 'What is the best strategy to pay off my loans and build wealth simultaneously?' },
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
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await axios.get(`${API}/chat/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to load chat history');
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, [token]);

  const sendMessage = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', message: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API}/chat/message`, {
        message: text,
        conversationHistory: messages.slice(-10)
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
      const { data } = await axios.post(`${API}/chat/analyze`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    try {
      await axios.delete(`${API}/chat/history`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
      toast.success('Chat history cleared');
    } catch {
      toast.error('Failed to clear history');
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
          <ActionBtn onClick={clearHistory}>
            <FaTrash /> Clear
          </ActionBtn>
        </HeaderActions>
      </Header>

      {/* Messages */}
      <MessagesArea>
        {isHistoryLoading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading conversation...</div>
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
        <TextInput
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about investing, budgeting, tax saving... (Enter to send)"
          rows={1}
        />
        <SendBtn onClick={() => sendMessage()} disabled={!input.trim() || isLoading}>
          <FaPaperPlane />
        </SendBtn>
      </InputArea>
    </Container>
  );
}
