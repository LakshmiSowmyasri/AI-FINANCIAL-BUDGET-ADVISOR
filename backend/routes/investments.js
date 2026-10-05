const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
// SIP plans data (mock data with real Indian market options)
const sipPlans = [
    {
        name: 'Axis Bluechip Fund',
        category: 'Large Cap Equity',
        returns: '12-15%',
        riskLevel: 'medium',
        minInvestment: 500,
        description: 'Invest in very big, well-known companies that grow slowly and steadily.',
        fundHouse: 'Axis Mutual Fund'
    },
    {
        name: 'Mirae Asset Emerging Bluechip',
        category: 'Large & Mid Cap',
        returns: '14-18%',
        riskLevel: 'medium-high',
        minInvestment: 1000,
        description: 'Invest in a mix of big and medium companies for good, steady growth.',
        fundHouse: 'Mirae Asset'
    },
    {
        name: 'SBI Small Cap Fund',
        category: 'Small Cap Equity',
        returns: '15-20%',
        riskLevel: 'high',
        minInvestment: 500,
        description: 'Invest in new, small companies to try and grow your money faster. This can be risky.',
        fundHouse: 'SBI Mutual Fund'
    },
    {
        name: 'HDFC Balanced Advantage',
        category: 'Hybrid Fund',
        returns: '10-12%',
        riskLevel: 'low-medium',
        minInvestment: 500,
        description: 'Spread your money automatically between stocks and safer savings for balanced growth.',
        fundHouse: 'HDFC Mutual Fund'
    },
    {
        name: 'PPF (Public Provident Fund)',
        category: 'Government Savings',
        returns: '7.1%',
        riskLevel: 'low',
        minInvestment: 500,
        description: 'A safe savings plan run by the government where you do not pay any tax on your savings.',
        fundHouse: 'Government of India'
    },
    {
        name: 'NPS Tier 1',
        category: 'Retirement Planning',
        returns: '9-12%',
        riskLevel: 'low-medium',
        minInvestment: 1000,
        description: 'A simple retirement savings plan with tax savings to help you save for when you grow old.',
        fundHouse: 'PFRDA'
    }
];

// Insurance plans data
const insurancePlans = [
    {
        name: 'Term Life Insurance - HDFC Click2Protect',
        type: 'Term Insurance',
        coverage: '1 Crore',
        premium: '12,000/year',
        benefits: 'High protection for your family at a low cost, plus tax savings.',
        provider: 'HDFC Life'
    },
    {
        name: 'Health Insurance - Star Family Health Optima',
        type: 'Health Insurance',
        coverage: '5 Lakhs',
        premium: '15,000/year',
        benefits: 'Covers hospital bills for the whole family without you needing to pay cash first.',
        provider: 'Star Health'
    },
    {
        name: 'ULIP - ICICI Pru Signature',
        type: 'Investment + Insurance',
        coverage: 'Variable',
        premium: '50,000/year',
        benefits: 'A mix of investing and life insurance where you can take money out if you need it.',
        provider: 'ICICI Prudential'
    },
    {
        name: 'Endowment Plan - LIC New Jeevan Anand',
        type: 'Savings + Insurance',
        coverage: '5 Lakhs',
        premium: '30,000/year',
        benefits: 'Safe savings that pay you back for sure, with life insurance that keeps going.',
        provider: 'LIC of India'
    }
];


