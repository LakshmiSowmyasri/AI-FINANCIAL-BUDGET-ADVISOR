const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');

class SMSService {
  // Parse transaction SMS messages
  parseTransactionSMS(smsText) {
    const patterns = {
      // Debit patterns (various bank formats)
      debit: [
        /(?:debited|debit|paid|spent|withdrawn|transferred).*?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?).*?(?:debited|debit|paid|spent|withdrawn)/i,
        /(?:sent|paid)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:purchase|transaction).*?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:UPI|IMPS|NEFT)\s+.*?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:withdrawn|ATM).*?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i
      ],
      // Credit patterns
      credit: [
        /(?:credited|credit|received|deposited).*?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?).*?(?:credited|credit|received|deposited)/i,
        /(?:received|got)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i
      ]
    };

    let amount = null;
    let type = null;
    let merchant = null;

    // Check for debit
    for (const pattern of patterns.debit) {
      const match = smsText.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        type = 'debit';
        break;
      }
    }

    // Check for credit if not found as debit
    if (!amount) {
      for (const pattern of patterns.credit) {
        const match = smsText.match(pattern);
        if (match) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          type = 'credit';
          break;
        }
      }
    }

    // Extract merchant/beneficiary name
    const merchantPatterns = [
      /(?:to|at|from|by|via)\s+([A-Za-z][A-Za-z0-9\s&.,'-]{2,50})/i,
      /(?:merchant|payee|beneficiary|recipient).*?:?\s*([A-Za-z][A-Za-z0-9\s&.,'-]{2,50})/i,
      /(?:transfer\s+to|sent\s+to|payment\s+to)\s+([A-Za-z][A-Za-z0-9\s&.,'-]{2,50})/i
    ];

    for (const pattern of merchantPatterns) {
      const match = smsText.match(pattern);
      if (match) {
        merchant = match[1].trim().substring(0, 100);
        break;
      }
    }

    // Extract date from SMS
    let transactionDate = new Date();
    const datePatterns = [
      /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
      /(?:on|at|dated?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = smsText.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed)) {
          transactionDate = parsed;
          break;
        }
      }
    }

    if (amount && type) {
      return {
        amount,
        type,
        merchant: merchant || (type === 'debit' ? 'Unknown Merchant' : 'Unknown Source'),
        transactionDate,
        rawText: smsText
      };
    }

    return null;
  }

  // Process SMS and create transactions
  async processSMSTransactions(userId, smsList) {
    const results = {
      processed: [],
      failed: [],
      skipped: []
    };

    const pool = getPool();

    for (const sms of smsList) {
      try {
        const parsed = this.parseTransactionSMS(sms.text || sms);
        
        if (!parsed) {
          results.skipped.push({ sms: sms.text || sms, reason: 'Could not parse transaction' });
          continue;
        }

        // Check for duplicates (same amount within 5 minutes)
        const [existing] = await pool.execute(
          `SELECT * FROM sms_transactions 
           WHERE user_id = ? AND amount = ? AND transaction_type = ? 
           AND ABS(TIMESTAMPDIFF(MINUTE, transaction_date, ?)) < 5`,
          [userId, parsed.amount, parsed.type, parsed.transactionDate]
        );

        if (existing.length > 0) {
          results.skipped.push({ 
            sms: sms.text || sms, 
            reason: 'Duplicate transaction detected',
            parsed 
          });
          continue;
        }

        // Store in sms_transactions table
        const id = uuidv4();
        await pool.execute(
          `INSERT INTO sms_transactions 
           (id, user_id, sms_text, transaction_type, amount, merchant, transaction_date, is_processed) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userId, sms.text || sms, parsed.type, parsed.amount, parsed.merchant, parsed.transactionDate, true]
        );

        // Create expense record for debit transactions
        if (parsed.type === 'debit') {
          const expenseId = uuidv4();
          const categoryId = await this.getCategoryForMerchant(userId, parsed.merchant);
          
          await pool.execute(
            `INSERT INTO expenses 
             (id, user_id, category_id, amount, description, expense_date, payment_method) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              expenseId,
              userId,
              categoryId,
              parsed.amount,
              `SMS: ${parsed.merchant}`,
              new Date().toISOString().split('T')[0],
              'auto-detected'
            ]
          );

          // Update category spent amount
          if (categoryId) {
            await pool.execute(
              `UPDATE budget_categories 
               SET spent_amount = spent_amount + ? 
               WHERE id = ?`,
              [parsed.amount, categoryId]
            );
          }
        }

        results.processed.push({
          id,
          ...parsed,
          merchant: parsed.merchant
        });

      } catch (error) {
        console.error('SMS processing error:', error);
        results.failed.push({ sms: sms.text || sms, error: error.message });
      }
    }

    return results;
  }

  // Get or create category based on merchant name
  async getCategoryForMerchant(userId, merchant) {
    const pool = getPool();
    
    // Category mapping based on merchant keywords
    const categoryMap = {
      'food': ['restaurant', 'food', 'swiggy', 'zomato', 'dominos', 'pizza', 'cafe', 'hotel'],
      'groceries': ['mart', 'supermarket', 'kirana', 'grocery', 'bigbasket', 'blinkit', 'zepto'],
      'shopping': ['mall', 'store', 'shop', 'amazon', 'flipkart', 'myntra', 'ajio'],
      'transport': ['uber', 'ola', 'rapido', 'auto', 'cab', 'petrol', 'diesel', 'fuel'],
      'entertainment': ['movie', 'cinema', 'pvr', 'inox', 'netflix', 'prime', 'hotstar'],
      'utilities': ['electricity', 'water', 'gas', 'broadband', 'wifi', 'mobile', 'recharge'],
      'health': ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'apollo', 'medplus']
    };

    const merchantLower = merchant.toLowerCase();
    let categoryName = 'Miscellaneous';

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(kw => merchantLower.includes(kw))) {
        categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        break;
      }
    }

    // Find or create category
    const [categories] = await pool.execute(
      'SELECT id FROM budget_categories WHERE user_id = ? AND name = ?',
      [userId, categoryName]
    );

    if (categories.length > 0) {
      return categories[0].id;
    }

    // Create new category
    const id = uuidv4();
    const colors = {
      'Food': '#ef4444',
      'Groceries': '#22c55e',
      'Shopping': '#3b82f6',
      'Transport': '#f59e0b',
      'Entertainment': '#8b5cf6',
      'Utilities': '#06b6d4',
      'Health': '#ec4899',
      'Miscellaneous': '#6b7280'
    };

    await pool.execute(
      `INSERT INTO budget_categories (id, user_id, name, allocated_amount, spent_amount, color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, categoryName, 5000, 0, colors[categoryName] || '#6b7280']
    );

    return id;
  }

  // Get user's SMS transaction history
  async getTransactionHistory(userId, limit = 50) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM sms_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }
}

module.exports = new SMSService();
