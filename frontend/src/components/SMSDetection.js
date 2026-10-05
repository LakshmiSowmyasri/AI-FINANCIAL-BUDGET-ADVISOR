import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaMobileAlt, FaToggleOn, FaToggleOff, FaCog, FaCheck } from 'react-icons/fa';
import styled from 'styled-components';
import { SMSService } from '../services/smsService';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
`;

const Card = styled(motion.div)`
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
`;

const Title = styled.h3`
  color: var(--text-main);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
`;

const SettingDescription = styled.p`
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  color: ${props => props.enabled ? 'var(--primary)' : 'var(--text-muted)'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.08);
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  margin-top: 16px;
  background: ${props => props.active ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)'};
  color: ${props => props.active ? 'var(--primary)' : 'var(--warning)'};
  border: 1px solid ${props => props.active ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'};
`;

const PulseDot = styled(motion.div)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? 'var(--primary)' : 'var(--warning)'};
`;

const SMSDetection = () => {
  const [settings, setSettings] = useState({
    smsDetectionEnabled: true,
    autoImportEnabled: true,
    notificationEnabled: true
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeSMSDetection();
  }, []);

  const initializeSMSDetection = async () => {
    try {
      setLoading(true);
      await SMSService.initializeSMSDetection();
      setIsMonitoring(true);
      toast.success('SMS detection initialized');
    } catch (error) {
      console.error('Failed to initialize SMS detection:', error);
      toast.error('Failed to initialize SMS detection');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (setting) => {
    const newSettings = {
      ...settings,
      [setting]: !settings[setting]
    };
    
    setSettings(newSettings);
    
    try {
      // Save settings to backend
      const response = await fetch('/api/expenses/sms-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        toast.success(`${setting} updated successfully`);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Title>
          <FaMobileAlt />
          SMS Detection
        </Title>

        <AnimatePresence>
          {isMonitoring && (
            <StatusIndicator
              active={true}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PulseDot
                active={true}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              Actively monitoring for transactions
            </StatusIndicator>
          )}
        </AnimatePresence>

        <SettingRow>
          <SettingLabel>
            <FaMobileAlt />
            <div>
              <div>SMS Detection</div>
              <SettingDescription>
                Monitor SMS messages for transaction alerts
              </SettingDescription>
            </div>
          </SettingLabel>
          <ToggleButton
            enabled={settings.smsDetectionEnabled}
            onClick={() => handleToggle('smsDetectionEnabled')}
          >
            {settings.smsDetectionEnabled ? <FaToggleOn /> : <FaToggleOff />}
          </ToggleButton>
        </SettingRow>

        <SettingRow>
          <SettingLabel>
            <FaCheck />
            <div>
              <div>Auto-Import</div>
              <SettingDescription>
                Automatically import detected transactions
              </SettingDescription>
            </div>
          </SettingLabel>
          <ToggleButton
            enabled={settings.autoImportEnabled}
            onClick={() => handleToggle('autoImportEnabled')}
          >
            {settings.autoImportEnabled ? <FaToggleOn /> : <FaToggleOff />}
          </ToggleButton>
        </SettingRow>

        <SettingRow>
          <SettingLabel>
            <FaBell />
            <div>
              <div>Notifications</div>
              <SettingDescription>
                Show notifications for detected transactions
              </SettingDescription>
            </div>
          </SettingLabel>
          <ToggleButton
            enabled={settings.notificationEnabled}
            onClick={() => handleToggle('notificationEnabled')}
          >
            {settings.notificationEnabled ? <FaToggleOn /> : <FaToggleOff />}
          </ToggleButton>
        </SettingRow>
      </Card>
    </Container>
  );
};

export default SMSDetection;