// Get personalized investment suggestions
router.get('/suggestions', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        
        // Get user profile data
        const [userData] = await pool.query(
            'SELECT monthly_income, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        const monthlyIncome = userData[0]?.monthly_income || 0;
        const accountAge = new Date() - new Date(userData[0]?.created_at || new Date());
        const monthsActive = Math.max(1, Math.floor(accountAge / (1000 * 60 * 60 * 24 * 30)));

        // Get spending patterns
        const [expenseData] = await pool.query(`
            SELECT SUM(amount) as total_expenses 
            FROM expenses 
            WHERE user_id = ? 
            AND expense_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
        `, [req.user.id]);

        const avgMonthlyExpense = (expenseData[0]?.total_expenses || 0) / 3;
        const disposableIncome = Math.max(0, monthlyIncome - avgMonthlyExpense);
        // Calculate risk profile
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - avgMonthlyExpense) / monthlyIncome * 100) : 0;
        let riskProfile = 'conservative';
        if (savingsRate > 30) riskProfile = 'aggressive';
        else if (savingsRate > 15) riskProfile = 'moderate';

        const recommendedMonthlyInvestment = disposableIncome * 0.3;

        // Get user category budgets and spending
        const [categories] = await pool.query(
            'SELECT name, allocated_amount, spent_amount FROM budget_categories WHERE user_id = ?',
            [req.user.id]
        );

        const reasoning = [];
        
        // 1. Income and general status
        if (monthlyIncome > 0) {
            reasoning.push(`You make ₹${monthlyIncome.toLocaleString('en-IN')} a month. Try to save at least ₹${(monthlyIncome * 0.2).toLocaleString('en-IN')} (one-fifth of your pay) to keep your future safe.`);
        } else {
            reasoning.push("You have not set your monthly income yet. Go to your profile to set it so we can give you better advice.");
        }

        // 2. Spending comparison
        if (monthlyIncome > 0) {
            const totalSpent = categories.reduce((acc, curr) => acc + parseFloat(curr.spent_amount || 0), 0);
            const spentPercent = (totalSpent / monthlyIncome) * 100;
            reasoning.push(`This month, you spent ₹${totalSpent.toLocaleString('en-IN')}, which is ${spentPercent.toFixed(0)}% of what you earn.`);
            
            if (spentPercent > 90) {
                reasoning.push("You spent almost all your money this month. Try to cut down on extra things next month.");
            } else if (spentPercent < 50 && totalSpent > 0) {
                reasoning.push("Great job! You spent less than half of your income. You can put this extra savings into your investment plans.");
            }
        }

        // 3. Category analysis (overspent or high spending)
        let overspentCategories = [];
        let highestCategory = null;
        let maxSpent = 0;

        categories.forEach(cat => {
            const allocated = parseFloat(cat.allocated_amount || 0);
            const spent = parseFloat(cat.spent_amount || 0);
            if (spent > maxSpent) {
                maxSpent = spent;
                highestCategory = cat;
            }
            if (allocated > 0 && spent > allocated) {
                overspentCategories.push(cat.name);
            }
        });

        if (overspentCategories.length > 0) {
            reasoning.push(`You spent too much in these areas: ${overspentCategories.join(', ')}. Try to lower your spending there.`);
        }

        if (highestCategory && maxSpent > 0) {
            reasoning.push(`Your biggest expense was on "${highestCategory.name}" at ₹${maxSpent.toLocaleString('en-IN')}. See if you can spend a bit less on it.`);
        }

        // 4. Budget limits vs income
        const totalBudget = categories.reduce((acc, curr) => acc + parseFloat(curr.allocated_amount || 0), 0);
        if (monthlyIncome > 0 && totalBudget > monthlyIncome) {
            reasoning.push(`The total money you planned to spend (₹${totalBudget.toLocaleString('en-IN')}) is more than your monthly pay (₹${monthlyIncome.toLocaleString('en-IN')}). Try to lower your budget limits.`);
        }

        // Fallback or default advice if we need more
        if (reasoning.length < 3) {
            reasoning.push("Set up a simple budget for different categories to help track your money better.");
            reasoning.push("Try to save money automatically on the day you get paid to build your wealth.");
        }

        // Mapped recommendations for frontend
        const suitableSIPs = sipPlans.filter(sip => {
            if (riskProfile === 'conservative' && sip.riskLevel === 'low') return true;
            if (riskProfile === 'moderate' && ['low', 'low-medium', 'medium'].includes(sip.riskLevel)) return true;
            if (riskProfile === 'aggressive') return true;
            return false;
        }).filter(sip => sip.minInvestment <= recommendedMonthlyInvestment);

        const topRecommendations = suitableSIPs.map((sip, index) => {
            const recommendedAmount = Math.max(sip.minInvestment, Math.floor(recommendedMonthlyInvestment / suitableSIPs.length / 100) * 100);
            
            // Horizon
            let horizon = '3-5 years';
            if (sip.riskLevel === 'high') horizon = '5+ years';
            else if (sip.riskLevel === 'low') horizon = '1-3 years';

            // Tax benefits
            const isTaxSaving = sip.name.includes('PPF') || sip.name.includes('NPS') || sip.category.includes('Tax');
            const lockIn = sip.name.includes('PPF') ? 15 : (sip.name.includes('NPS') ? 10 : 0);

            // Mock ML score
            const mlScore = 0.95 - (index * 0.04);

            return {
                id: `sip-${index}`,
                name: sip.name,
                category: sip.category,
                returns: sip.returns,
                riskLevel: sip.riskLevel,
                minInvestment: sip.minInvestment,
                recommendedAmount: recommendedAmount,
                fundHouse: sip.fundHouse,
                horizon: horizon,
                whyRecommended: sip.description,
                description: sip.description,
                taxBenefit: isTaxSaving,
                lockIn: lockIn,
                mlScore: mlScore,
                type: 'sip'
            };
        });

        const suggestions = {
            riskProfile,
            monthlyIncome,
            disposableIncome,
            savingsRate: parseFloat(savingsRate.toFixed(1)),
            recommendedMonthlyInvestment,
            reasoning,
            topRecommendations,
            sipRecommendations: topRecommendations, // keep it for database store
            insuranceRecommendations: []
        };

        // Store suggestions in database
        for (const sip of suggestions.sipRecommendations) {
            await pool.query(
                `INSERT INTO investment_suggestions (id, user_id, type, name, description, expected_returns, risk_level, min_investment, recommended_amount) 
                 VALUES (?, ?, 'sip', ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 expected_returns = VALUES(expected_returns), 
                 recommended_amount = VALUES(recommended_amount)`,
                [uuidv4(), req.user.id, sip.name, sip.whyRecommended, sip.returns, sip.riskLevel, sip.minInvestment, sip.recommendedAmount]
            );
        }

        res.json({ suggestions });
    } catch (error) {
        console.error('Get investment suggestions error:', error);
        res.status(500).json({ error: 'Failed to get investment suggestions' });
    }
});

