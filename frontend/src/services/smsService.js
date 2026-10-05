import { Capacitor } from '@capacitor/core';
import { Permissions } from '@capacitor/permissions';
import { LocalNotifications } from '@capacitor/local-notifications';

export class SMSService {
  static async requestSMSPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('SMS permissions only available on native platform');
      return false;
    }

    try {
      // For Android, we need to check and request SMS permissions
      const permission = await Permissions.query({ name: 'sms' });
      
      if (permission.state !== 'granted') {
        const result = await Permissions.request({ name: 'sms' });
        return result.state === 'granted';
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      return false;
    }
  }

  static async startSMSMonitoring(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('SMS monitoring only available on native platform');
      return;
    }

    try {
      // Request permission first
      const hasPermission = await this.requestSMSPermission();
      if (!hasPermission) {
        console.error('SMS permission not granted');
        return;
      }

      // Set up periodic checking (simulated SMS monitoring)
      setInterval(async () => {
        await this.checkForNewTransactions();
      }, 30000); // Check every 30 seconds

      console.log('SMS monitoring started');
    } catch (error) {
      console.error('Error starting SMS monitoring:', error);
    }
  }

  static async checkForNewTransactions(): Promise<void> {
    try {
      // This would require a custom Capacitor plugin to read SMS
      // For demonstration, we'll show the structure
      console.log('Checking for new transaction SMS...');
      
      // In a real implementation, you would:
      // 1. Read recent SMS messages via native Android API
      // 2. Parse for transaction keywords
      // 3. Extract transaction details
      // 4. Send to backend API
      
    } catch (error) {
      console.error('Error checking for transactions:', error);
    }
  }

  static parseTransactionSMS(smsText: string): any {
    const transactionKeywords = ['debited', 'credited', 'paid', 'received', 'spent', 'withdrawn', 'UPI', 'NEFT', 'IMPS'];
    const amountRegex = /(?:Rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    const merchantRegex = /(?:at|from|to)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:on|dated|is|for)|$)/i;
    
    const isTransaction = transactionKeywords.some(keyword => 
      smsText.toLowerCase().includes(keyword)
    );
    
    if (!isTransaction) return null;
    
    const amounts = smsText.match(amountRegex);
    const merchantMatch = smsText.match(merchantRegex);
    
    return {
      isTransaction: true,
      amount: amounts ? parseFloat(amounts[0].replace(/[^\d.]/g, '')) : null,
      merchant: merchantMatch ? merchantMatch[1].trim() : 'Unknown',
      type: this.detectTransactionType(smsText),
      date: new Date().toISOString(),
      rawText: smsText
    };
  }

  static detectTransactionType(smsText: string): string {
    const text = smsText.toLowerCase();
    if (text.includes('debited') || text.includes('spent') || text.includes('withdrawn')) {
      return 'debit';
    } else if (text.includes('credited') || text.includes('received')) {
      return 'credit';
    }
    return 'unknown';
  }

  static async sendTransactionToBackend(transaction: any): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('http://localhost:5000/api/expenses/auto-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: transaction.amount,
          description: transaction.merchant,
          category: 'Auto-detected',
          payment_method: 'Auto SMS',
          expense_date: new Date().toISOString().split('T')[0],
          is_recurring: false,
          source: 'sms_detection'
        })
      });
      
      if (response.ok) {
        // Show notification
        await LocalNotifications.schedule({
          notifications: [{
            title: 'Transaction Detected',
            body: `₹${transaction.amount} ${transaction.type}ed at ${transaction.merchant}`,
            id: Date.now(),
            schedule: { at: new Date() }
          }]
        });
        
        console.log('Transaction automatically imported:', transaction);
      } else {
        console.error('Failed to import transaction:', await response.text());
      }
    } catch (error) {
      console.error('Error sending transaction to backend:', error);
    }
  }

  static async initializeSMSDetection(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.requestPermissions();
      await this.startSMSMonitoring();
    } else {
      console.log('SMS detection is only available on mobile app');
    }
  }

  static async requestPermissions(): Promise<void> {
    try {
      await LocalNotifications.requestPermissions();
      await this.requestSMSPermission();
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  }
}
