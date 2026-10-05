const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Enhanced financial knowledge base with specific advice and conversational responses
const financialKnowledge = {
    budgeting: {
        keywords: ['budget', 'spending', 'expense', 'expenses', 'monthly spend', 'overspending', 'where is my money', 'tracking', 'track'],
        tips: [
            "Write down everything you spend money on for a month to see where it goes",
            "Try the 50/30/20 plan: spend half on things you need, a third on things you want, and save the rest",
            "Get a warning message when you spend too much in any category",
            "Look at your monthly subscriptions and cancel the ones you do not use"
        ],
        question: "Would you like me to look at how you spend your money?"
    },
    savings: {
        keywords: ['save', 'saving', 'emergency fund', 'savings goal', 'how much to save', 'savings account'],
        tips: [
            "Try to save a small part of your pay first, like 10%, then slowly save more",
            "Keep your emergency cash in a bank account that pays you extra money",
            "Set up your bank to move savings automatically on the day you get paid",
            "Put aside small change every time you buy something"
        ],
        question: "How much money would you like to save each month?"
    },
    investment: {
        keywords: ['invest', 'sip', 'mutual fund', 'stock', 'returns', 'portfolio', 'where to invest', 'fd', 'ppf', 'nps', 'elss', 'shares', 'equity'],
        tips: [
            "Start putting away a small amount, like ₹500 a month, as early as you can to help it grow",
            "Spread your money around in different places to keep it safe",
            "Index funds are an easy and cheap way for beginners to start investing",
            "Check how your investments are doing every six months"
        ],
        question: "Are you saving for the near future or for many years from now?"
    },
    debt: {
        keywords: ['debt', 'loan', 'emi', 'credit card', 'interest', 'repay', 'personal loan', 'home loan', 'car loan'],
        tips: [
            "Pay off the loans that charge you the highest fee for borrowing money first",
            "Always pay your monthly loan bills on time to keep your credit score healthy",
            "If your credit card fees are too high, see if you can move the debt to a cheaper option",
            "Do not take new loans until you pay off the ones you already have"
        ],
        question: "How much money do you pay for your loans each month?"
    },
    insurance: {
        keywords: ['insurance', 'life cover', 'health insurance', 'term plan', 'mediclaim', 'lic', 'policy', 'coverage'],
        tips: [
            "Get life insurance that covers 10 to 15 times what you earn in a year",
            "Get health insurance to cover hospital bills for you and your family",
            "Buy insurance when you are young because it costs less",
            "Review your insurance cover once a year as your pay grows"
        ],
        question: "Do you have life or health insurance right now?"
    },
    tax: {
        keywords: ['tax', '80c', '80d', 'deduction', 'income tax', 'tax saving', 'itr', 'tax return', 'taxable'],
        tips: [
            "Save on taxes by putting money into public savings plans or tax-saving funds",
            "You can get extra tax cuts by putting money into retirement plans",
            "The money you pay for health insurance can also help you pay less tax",
            "If you pay house rent, you might be able to claim a tax break"
        ],
        question: "How much money do you make in a year before taxes?"
    },
    goals: {
        keywords: ['goal', 'financial goal', 'buy house', 'car', 'education', 'retirement', 'planning', 'future', 'dream', 'target'],
        tips: [
            "Make your goals clear, simple, and give them a target date",
            "Decide what you need money for soon, in a few years, or when you grow old",
            "Work out how much you need to set aside each month for each goal",
            "Focus on saving emergency cash and paying off loans before other dreams"
        ],
        question: "What is the most important thing you are saving for right now?"
    },
    crypto: {
        keywords: ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'blockchain', 'digital currency'],
        tips: [
            "Crypto prices go up and down very fast. Only put in money you are okay losing",
            "Only put a very small part of your money into crypto",
            "Use trusted apps and safe digital wallets to store your crypto",
            "Learn how crypto works before you put any money into it"
        ],
        question: "Do you want to try crypto to make money or just to learn?"
    },
    gold: {
        keywords: ['gold', 'sovereign gold bond', 'sgb', 'digital gold', 'jewelry'],
        tips: [
            "Buying government gold bonds is safer and easier than keeping real gold at home",
            "Digital gold is easy to buy and sell without extra fees",
            "Put a small part of your savings into gold to keep your money safe",
            "Government gold bonds pay you a little interest every year while gold prices change"
        ],
        question: "Are you buying gold to save money or to wear as jewelry?"
    }
};