// Get user's saved investment interests
router.get('/saved', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        const [investments] = await pool.query(
            `SELECT id, type, name, description, expected_returns, risk_level, recommended_amount, created_at
             FROM investment_suggestions 
             WHERE user_id = ? AND is_active = TRUE
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ investments });
    } catch (error) {
        console.error('Get saved investments error:', error);
        res.status(500).json({ error: 'Failed to get saved investments' });
    }
});

// Calculate investment returns
router.post('/calculate-returns', authenticate, (req, res) => {
    try {
        const { principal, monthlyContribution, years, expectedReturn } = req.body;
        
        const r = expectedReturn / 100 / 12; // Monthly rate
        const n = years * 12; // Total months
        
        // Future value of lumpsum
        const lumpsumFV = principal * Math.pow(1 + expectedReturn / 100, years);
        
        // Future value of SIP (monthly)
        const sipFV = monthlyContribution * (Math.pow(1 + r, n) - 1) / r * (1 + r);
        
        const totalInvestment = principal + (monthlyContribution * n);
        const totalReturns = lumpsumFV + sipFV - totalInvestment;

        res.json({
            totalInvestment,
            totalReturns: Math.round(totalReturns),
            maturityAmount: Math.round(lumpsumFV + sipFV),
            wealthGained: Math.round(totalReturns)
        });
    } catch (error) {
        console.error('Calculate returns error:', error);
        res.status(500).json({ error: 'Failed to calculate returns' });
    }
});

router.get('/portfolio', authenticate, async (req, res) => {
    try {
        const pool = getPool();
        // Fetch user active investments
        const [investments] = await pool.query(
            'SELECT * FROM investments WHERE user_id = ? AND is_active = TRUE ORDER BY created_at DESC',
            [req.user.id]
        );

        let totalInvested = 0;
        let totalCurrentValue = 0;

        investments.forEach(inv => {
            totalInvested += parseFloat(inv.invested_amount || 0);
            totalCurrentValue += parseFloat(inv.current_value || 0);
        });

        const totalGain = totalCurrentValue - totalInvested;
        const gainPercent = totalInvested > 0 ? parseFloat(((totalGain / totalInvested) * 100).toFixed(2)) : 0;
        const totalInvestments = investments.length;

        res.json({
            investments,
            summary: {
                totalInvested,
                totalCurrentValue,
                totalGain,
                gainPercent,
                totalInvestments
            }
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Failed to get portfolio data' });
    }
});

router.post('/add', authenticate, async (req, res) => {
    try {
        const { type, name, investedAmount, monthlyAmount = 0, notes } = req.body;
        if (!name || !investedAmount) {
            return res.status(400).json({ error: 'Name and invested amount are required' });
        }

        const pool = getPool();
        const id = uuidv4();
        
        let riskLevel = 'medium';
        if (type === 'ppf' || type === 'fd') riskLevel = 'low';
        else if (type === 'crypto') riskLevel = 'high';
        
        await pool.query(
            `INSERT INTO investments (id, user_id, type, name, invested_amount, current_value, monthly_sip_amount, risk_level, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.id, type, name, parseFloat(investedAmount), parseFloat(investedAmount), parseFloat(monthlyAmount), riskLevel, notes || null]
        );

        res.status(201).json({ success: true, message: 'Investment added successfully', id });
    } catch (error) {
        console.error('Add investment error:', error);
        res.status(500).json({ error: 'Failed to add investment' });
    }
});

router.post('/calculate-sip', authenticate, (req, res) => {
    try {
        const { monthlyAmount, years, expectedReturn, lumpsum = 0 } = req.body;

        const P = parseFloat(monthlyAmount || 0);
        const y = parseFloat(years || 0);
        const r = parseFloat(expectedReturn || 0);
        const L = parseFloat(lumpsum || 0);

        const i = r / 100 / 12; // Monthly interest rate
        const n = y * 12; // Total number of months

        const lumpsumFV = L * Math.pow(1 + r / 100, y);

        let sipFV = 0;
        if (i > 0) {
            sipFV = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        } else {
            sipFV = P * n;
        }

        const totalInvested = L + (P * n);
        const maturityAmount = Math.round(lumpsumFV + sipFV);
        const wealthGained = Math.max(0, maturityAmount - totalInvested);

        const realValueAdjusted = Math.round(maturityAmount / Math.pow(1 + 0.06, y));

        const breakdown = [];
        for (let t = 1; t <= y; t++) {
            const months = t * 12;
            const yearLumpsumFV = L * Math.pow(1 + r / 100, t);
            let yearSipFV = 0;
            if (i > 0) {
                yearSipFV = P * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
            } else {
                yearSipFV = P * months;
            }

            breakdown.push({
                year: t,
                invested: Math.round(L + (P * months)),
                value: Math.round(yearLumpsumFV + yearSipFV)
            });
        }

        res.json({
            totalInvested,
            maturityAmount,
            wealthGained,
            realValueAdjusted,
            breakdown
        });
    } catch (error) {
        console.error('Calculate SIP error:', error);
        res.status(500).json({ error: 'Failed to calculate SIP' });
    }
});