// General conversation patterns for normal chatting
const conversationPatterns = {
    greetings: {
        patterns: [/^(hi|hello|hey|namaste|good morning|good afternoon|good evening)/i],
        responses: [
            "Hello! How are you?",
            "Hi there! How can I help you?",
            "Hey! What is on your mind?",
            "Hello! How is your day going?"
        ]
    },
    wellbeing: {
        patterns: [/how are you|how do you do|what's up|how are things/i],
        responses: [
            "I am doing great, thanks for asking! How are you?",
            "I am feeling good and ready to help. What do you need?",
            "I am doing well! Always happy to talk about money or just chat. How are you?"
        ]
    },
    personal: {
        patterns: [/what about you|tell me about yourself|who are you/i],
        responses: [
            "I am your AI money assistant! I love helping people manage their money and reach their goals.",
            "I am a friendly AI who loves to help people learn about their finances!"
        ]
    },
    feelings: {
        patterns: [/(i'm|i am) (happy|sad|excited|worried|stressed|good|great|okay|fine)/i],
        responses: [
            "Thanks for telling me. How can I make your day better?",
            "I am here to support you if you need advice or just want to talk.",
            "Thank you for sharing. How can I help you today?"
        ]
    },
    weekend: {
        patterns: [/weekend|holiday|vacation|break/i],
        responses: [
            "Weekends are great for relaxing and planning. Have you checked your budget lately?",
            "I hope you have a nice weekend! It is a good time to think about your money goals."
        ]
    },
    weather: {
        patterns: [/weather|rain|sunny|cold|hot/i],
        responses: [
            "The weather can change how we spend. On sunny days we go out more, but rainy days are great to check your budget!",
            "It is interesting how weather affects our lives and our money. How is it looking outside?"
        ]
    },
    food: {
        patterns: [/food|eat|cooking|recipe|restaurant|dinner|lunch|breakfast/i],
        responses: [
            "Food is a big part of our budget! Have you checked how much you spend on eating out?",
            "I love talking about food! Would you like tips on how to save money on your meals?"
        ]
    },
    entertainment: {
        patterns: [/movie|music|book|game|netflix|prime|spotify/i],
        responses: [
            "Entertainment is fun, but subscriptions can get expensive. Have you looked at yours lately?",
            "Are you enjoying your shows? Just make sure you are getting your money's worth!"
        ]
    }
};

// Greeting patterns for better time-based responses
const greetingPatterns = {
    morning: [/good morning/, /morning/, /early/],
    afternoon: [/good afternoon/, /afternoon/],
    evening: [/good evening/, /evening/],
    night: [/good night/, /night/, /late/],
    general: [/hi/, /hello/, /hey/, /namaste/, /howdy/, /greetings/, /welcome/]
};

// Polite conversation patterns
const politePatterns = {
    thanks: [/thank/, /thanks/, /grateful/, /appreciate/],
    sorry: [/sorry/, /apologize/, /my bad/],
    bye: [/bye/, /goodbye/, /see you/, /take care/, /farewell/],
    compliment: [/good job/, /well done/, /excellent/, /great/, /awesome/, /perfect/]
};

// Get chat history
router.get('/history', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        const [messages] = await pool.query(
            `SELECT role, message, timestamp 
             FROM chat_history 
             WHERE user_id = ? 
             ORDER BY timestamp ASC 
             LIMIT 50`,
            [req.user.id]
        );

        res.json({ messages });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

// Send message to AI assistant
router.post('/message', authenticate, async (req, res) => {
    try {
        const { message } = req.body;
        const pool = getPool();
        const userId = req.user.id;

        // Save user message
        await pool.query(
            'INSERT INTO chat_history (id, user_id, role, message) VALUES (?, ?, ?, ?)',
            [uuidv4(), userId, 'user', message]
        );

        // Get comprehensive user financial data
        const userData = await getUserFinancialData(pool, userId);

        // Generate contextual AI response
        const aiResponse = generateSmartResponse(message, userData);

        // Save AI response
        await pool.query(
            'INSERT INTO chat_history (id, user_id, role, message) VALUES (?, ?, ?, ?)',
            [uuidv4(), userId, 'assistant', aiResponse]
        );

        res.json({ response: aiResponse });
    } catch (error) {
        console.error('Chat message error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// POST /api/chat/analyze - financial health analysis
router.post('/analyze', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        const userId = req.user.id;
        
        // Save user request message
        await pool.query(
            'INSERT INTO chat_history (id, user_id, role, message) VALUES (?, ?, ?, ?)',
            [uuidv4(), userId, 'user', '📊 Generate my financial health analysis']
        );

        const userData = await getUserFinancialData(pool, userId);
        
        const monthlyIncome = parseFloat(userData.user?.monthly_income || 0);
        const totalExpenses = parseFloat(userData.totalExpenses || 0);
        const expenseRatio = monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 0;
        
        let response = `📊 **A Simple Look at Your Money:**\n\n`;
        response += `• **Money Earned This Month:** ₹${monthlyIncome.toLocaleString('en-IN')}\n`;
        response += `• **Money Spent This Month:** ₹${totalExpenses.toLocaleString('en-IN')}\n`;
        response += `• **How Much of Your Earnings You Spent:** ${expenseRatio.toFixed(1)}%\n\n`;
        
        if (monthlyIncome === 0) {
            response += `⚠️ **Income Not Set:** Please add your monthly pay in your profile so I can help you budget better.\n\n`;
        } else {
            const savings = monthlyIncome - totalExpenses;
            response += `• **Money Left to Save:** ₹${savings.toLocaleString('en-IN')}\n\n`;
            
            if (expenseRatio > 90) {
                response += `🔴 **Be Careful:** You spent almost all of your money this month (over 90%). Try to look at what you bought and cut down on things you do not really need.\n\n`;
            } else if (expenseRatio > 70) {
                response += `🟡 **Take Note:** Your spending is a bit high this month. Try to watch your extra spending so you can save more.\n\n`;
            } else if (expenseRatio < 50) {
                response += `🟢 **Great Job:** You spent less than half of your income! This is excellent and leaves you plenty of money to save or invest.\n\n`;
            } else {
                response += `🔵 **Good Balance:** Your spending is at a good level. Try to keep this up and aim to save a fifth (20%) of your money.\n\n`;
            }
        }
        
        if (userData.expenses.length > 0) {
            response += `📂 **Where Most of Your Money Went:**\n`;
            userData.expenses.slice(0, 3).forEach(cat => {
                response += `• ${cat.category}: ₹${parseFloat(cat.total).toLocaleString('en-IN')}\n`;
            });
            response += `\n`;
        }
        
        if (userData.goals.length > 0) {
            response += `🎯 **Your Goals Progress:**\n`;
            userData.goals.forEach(goal => {
                const progress = (parseFloat(goal.current_amount) / parseFloat(goal.target_amount) * 100).toFixed(1);
                response += `• ${goal.name}: ₹${parseFloat(goal.current_amount).toLocaleString('en-IN')} of ₹${parseFloat(goal.target_amount).toLocaleString('en-IN')} (${progress}%)\n`;
            });
        } else {
            response += `💡 **Tip:** Make a savings goal to help you reach your targets!\n`;
        }

        // Save analysis to chat history so it displays in chat
        await pool.query(
            'INSERT INTO chat_history (id, user_id, role, message, message_type) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), userId, 'assistant', response, 'analysis']
        );
        
        res.json({ response, messageType: 'analysis' });
    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: 'Failed to analyze financial data' });
    }
});

// Clear chat history
router.delete('/history', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        await pool.execute(
            'DELETE FROM chat_history WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

router.delete('/clear', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        await pool.execute(
            'DELETE FROM chat_history WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

router.post('/clear', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        await pool.execute(
            'DELETE FROM chat_history WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});
async function getUserFinancialData(pool, userId) {
    // Get user profile
    const [userRows] = await pool.query(
        'SELECT monthly_income, name, email FROM users WHERE id = ?',
        [userId]
    );
    
    // Get current month expenses by category
    const [expenseRows] = await pool.query(`
        SELECT c.name as category, SUM(e.amount) as total
        FROM expenses e 
        JOIN budget_categories c ON e.category_id = c.id 
        WHERE e.user_id = ? 
        AND MONTH(e.expense_date) = MONTH(CURRENT_DATE())
        AND YEAR(expense_date) = YEAR(CURRENT_DATE())
        GROUP BY c.id 
        ORDER BY total DESC
    `, [userId]);
    
    // Get total expenses this month
    const [totalExpenseRows] = await pool.query(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE user_id = ? 
        AND MONTH(expense_date) = MONTH(CURRENT_DATE())
        AND YEAR(expense_date) = YEAR(CURRENT_DATE())
    `, [userId]);
    
    // Get savings goals
    const [goalsRows] = await pool.query(
        'SELECT name, target_amount, current_amount FROM savings_goals WHERE user_id = ?',
        [userId]
    );
    
    // Get recent large expenses
    const [largeExpenses] = await pool.query(`
        SELECT e.amount, e.description, c.name as category
        FROM expenses e
        JOIN budget_categories c ON e.category_id = c.id
        WHERE e.user_id = ? AND e.amount > 5000
        ORDER BY e.expense_date DESC
        LIMIT 5
    `, [userId]);

    // Get budget categories
    const [budgetRows] = await pool.query(
        'SELECT name, allocated_amount, spent_amount FROM budget_categories WHERE user_id = ?',
        [userId]
    );

    // Get active investments
    const [investmentRows] = await pool.query(
        'SELECT type, name, invested_amount, current_value, monthly_sip_amount, risk_level FROM investments WHERE user_id = ? AND is_active = TRUE',
        [userId]
    );

    // Get recent transactions
    const [recentTxns] = await pool.query(`
        SELECT e.amount, e.description, c.name as category, e.expense_date
        FROM expenses e
        JOIN budget_categories c ON e.category_id = c.id
        WHERE e.user_id = ?
        ORDER BY e.expense_date DESC
        LIMIT 5
    `, [userId]);

    return {
        user: userRows[0] || { monthly_income: 0, name: '' },
        expenses: expenseRows,
        totalExpenses: totalExpenseRows[0]?.total || 0,
        goals: goalsRows,
        largeExpenses: largeExpenses,
        budgets: budgetRows,
        investments: investmentRows,
        recentTransactions: recentTxns
    };
}
function generateSmartResponse(message, userData) {
    const lowerMessage = message.toLowerCase();
    const monthlyIncome = parseFloat(userData.user?.monthly_income || 0);
    const totalExpenses = parseFloat(userData.totalExpenses || 0);
    const netSavings = Math.max(0, monthlyIncome - totalExpenses);
    const expenseRatio = monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - totalExpenses) / monthlyIncome) * 100 : 0;

    // ========================================================
    // A. AFFORDABILITY CALCULATOR: "Can I afford a ₹50,000 laptop?"
    // ========================================================
    if (lowerMessage.includes('afford') || lowerMessage.includes('should i buy') || lowerMessage.includes('can i buy')) {
        // Extract price number (handles formats: ₹50,000, 50000, 50k, 1.5 lakh)
        let extractedAmount = null;
        let itemName = 'this item';

        const lakhMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
        const kMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*k\b/i);
        const numMatch = lowerMessage.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);

        if (lakhMatch) {
            extractedAmount = parseFloat(lakhMatch[1]) * 100000;
        } else if (kMatch) {
            extractedAmount = parseFloat(kMatch[1]) * 1000;
        } else if (numMatch) {
            extractedAmount = parseFloat(numMatch[1].replace(/,/g, ''));
        }

        // Extract item name
        const itemClean = lowerMessage
            .replace(/\b(?:can i afford|should i buy|can i buy|afford to buy|a|an|the|worth|costing|for|price|buy)\b/gi, '')
            .replace(/(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?/gi, '')
            .replace(/\b(?:lakh|lac|k)\b/gi, '')
            .replace(/[?.,]/g, '')
            .trim();
        if (itemClean.length > 1) {
            itemName = itemClean;
        }

        if (extractedAmount && extractedAmount > 0) {
            let verdict = '';
            let strategy = '';
            let icon = '💡';

            if (monthlyIncome === 0) {
                return `✨ **AI Affordability Analysis:**\n\nTo give you an exact affordability assessment for **${itemName}** (₹${extractedAmount.toLocaleString('en-IN')}), please add your monthly income in your profile first!`;
            }

            if (extractedAmount <= netSavings * 0.6) {
                icon = '✅';
                verdict = `**Verdict: Yes, you can afford it comfortably!**`;
                strategy = `• This purchase (₹${extractedAmount.toLocaleString('en-IN')}) takes **${Math.round((extractedAmount / netSavings) * 100)}%** of your current monthly surplus (₹${netSavings.toLocaleString('en-IN')}).\n` +
                           `• You will still retain **₹${(netSavings - extractedAmount).toLocaleString('en-IN')}** in net savings this month.\n` +
                           `• **Recommendation:** Proceed with cash/debit payment without taking on debt or EMI interest.`;
            } else if (extractedAmount <= netSavings) {
                icon = '⚠️';
                verdict = `**Verdict: Affordable, but requires caution.**`;
                strategy = `• This purchase consumes **${Math.round((extractedAmount / netSavings) * 100)}%** of your monthly surplus.\n` +
                           `• You will have approximately **₹${(netSavings - extractedAmount).toLocaleString('en-IN')}** leftover in savings this month.\n` +
                           `• **Recommendation:** Consider splitting into 2 months or verifying that no unexpected bills are due before buying.`;
            } else if (extractedAmount <= monthlyIncome * 1.5) {
                icon = '🎯';
                const monthsToSave = Math.ceil(extractedAmount / Math.max(1, netSavings));
                verdict = `**Verdict: Best to save up with a dedicated goal.**`;
                strategy = `• At your current monthly savings rate (₹${netSavings.toLocaleString('en-IN')}/month), you can buy **${itemName}** in **${monthsToSave} months** without touching emergency funds.\n` +
                           `• If urgent, a 0%-interest 3 to 6-month EMI plan of **₹${Math.round(extractedAmount / 6).toLocaleString('en-IN')}/month** fits within your cash flow.\n` +
                           `• **Action:** Create a savings goal for "${itemName}" in the Goals tab!`;
            } else {
                icon = '❌';
                verdict = `**Verdict: High financial strain — not advised right now.**`;
                strategy = `• The cost of ₹${extractedAmount.toLocaleString('en-IN')} is **${((extractedAmount / monthlyIncome) * 100).toFixed(0)}%** of your total monthly earnings.\n` +
                           `• Taking on this purchase now would severely compromise emergency liquidity and savings goals.\n` +
                           `• **Recommendation:** Focus on building a 3-month emergency fund and revisit when discretionary savings grow.`;
            }

            return `${icon} **AI Affordability Analysis: ${itemName.toUpperCase()}**\n\n` +
                   `• **Item Price:** ₹${extractedAmount.toLocaleString('en-IN')}\n` +
                   `• **Monthly Income:** ₹${monthlyIncome.toLocaleString('en-IN')}\n` +
                   `• **Current Net Monthly Surplus:** ₹${netSavings.toLocaleString('en-IN')}\n` +
                   `• **Current Savings Rate:** ${savingsRate.toFixed(1)}%\n\n` +
                   `${verdict}\n\n` +
                   `${strategy}\n\n` +
                   `*✨ AI-Generated Financial Recommendation based on your live budget data.*`;
        }
    }

    // ========================================================
    // B. "HOW CAN I SAVE MORE MONEY?"
    // ========================================================
    if (lowerMessage.includes('save more') || lowerMessage.includes('save more money') || lowerMessage.includes('how to save more') || lowerMessage.includes('increase my savings')) {
        let response = `💡 **AI Recommendations to Accelerate Your Savings:**\n\n`;

        if (userData.expenses && userData.expenses.length > 0) {
            const topCategory = userData.expenses[0];
            const topAmount = parseFloat(topCategory.total || 0);
            const cut15 = Math.round(topAmount * 0.15);

            response += `1. **Target Your Highest Spending Area:**\n` +
                        `   You spent **₹${topAmount.toLocaleString('en-IN')}** on **${topCategory.category}** this month.\n` +
                        `   Trimming just 15% here frees up **₹${cut15.toLocaleString('en-IN')}/month** (₹${(cut15 * 12).toLocaleString('en-IN')} per year!).\n\n`;
        }

        if (monthlyIncome > 0) {
            const autoSave10 = Math.round(monthlyIncome * 0.10);
            response += `2. **Pay Yourself First (Automated Salary-Day Transfer):**\n` +
                        `   Schedule an automatic deposit of **₹${autoSave10.toLocaleString('en-IN')}** (10% of pay) into a high-yield savings account or liquid fund on the day your salary arrives.\n\n`;
        }

        response += `3. **Audit Recurring Subscriptions & Food Ordering:**\n` +
                    `   Review monthly app subscriptions and limit food deliveries to weekends only.\n\n` +
                    `4. **Set Up Dedicated Savings Goals:**\n` +
                    `   Having a specific goal (like Emergency Fund or Travel) increases saving discipline by over 40%.\n\n` +
                    `*✨ AI-Generated Recommendation based on your monthly cash flow.*`;
        return response;
    }

    // ========================================================
    // C. "WHY ARE MY EXPENSES INCREASING?"
    // ========================================================
    if (lowerMessage.includes('expenses increasing') || lowerMessage.includes('why are my expenses high') || lowerMessage.includes('why am i spending so much') || lowerMessage.includes('expense spike')) {
        let response = `🔍 **AI Expense Root-Cause Analysis:**\n\n`;

        if (userData.expenses && userData.expenses.length > 0) {
            response += `Here is where the majority of your cash is flowing this month:\n\n`;
            userData.expenses.slice(0, 3).forEach((cat, idx) => {
                const amt = parseFloat(cat.total || 0);
                const pct = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0;
                response += `${idx + 1}. **${cat.category}**: ₹${amt.toLocaleString('en-IN')} (${pct}% of total spend)\n`;
            });

            if (expenseRatio > 80) {
                response += `\n⚠️ **High Burn Rate:** You have consumed **${expenseRatio.toFixed(1)}%** of your monthly income so far. Discretionary impulse spending is the primary driver of rapid expense increases.\n`;
            } else {
                response += `\n💡 **Healthy Baseline:** Your spending is currently at ${expenseRatio.toFixed(1)}% of income, but keeping weekly tabs on your top category will prevent end-of-month spikes.\n`;
            }
        } else {
            response += `You have logged ₹${totalExpenses.toLocaleString('en-IN')} in expenses this month. Track each transaction with category tags so I can pinpoint exact trends for you!\n`;
        }

        response += `\n*✨ AI-Generated Diagnostic based on your recorded transactions.*`;
        return response;
    }

    // ========================================================
    // D. "HOW MUCH SHOULD I SAVE EVERY MONTH?"
    // ========================================================
    if (lowerMessage.includes('how much should i save') || lowerMessage.includes('ideal savings') || lowerMessage.includes('how much to save every month') || lowerMessage.includes('monthly savings target')) {
        if (monthlyIncome === 0) {
            return `🎯 **AI Recommendation:** Under the gold-standard **50/30/20 rule**, you should save at least **20% of your net monthly earnings**. Please add your monthly income in your profile to see your exact rupee numbers!`;
        }

        const needs50 = Math.round(monthlyIncome * 0.50);
        const wants30 = Math.round(monthlyIncome * 0.30);
        const savings20 = Math.round(monthlyIncome * 0.20);
        const savings30 = Math.round(monthlyIncome * 0.30);

        return `🎯 **Your Personalized Monthly Savings Blueprint:**\n\n` +
               `Based on your income of **₹${monthlyIncome.toLocaleString('en-IN')}/month**:\n\n` +
               `• **Essential Needs (50% max):** Up to ₹${needs50.toLocaleString('en-IN')}\n` +
               `• **Discretionary Wants (30% max):** Up to ₹${wants30.toLocaleString('en-IN')}\n` +
               `• **Minimum Savings (20% target):** **₹${savings20.toLocaleString('en-IN')} / month**\n` +
               `• **Accelerated Wealth Target (30%):** **₹${savings30.toLocaleString('en-IN')} / month**\n\n` +
               `📊 **Your Current Status:**\n` +
               `• You are saving: **₹${netSavings.toLocaleString('en-IN')}** (${savingsRate.toFixed(1)}%)\n` +
               (savingsRate >= 20
                 ? `✅ You are already beating the 20% benchmark! Consider investing surplus in diversified SIPs.`
                 : `⚠️ You are currently ₹${Math.max(0, savings20 - netSavings).toLocaleString('en-IN')} short of the 20% benchmark.`) +
               `\n\n*✨ AI-Generated Blueprint tailored to your income profile.*`;
    }

    // 1. Portfolio / Investments / SIP Plans (PRIORITIZED FIRST!)
    if (lowerMessage.includes('investment') || lowerMessage.includes('portfolio') || lowerMessage.includes('my sip') || lowerMessage.includes('invested') || lowerMessage.includes('sip plans') || lowerMessage.includes('best sip') || lowerMessage.includes('where to invest')) {
        if (lowerMessage.includes('best sip') || lowerMessage.includes('sip plans') || lowerMessage.includes('where to invest') || lowerMessage.includes('recommend')) {
            let response = "🤖 **Recommended SIP Plans for You:**\n\n";
            response += "Based on your profile, here are the top ML picks suitable for you:\n\n";
            response += "1. **Axis Bluechip Fund** (Large Cap Equity)\n";
            response += "   • Expected Growth: 12-15%\n";
            response += "   • Starting Amount: ₹500\n";
            response += "   • Suitability: Invest in very big, well-known companies that grow slowly and steadily.\n\n";
            response += "2. **Mirae Asset Emerging Bluechip** (Large & Mid Cap)\n";
            response += "   • Expected Growth: 14-18%\n";
            response += "   • Starting Amount: ₹1,000\n";
            response += "   • Suitability: Invest in a mix of big and medium companies for good, steady growth.\n\n";
            response += "3. **SBI Small Cap Fund** (Small Cap Equity)\n";
            response += "   • Expected Growth: 15-20%\n";
            response += "   • Starting Amount: ₹500\n";
            response += "   • Suitability: Invest in new, small companies to try and grow your money faster.\n\n";
            response += "You can add any of these to your portfolio directly from the **Investments** tab!";
            return response;
        }

        if (!userData.investments || userData.investments.length === 0) {
            return "You have no recorded investments in your portfolio yet. Go to the Investments tab to add some!";
        }
        let totalInvested = 0;
        let totalCurrentValue = 0;
        let response = "💼 **Your Current Investments:**\n\n";
        
        userData.investments.forEach(inv => {
            totalInvested += parseFloat(inv.invested_amount || 0);
            totalCurrentValue += parseFloat(inv.current_value || 0);
            response += `• **${inv.name}** (${inv.type.toUpperCase()}): Invested ₹${parseFloat(inv.invested_amount).toLocaleString('en-IN')} (Current Value: ₹${parseFloat(inv.current_value).toLocaleString('en-IN')})\n`;
        });
        
        const gain = totalCurrentValue - totalInvested;
        response += `\n**Total Portfolio Value**: ₹${totalCurrentValue.toLocaleString('en-IN')} (Invested: ₹${totalInvested.toLocaleString('en-IN')}, Gain: ₹${gain.toLocaleString('en-IN')})`;
        return response;
    }

    // 2. Transactions / Recent Expenses
    if (lowerMessage.includes('transaction') || lowerMessage.includes('recent expense') || lowerMessage.includes('what did i buy') || lowerMessage.includes('recent spending') || lowerMessage.includes('spent recently')) {
        if (!userData.recentTransactions || userData.recentTransactions.length === 0) {
            return "You have not recorded any transactions yet. Add some expenses in the Expenses tab to view your history!";
        }
        let response = "📝 **Your Recent Transactions:**\n\n";
        userData.recentTransactions.forEach(t => {
            const dateStr = new Date(t.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            response += `• **${dateStr}**: ₹${parseFloat(t.amount).toLocaleString('en-IN')} for *${t.description || 'Imported'}* (${t.category})\n`;
        });
        return response;
    }

    // 3. Spending Analysis / Category Percentages
    if (lowerMessage.includes('spending analysis') || lowerMessage.includes('spending pattern') || lowerMessage.includes('where is my money going') || lowerMessage.includes('analyze my spend') || lowerMessage.includes('category breakdown')) {
        if (totalExpenses === 0) {
            return "You have no recorded expenses this month. Write down some spending in the Expenses tab so I can analyze it!";
        }
        let response = "📊 **Category-wise Spending Breakdown:**\n\n";
        userData.expenses.forEach(cat => {
            const pct = (parseFloat(cat.total) / totalExpenses * 100).toFixed(1);
            response += `• **${cat.category}**: ₹${parseFloat(cat.total).toLocaleString('en-IN')} (${pct}% of total spent)\n`;
        });
        response += `\n**Total spent this month**: ₹${totalExpenses.toLocaleString('en-IN')}`;
        return response;
    }

    // 4. Predictions / Estimates / Future Savings Forecasts
    if (lowerMessage.includes('predict') || lowerMessage.includes('forecast') || lowerMessage.includes('estimate') || lowerMessage.includes('how much will i save') || lowerMessage.includes('future savings') || lowerMessage.includes('in 6 months') || lowerMessage.includes('in 12 months') || lowerMessage.includes('in a year')) {
        if (monthlyIncome === 0) {
            return "Please set your monthly income in your profile so I can project your future savings!";
        }
        const monthlySavings = Math.max(0, monthlyIncome - totalExpenses);
        const save6 = monthlySavings * 6;
        const save12 = monthlySavings * 12;
        return `🔮 **Future Savings Projections:**\n\n` +
               `Based on your current monthly savings of **₹${monthlySavings.toLocaleString('en-IN')}**:\n` +
               `• In **6 months**, you will save **₹${save6.toLocaleString('en-IN')}**.\n` +
               `• In **12 months (1 year)**, you will save **₹${save12.toLocaleString('en-IN')}**.\n\n` +
               `*Note: This assumes your current income and expense habits stay consistent.*`;
    }

    // 5. Financial Health Score / Habits
    if (lowerMessage.includes('health') || lowerMessage.includes('score') || lowerMessage.includes('my habits') || lowerMessage.includes('how healthy')) {
        const score = Math.max(0, Math.min(100, Math.round(100 - (expenseRatio * 0.8) + (userData.goals.length * 5))));
        let response = `🩺 **Your Financial Health Score: ${score}/100**\n\n`;
        if (score > 80) {
            response += "🟢 **Excellent!** You save a lot, manage your category limits well, and have active goals.";
        } else if (score > 50) {
            response += "🟡 **Good, but room for growth.** Try to review your highest spending categories and trim extra costs to boost savings.";
        } else {
            response += "🔴 **High spending alerts.** You spent almost all of your pay. Consider setting smaller budget limits and tracking daily transactions.";
        }
        return response;
    }

    // 6. Total spent this month
    if (lowerMessage.includes('spent this month') || lowerMessage.includes('spend this month') || lowerMessage.includes('my total expense') || lowerMessage.includes('how much did i spend')) {
        if (totalExpenses === 0) {
            return "You have not recorded any spending this month. Add some expenses in the Expenses tab to see your total!";
        }
        return `You spent a total of **₹${totalExpenses.toLocaleString('en-IN')}** this month.`;
    }

    // 7. Monthly Income / Earnings (STRICT MATCH!)
    if (lowerMessage.includes('what is my income') || lowerMessage.includes('my monthly income') || lowerMessage.includes('how much income') || lowerMessage.match(/\b(how much did i earn)\b/)) {
        if (monthlyIncome === 0) {
            return "You have not set your monthly income yet. Please update your monthly income in your profile so I can track it for you.";
        }
        return `Your monthly income is set to **₹${monthlyIncome.toLocaleString('en-IN')}**.`;
    }

    // 8. Net Savings
    if (lowerMessage.includes('how much did i save') || lowerMessage.includes('my savings') || lowerMessage.includes('saved this month')) {
        const currentSavings = monthlyIncome - totalExpenses;
        if (monthlyIncome === 0) {
            return "To see your savings, please add your monthly income in your profile first.";
        }
        if (currentSavings <= 0) {
            return `You spent all of your pay this month and have no savings left. Try to spend less so you can save more.`;
        }
        return `You have saved **₹${currentSavings.toLocaleString('en-IN')}** this month. Keep up the good work!`;
    }

    // 9. Highest spending category
    if (lowerMessage.includes('highest spending') || lowerMessage.includes('biggest expense') || lowerMessage.includes('spent the most') || lowerMessage.includes('largest category') || lowerMessage.includes('highest category')) {
        if (userData.expenses && userData.expenses.length > 0) {
            const topCategory = userData.expenses[0];
            return `Your biggest spending category this month is **${topCategory.category}**, where you spent **₹${parseFloat(topCategory.total).toLocaleString('en-IN')}**.`;
        }
        return "You have not added any expenses yet this month. Write down some spending to see your largest categories.";
    }

    // 10. Specific budget categories
    if (userData.budgets && userData.budgets.length > 0) {
        const matchingBudget = userData.budgets.find(b => lowerMessage.includes(b.name.toLowerCase()));
        if (matchingBudget) {
            const spent = parseFloat(matchingBudget.spent_amount || 0);
            const limit = parseFloat(matchingBudget.allocated_amount || 0);
            if (spent > limit) {
                return `Yes, you crossed your **${matchingBudget.name}** budget! You planned to spend ₹${limit.toLocaleString('en-IN')}, but you spent ₹${spent.toLocaleString('en-IN')} (₹${(spent - limit).toLocaleString('en-IN')} over).`;
            } else {
                return `You have spent **₹${spent.toLocaleString('en-IN')}** of your **₹${limit.toLocaleString('en-IN')}** budget for **${matchingBudget.name}**. You have **₹${(limit - spent).toLocaleString('en-IN')}** left.`;
            }
        }
    }

    // 11. General budgets
    if (lowerMessage.includes('my budget limits') || lowerMessage.includes('my category budgets') || lowerMessage.includes('what are my budgets') || lowerMessage.includes('what is my budget')) {
        if (!userData.budgets || userData.budgets.length === 0) {
            return "You have not set up any category budgets yet. Go to the Budget tab to create some allocations!";
        }
        let response = "📋 **Your Category Budgets:**\n\n";
        userData.budgets.forEach(b => {
            response += `• **${b.name}**: ₹${parseFloat(b.spent_amount).toLocaleString('en-IN')} spent of ₹${parseFloat(b.allocated_amount).toLocaleString('en-IN')} limit.\n`;
        });
        return response;
    }

    // 12. Savings Goals targets
    if (lowerMessage.includes('my goal') || lowerMessage.includes('target') || lowerMessage.includes('my savings goals')) {
        if (!userData.goals || userData.goals.length === 0) {
            return "You have not set any savings goals yet. Go to the Budget tab to set some targets!";
        }
        let response = "🎯 **Your Savings Goals Progress:**\n\n";
        userData.goals.forEach(g => {
            const progress = (parseFloat(g.current_amount) / parseFloat(g.target_amount) * 100).toFixed(1);
            response += `• **${g.name}**: Saved ₹${parseFloat(g.current_amount).toLocaleString('en-IN')} of ₹${parseFloat(g.target_amount).toLocaleString('en-IN')} target (${progress}%).\n`;
        });
        return response;
    }


    // Check for polite patterns first
    for (const [type, patterns] of Object.entries(politePatterns)) {
        if (patterns.some(p => p.test(lowerMessage))) {
            return generatePoliteResponse(type, userData);
        }
    }
    
    // Check for general conversation patterns (normal chatting)
    for (const [category, data] of Object.entries(conversationPatterns)) {
        if (data.patterns.some(pattern => pattern.test(message))) {
            return generateConversationResponse(category, userData);
        }
    }
    
    // Check for greeting patterns
    for (const [timeOfDay, patterns] of Object.entries(greetingPatterns)) {
        if (patterns.some(p => p.test(lowerMessage))) {
            return generateGreeting(timeOfDay, userData);
        }
    }
    
    // Handle help request
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('what do you do')) {
        return generateHelpResponse(userData);
    }
    
    // Detect financial topic from message
    let detectedTopic = null;
    for (const [topic, data] of Object.entries(financialKnowledge)) {
        if (data.keywords.some(kw => lowerMessage.includes(kw))) {
            detectedTopic = { topic, ...data };
            break;
        }
    }
    
    // Generate topic-specific response
    if (detectedTopic) {
        return generateTopicResponse(detectedTopic, userData, expenseRatio, monthlyIncome);
    }
    
    // Default contextual response with AI fallback
    return generateDefaultResponse(userData, monthlyIncome, totalExpenses, expenseRatio, message);
}

function generateConversationResponse(category, userData) {
    const name = userData.user?.name ? ` ${userData.user.name.split(' ')[0]}` : '';
    const responses = conversationPatterns[category].responses;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add personalization and financial context where appropriate
    let response = randomResponse.replace(/\{name\}/g, name);
    
    // Add contextual financial tips based on conversation category
    switch (category) {
        case 'weekend':
            response += `\\n\\n💡 **Weekend Tip**: Take 10 minutes this weekend to look at what you spent, plan your meals, and set a small goal to save.`;
            break;
        case 'food':
            response += `\\n\\n💰 **Food Budget Tip**: Most people spend a big part of their money on food. Cooking at home is a great way to save money every month!`;
            break;
        case 'entertainment':
            response += `\\n\\n📊 **Entertainment Budget**: Remember to save some money for fun, but check your monthly subscriptions and stop the ones you do not use.`;
            break;
        case 'wellbeing':
            response += `\\n\\n🧘 **Money and Peace**: Having a small pile of emergency cash is a great way to feel safe and reduce stress.`;
            break;
    }
    
    return response;
}

function generatePoliteResponse(type, userData) {
    const name = userData.user?.name ? ` ${userData.user.name.split(' ')[0]}` : '';
    
    switch (type) {
        case 'thanks':
            return `You are so welcome${name}! 😊 I am happy to help. I am always here when you need to talk about money, budgeting, or saving. Have a great day!`;
        case 'sorry':
            return `No worries at all${name}! 😊 Never worry about asking questions. Asking is how we learn to manage money better. What would you like to ask next?`;
        case 'bye':
            return `Goodbye${name}! 👋 It was great talking with you. Remember to write down what you spend and keep saving for your goals. Come back whenever you want to chat. Take care! 🌟`;
        case 'compliment':
            return `Thank you so much${name}! 😊 That is so kind. I want to make managing your money easy for you. Let's keep working together to reach your goals. What else can I help you with?`;
        default:
            return `Thank you${name}! 😊 I am always happy to help you with your money questions. What would you like to talk about next?`;
    }
}

function generateGreeting(timeOfDay, userData) {
    const name = userData.user?.name ? ` ${userData.user.name.split(' ')[0]}` : '';
    const hour = new Date().getHours();
    let greeting = 'Hello';
    let wish = '';
    
    // Determine time-based greeting
    if (timeOfDay === 'morning' || (hour >= 5 && hour < 12)) {
        greeting = 'Good morning';
        wish = 'I hope you have a wonderful day ahead! 🌅';
    } else if (timeOfDay === 'afternoon' || (hour >= 12 && hour < 17)) {
        greeting = 'Good afternoon';
        wish = 'Hope your day is going nicely! ☀️';
    } else if (timeOfDay === 'evening' || (hour >= 17 && hour < 21)) {
        greeting = 'Good evening';
        wish = 'I hope you had a nice day! 🌆';
    } else if (timeOfDay === 'night' || hour >= 21) {
        greeting = 'Good night';
        wish = 'Sleep well and have sweet dreams! 🌙';
    } else {
        greeting = 'Hello';
        wish = 'Welcome back! 👋';
    }
    
    let response = `${greeting}${name}! ${wish}\n\n`;
    response += `I'm your AI money helper, and I can help you with:\n\n`;
    response += `💰 **Budgeting** - See where your money goes and spend less\n`;
    response += `📊 **Investing** - Learn how to put your money to work\n`;
    response += `🎯 **Goals** - Plan for a house, school, or growing old\n`;
    response += `🛡️ **Insurance** - Keep your family safe from unexpected bills\n`;
    response += `💳 **Loans** - Find easy ways to pay off what you owe\n`;
    response += `📈 **Tax Saving** - Keep more of your money legally\n`;
    response += `₿ **Crypto & Gold** - Other ways to save and buy\n\n`;
    
    // Add personalized suggestion if data exists
    const monthlyIncome = userData.user?.monthly_income || 0;
    if (monthlyIncome > 0) {
        response += `I see you make ₹${monthlyIncome.toLocaleString('en-IN')} a month. `;
        if (userData.totalExpenses === 0) {
            response += `Try adding what you spend so I can show you how your money behaves!\n\n`;
        } else {
            const savingsPotential = monthlyIncome - userData.totalExpenses;
            response += `You are saving about ₹${savingsPotential.toLocaleString('en-IN')} this month. That is a wonderful start!\n\n`;
        }
    } else {
        response += `💡 **Tip:** Go to your profile and add your monthly income so I can give you better tips!\n\n`;
    }
    
    response += `What would you like to talk about today?`;
    return response;
}

function generateHelpResponse(userData) {
    const name = userData.user?.name ? ` ${userData.user.name.split(' ')[0]}` : '';
    const hasIncome = (userData.user?.monthly_income || 0) > 0;
    const hasExpenses = userData.totalExpenses > 0;
    
    let response = `I am here to help you with any money questions you have${name}! 🤝\n\n`;
    
    response += `**Here are some things we can talk about:**\n\n`;
    response += `💰 **"How much should I save?"**\n`;
    response += `   → Find out how much you should save based on what you earn\n\n`;
    response += `📊 **"Where should I invest?"**\n`;
    response += `   → Learn simple ways to make your savings grow\n\n`;
    response += `🎯 **"How do I save for a house, car, or retirement?"**\n`;
    response += `   → Set simple goals and see what steps to take\n\n`;
    response += `📈 **"How can I pay less tax?"**\n`;
    response += `   → Find easy and legal ways to keep more of your earnings\n\n`;
    response += `🛡️ **"Do I need insurance?"**\n`;
    response += `   → Learn how to protect your family and health\n\n`;
    response += `💳 **"How do I pay off my loans?"**\n`;
    response += `   → Find the best way to get rid of debt quickly\n\n`;
    response += `₿ **"Is crypto or gold good for me?"**\n`;
    response += `   → Look at other places to put your money\n\n`;
    
    if (!hasIncome) {
        response += `⚠️ **To get helper tips, please:**\n`;
        response += `   • Put your monthly pay in your profile\n`;
    }
    if (!hasExpenses) {
        response += `   • Add some of your spending so I can see where it goes\n`;
    }
    if (!hasIncome || !hasExpenses) {
        response += `\n`;
    }
    
    response += `Just ask me anything in normal words. I am here to help you! What would you like to know? 😊`;
    return response;
}

function generateTopicResponse(topic, userData, expenseRatio, monthlyIncome) {
    let response = '';
    
    switch (topic.topic) {
        case 'budgeting':
            if (userData.expenses.length > 0) {
                const topCategory = userData.expenses[0];
                response += `This month, you spent the most on **${topCategory.category}** (₹${topCategory.total.toLocaleString('en-IN')}).\n\n`;
                
                if (expenseRatio > 90) {
                    response += `⚠️ **Watch out:** You spent ${expenseRatio.toFixed(1)}% of your pay. Try to spend less on extra things.\n\n`;
                } else if (expenseRatio < 50) {
                    response += `✅ **Nice!** You only spent ${expenseRatio.toFixed(1)}% of your pay. You have plenty left to save.\n\n`;
                }
            }
            break;
            
        case 'savings':
            if (monthlyIncome > 0) {
                const recommendedSavings = monthlyIncome * 0.2;
                const currentSavings = monthlyIncome - userData.totalExpenses;
                
                response += `Since you make **₹${monthlyIncome.toLocaleString('en-IN')}**, try to save at least **₹${recommendedSavings.toLocaleString('en-IN')}** (this is one-fifth of your pay).\n\n`;
                
                if (currentSavings < recommendedSavings * 0.5) {
                    response += `⚠️ You only have ₹${currentSavings.toLocaleString('en-IN')} left. Try to spend less on extra things.\n\n`;
                } else if (currentSavings >= recommendedSavings) {
                    response += `✅ You are doing great! You have ₹${currentSavings.toLocaleString('en-IN')} ready to save.\n\n`;
                }
            }
            break;
            
        case 'investment':
            if (monthlyIncome > 0) {
                const investableAmount = monthlyIncome * 0.15;
                response += `Based on what you earn, you could start saving **₹${investableAmount.toLocaleString('en-IN')}** every month in a simple plan.\n\n`;
                
                if (userData.goals.length > 0) {
                    response += `📌 **Your Goals:**\n`;
                    userData.goals.forEach(goal => {
                        const progress = (goal.current_amount / goal.target_amount * 100).toFixed(1);
                        response += `• ${goal.name}: ₹${goal.current_amount.toLocaleString('en-IN')} / ₹${goal.target_amount.toLocaleString('en-IN')} (${progress}%)\n`;
                    });
                    response += `\n`;
                }
            }
            break;
            
        case 'debt':
            if (userData.largeExpenses.length > 0) {
                response += `📊 **Your Recent Large Expenses:**\n`;
                userData.largeExpenses.forEach(exp => {
                    response += `• ${exp.description || exp.category}: ₹${exp.amount.toLocaleString('en-IN')}\n`;
                });
                response += `\nIf these are monthly loan bills, try to keep them under 40% of your total pay so you do not get stressed.\n\n`;
            }
            break;
            
        case 'insurance':
            if (monthlyIncome > 0) {
                const suggestedCover = monthlyIncome * 12 * 10;
                response += `With what you make, it is a good idea to have:\n`;
                response += `🛡️ **Life Insurance:** A plan that pays around ₹${(suggestedCover / 100000).toFixed(1)} lakhs to protect your family\n`;
                response += `🏥 **Health Insurance:** A health plan of at least ₹5 lakhs to cover hospital bills\n\n`;
            }
            break;
            
        case 'tax':
            if (monthlyIncome > 0) {
                const annualIncome = monthlyIncome * 12;
                response += `Since you make about ₹${annualIncome.toLocaleString('en-IN')} a year, here are easy ways to pay less tax:\n\n`;
                response += `• Put money in public savings plans or tax-saving funds\n`;
                response += `• Put money in a retirement plan\n`;
                response += `• Buy health insurance\n`;
                response += `• Claim rent savings if you live in a rented house\n\n`;
                
                if (annualIncome > 500000) {
                    response += `💡 You could save around ₹46,800 in tax by using these savings plans.\n\n`;
                }
            }
            break;
    }
    
    // Add relevant tips
    const randomTips = topic.tips.sort(() => 0.5 - Math.random()).slice(0, 2);
    response += `**💡 Tips:**\n`;
    randomTips.forEach((tip, i) => response += `${i + 1}. ${tip}\n`);
    
    // Add follow-up question
    response += `\n**${topic.question}**`;
    
    return response;
}

function generateDefaultResponse(userData, monthlyIncome, totalExpenses, expenseRatio, message) {
    const name = userData.user?.name ? ` ${userData.user.name.split(' ')[0]}` : '';
    let response = `I am here to help you with your money${name}! 🤝\n\n`;
    
    // Check for missing data
    const issues = [];
    if (monthlyIncome === 0) {
        issues.push("You have not added your monthly pay yet");
    }
    if (totalExpenses === 0) {
        issues.push("You have not written down any spending this month");
    }
    if (userData.goals.length === 0) {
        issues.push("You have not set any savings goals yet");
    }
    
    if (issues.length > 0) {
        response += `⚠️ **Setup needed:**\n`;
        issues.forEach(issue => response += `• ${issue}\n`);
        response += `\nPlease finish setting up your profile so I can give you better tips.\n\n`;
    } else {
        // Provide comprehensive financial snapshot
        response += `📊 **Your Financial Snapshot:**\n`;
        response += `• Money Earned This Month: ₹${monthlyIncome.toLocaleString('en-IN')}\n`;
        response += `• Money Spent This Month: ₹${totalExpenses.toLocaleString('en-IN')}\n`;
        response += `• Money Left to Save: ₹${(monthlyIncome - totalExpenses).toLocaleString('en-IN')}\n`;
        response += `• Part of Income Spent: ${expenseRatio.toFixed(1)}%\n\n`;
        
        if (expenseRatio > 90) {
            response += `⚠️ You spent almost all of your pay. Try to make a simple plan to spend less.\n\n`;
        } else if (expenseRatio < 60) {
            response += `✅ Great job saving! You might want to put this extra money into a savings plan.\n\n`;
        } else {
            response += `💡 You are doing well keeping your spending balanced. Keep it up!\n\n`;
        }
    }
    
    // Add contextual suggestions based on message analysis
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('confused') || lowerMessage.includes('don\'t know')) {
        response += `No worries! Managing money can feel hard. Let's start with small, easy steps:\n\n`;
        response += `1. Write down what you spend for two weeks\n`;
        response += `2. Set one small savings goal\n`;
        response += `3. Ask me simple questions whenever you want\n\n`;
        response += `I am here to help you step by step! 🌟`;
    } else if (lowerMessage.includes('lost') || lowerMessage.includes('money')) {
        response += `I know money worries can be stressful. Let's find simple ways to help:\n\n`;
        response += `• Look at what you bought recently to see where you can spend less\n`;
        response += `• Think about extra ways to make a bit of money if you need to\n`;
        response += `• Pay for the most important things first\n\n`;
        response += `Would you like me to look at how you spend your money?`;
    } else {
        response += `**Ask me questions like:**\n`;
        response += `• "How do I start a simple investment?"\n`;
        response += `• "How can I pay less tax?"\n`;
        response += `• "Am I spending too much on food or rent?"\n`;
        response += `• "How do I save for when I grow old?"\n`;
        response += `• "Is gold or crypto good for me?"\n\n`;
        response += `I can understand normal words - just ask me anything you like! 😊`;
    }
    
    return response;
}

module.exports = router;