// POST /api/investments/simulate-plan - Simulated Asset Allocation & Wealth Trajectory
router.post('/simulate-plan', authenticate, (req, res) => {
    try {
        const {
            riskProfile = 'moderate',
            monthlyInvestment = 10000,
            durationYears = 5,
            goal,
            financialGoal
        } = req.body;

        const targetGoal = goal || financialGoal || 'Wealth Creation';
        const monthly = Math.max(500, parseFloat(monthlyInvestment) || 10000);
        const years = Math.min(30, Math.max(1, parseInt(durationYears) || 5));
        const normalizedRisk = ['conservative', 'moderate', 'aggressive'].includes(String(riskProfile).toLowerCase())
            ? String(riskProfile).toLowerCase()
            : 'moderate';

        let allocationWeights;
        let blendedReturnRate;

        if (normalizedRisk === 'conservative') {
            blendedReturnRate = 8.8;
            allocationWeights = [
                { category: 'Fixed-Income Instruments', percentage: 35, cagr: '7.5%', color: '#0D9488', instruments: 'PPF, Bank FDs, Sovereign Debt' },
                { category: 'Index Funds', percentage: 20, cagr: '12.0%', color: '#059669', instruments: 'Nifty 50, Sensex Index' },
                { category: 'Mutual Funds', percentage: 20, cagr: '10.5%', color: '#8B5CF6', instruments: 'Balanced Advantage, Hybrid Funds' },
                { category: 'Gold', percentage: 15, cagr: '9.0%', color: '#D97706', instruments: 'Sovereign Gold Bonds, Digital Gold' },
                { category: 'Emergency Savings', percentage: 10, cagr: '5.5%', color: '#2DD4BF', instruments: 'Liquid Mutual Funds, High-Yield Savings' }
            ];
        } else if (normalizedRisk === 'aggressive') {
            blendedReturnRate = 14.1;
            allocationWeights = [
                { category: 'Index Funds', percentage: 50, cagr: '14.0%', color: '#059669', instruments: 'Nifty 50, Nifty Next 50, MidCap Index' },
                { category: 'Mutual Funds', percentage: 30, cagr: '16.0%', color: '#8B5CF6', instruments: 'Active Flexi-Cap, Focused Equity' },
                { category: 'Fixed-Income Instruments', percentage: 10, cagr: '7.5%', color: '#0D9488', instruments: 'Target Maturity Debt, Corporate Bonds' },
                { category: 'Gold', percentage: 5, cagr: '9.0%', color: '#D97706', instruments: 'SGB, Gold ETFs' },
                { category: 'Emergency Savings', percentage: 5, cagr: '5.5%', color: '#2DD4BF', instruments: 'Overnight / Liquid Funds' }
            ];
        } else {
            blendedReturnRate = 11.5;
            allocationWeights = [
                { category: 'Index Funds', percentage: 35, cagr: '12.5%', color: '#059669', instruments: 'Nifty 50, Broad Market ETF' },
                { category: 'Mutual Funds', percentage: 25, cagr: '13.0%', color: '#8B5CF6', instruments: 'Large & Mid Cap, Flexi Cap Funds' },
                { category: 'Fixed-Income Instruments', percentage: 20, cagr: '7.5%', color: '#0D9488', instruments: 'PPF, NPS Tier-1 Debt' },
                { category: 'Gold', percentage: 10, cagr: '9.0%', color: '#D97706', instruments: 'Sovereign Gold Bonds' },
                { category: 'Emergency Savings', percentage: 10, cagr: '5.5%', color: '#2DD4BF', instruments: 'Liquid Savings, Arbitrage Funds' }
            ];
        }

        const allocation = allocationWeights.map(a => ({
            ...a,
            name: a.category,
            monthlyShare: Math.round((monthly * a.percentage) / 100),
            monthlyAmount: Math.round((monthly * a.percentage) / 100),
            percentage: a.percentage,
            color: a.color
        }));

        const r = (blendedReturnRate / 100) / 12;
        const totalMonths = years * 12;
        const totalInvested = Math.round(monthly * totalMonths);
        const simulatedWealth = Math.round(monthly * ((Math.pow(1 + r, totalMonths) - 1) / r) * (1 + r));
        const wealthGained = simulatedWealth - totalInvested;
        const expectedAnnualReturn = Number(blendedReturnRate.toFixed(1));

        const trajectory = [];
        for (let y = 1; y <= years; y++) {
            const m = y * 12;
            const yInvested = Math.round(monthly * m);
            const yValue = Math.round(monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r));
            trajectory.push({
                year: y,
                label: `Year ${y}`,
                invested: yInvested,
                projectedValue: yValue,
                estimatedValue: yValue,
                gain: yValue - yInvested
            });
        }

        const response = {
            success: true,
            riskProfile: normalizedRisk,
            risk: normalizedRisk,
            monthlyInvestment: monthly,
            durationYears: years,
            goal: targetGoal,
            financialGoal: targetGoal,
            totalInvested,
            estimatedFutureValue: simulatedWealth,
            simulatedWealth,
            estimatedGain: wealthGained,
            wealthGained,
            blendedReturnRate: expectedAnnualReturn,
            expectedAnnualReturn,
            assetAllocation: allocation,
            allocation,
            trajectory,
            disclaimer: 'Investment projections are simulated estimates based on historical asset class performance and are not guaranteed returns. Past performance does not guarantee future results.'
        };

        res.json({
            ...response,
            plan: response
        });
    } catch (err) {
        console.error('Simulate plan error:', err);
        res.status(500).json({ error: 'Failed to simulate investment plan' });
    }
});

module.exports = router;
