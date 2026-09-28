// store.js - Core State Management & Financial Calculation Engine
// Built for Student Money Management & Budgeting

(function (window) {
  'use strict';

  const STORAGE_KEY = 'khoroch_student_finance_v1';
  const SETTINGS_KEY = 'khoroch_student_settings_v1';

  // Decimal-safe rounding utility (prevents floating-point precision errors)
  function roundMoney(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  function formatMoney(amount, currency = '৳') {
    const num = roundMoney(amount);
    const formatted = Math.abs(num).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    if (num < 0) {
      return `-${currency}${formatted}`;
    }
    return `${currency}${formatted}`;
  }

  // Default initial state representing realistic university student life
  function getDefaultData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${year}-${month}`;

    // Default Categories specifically tailored for university student life
    const categories = [
      { id: 'cat_rent', name: 'House Rent', icon: '🏠', color: '#6366f1', monthlyBudget: 6000, isEssential: true, isFixed: true, sortOrder: 1 },
      { id: 'cat_dining', name: 'Hall Dining', icon: '🍛', color: '#f59e0b', monthlyBudget: 5000, isEssential: true, isFixed: false, sortOrder: 2 },
      { id: 'cat_workout', name: 'Workout & Nutrition', icon: '🥗', color: '#10b981', monthlyBudget: 2500, isEssential: false, isFixed: false, sortOrder: 3 },
      { id: 'cat_transport', name: 'Transportation', icon: '🚌', color: '#06b6d4', monthlyBudget: 2000, isEssential: true, isFixed: false, sortOrder: 4 },
      { id: 'cat_food', name: 'Food & Snacks', icon: '🍔', color: '#ec4899', monthlyBudget: 1500, isEssential: false, isFixed: false, sortOrder: 5 },
      { id: 'cat_internet', name: 'Mobile & Internet', icon: '📶', color: '#8b5cf6', monthlyBudget: 500, isEssential: true, isFixed: true, sortOrder: 6 },
      { id: 'cat_education', name: 'Books & Printing', icon: '📚', color: '#3b82f6', monthlyBudget: 1000, isEssential: true, isFixed: false, sortOrder: 7 },
      { id: 'cat_entertainment', name: 'Entertainment & Outings', icon: '🎬', color: '#f43f5e', monthlyBudget: 1000, isEssential: false, isFixed: false, sortOrder: 8 },
      { id: 'cat_savings', name: 'Protected Savings', icon: '💰', color: '#14b8a6', monthlyBudget: 2000, isEssential: true, isFixed: true, sortOrder: 9 },
      { id: 'cat_other', name: 'Personal & Misc', icon: '✨', color: '#64748b', monthlyBudget: 500, isEssential: false, isFixed: false, sortOrder: 10 },
    ];

    // Default Wallets / Accounts matching prompt specification
    const accounts = [
      { id: 'acc_cash', name: 'Cash in Hand', type: 'cash', balance: 1500, color: '#10b981', icon: '💵' },
      { id: 'acc_bkash', name: 'bKash Wallet', type: 'mobile', balance: 1200, color: '#d946ef', icon: '📱' },
      { id: 'acc_nagad', name: 'Nagad Wallet', type: 'mobile', balance: 800, color: '#f97316', icon: '📲' },
      { id: 'acc_bank', name: 'Student Bank Account', type: 'bank', balance: 5000, color: '#3b82f6', icon: '🏦' },
    ];

    // Default Savings Goals & Emergency Fund
    const savingsGoals = [
      {
        id: 'goal_laptop',
        name: 'New Coding Laptop',
        targetAmount: 80000,
        currentAmount: 35000,
        targetDate: '2026-12-31',
        icon: '💻',
        color: '#6366f1',
        notes: 'Need 16GB RAM for programming & university coursework'
      },
      {
        id: 'goal_emergency',
        name: 'Emergency Fund',
        targetAmount: 15000,
        currentAmount: 8500,
        targetDate: '2026-11-30',
        icon: '🛡️',
        color: '#10b981',
        isEmergencyFund: true,
        notes: 'Kept untouched for unexpected medical or urgent travel'
      },
      {
        id: 'goal_semester',
        name: 'Semester Exam Fees',
        targetAmount: 20000,
        currentAmount: 12000,
        targetDate: '2026-10-25',
        icon: '🎓',
        color: '#f59e0b',
        notes: 'University registration & lab dues'
      },
      {
        id: 'goal_tour',
        name: 'Semester Break Tour',
        targetAmount: 15000,
        currentAmount: 4000,
        targetDate: '2026-12-20',
        icon: '🏖️',
        color: '#ec4899',
        notes: 'Trip to Sajek / Cox Bazar'
      }
    ];

    // Default Upcoming Bills / Fixed commitments
    const bills = [
      { id: 'bill_1', title: 'Mess / House Rent', amount: 6000, dueDate: `${year}-${month}-05`, categoryId: 'cat_rent', isPaid: true, paidDate: `${year}-${month}-03` },
      { id: 'bill_2', title: 'Hall Dining Fee Token', amount: 3200, dueDate: `${year}-${month}-10`, categoryId: 'cat_dining', isPaid: true, paidDate: `${year}-${month}-10` },
      { id: 'bill_3', title: 'WiFi Broadband Bill', amount: 500, dueDate: `${year}-${month}-25`, categoryId: 'cat_internet', isPaid: false, isRecurring: true, frequency: 'monthly' },
      { id: 'bill_4', title: 'Monthly Gym / Workout', amount: 1000, dueDate: `${year}-${month}-28`, categoryId: 'cat_workout', isPaid: false, isRecurring: true, frequency: 'monthly' },
    ];

    // Realistic transactions matching the prompt's examples:
    // Hall Dining: ৳3,200 spent (৳1,800 rem), House Rent: ৳6,000 (৳0 rem), Workout: ৳1,750 (৳750 rem), Transport: ৳1,200 (৳800 rem), Entertainment: ৳650 (৳350 rem)
    const transactions = [
      { id: 'tx_inc_1', type: 'income', amount: 20000, categoryId: 'cat_other', accountId: 'acc_bank', date: `${year}-${month}-01`, note: 'Monthly Allowance from Parents', location: 'Family', isRecurring: true },
      { id: 'tx_exp_1', type: 'expense', amount: 6000, categoryId: 'cat_rent', accountId: 'acc_bank', date: `${year}-${month}-03`, note: 'Mess Room Rent (September)', location: 'Dorm', isRecurring: true },
      { id: 'tx_exp_2', type: 'expense', amount: 3200, categoryId: 'cat_dining', accountId: 'acc_bkash', date: `${year}-${month}-10`, note: 'Hall Dining 1st Half Meal Coupons', location: 'Hall Canteen' },
      { id: 'tx_exp_3', type: 'expense', amount: 1200, categoryId: 'cat_transport', accountId: 'acc_cash', date: `${year}-${month}-12`, note: 'Campus Bus Pass & Rickshaw Fare', location: 'Campus Gate' },
      { id: 'tx_exp_4', type: 'expense', amount: 1000, categoryId: 'cat_workout', accountId: 'acc_nagad', date: `${year}-${month}-14`, note: 'Eggs, Bananas & Protein snack supply', location: 'Grocery' },
      { id: 'tx_exp_5', type: 'expense', amount: 750, categoryId: 'cat_workout', accountId: 'acc_cash', date: `${year}-${month}-15`, note: 'Gym Monthly Pass dues', location: 'Campus Gym' },
      { id: 'tx_exp_6', type: 'expense', amount: 650, categoryId: 'cat_entertainment', accountId: 'acc_bkash', date: `${year}-${month}-16`, note: 'Movie ticket & Snacks with dorm mates', location: 'Cinema Hall' },
      { id: 'tx_exp_7', type: 'expense', amount: 180, categoryId: 'cat_food', accountId: 'acc_cash', date: `${year}-${month}-18`, note: 'Lunch (TSC Canteen)', location: 'TSC' },
      { id: 'tx_exp_8', type: 'expense', amount: 60, categoryId: 'cat_transport', accountId: 'acc_cash', date: `${year}-${month}-20`, note: 'Rickshaw to Nilkhet', location: 'Nilkhet' },
      { id: 'tx_exp_9', type: 'expense', amount: 450, categoryId: 'cat_education', accountId: 'acc_cash', date: `${year}-${month}-22`, note: 'Algorithms Assignment printouts & Lab notebook', location: 'Nilkhet' },
    ];

    // Semester Plan
    const semester = {
      name: 'Autumn Semester 2026',
      startDate: `${year}-08-01`,
      endDate: `${year}-11-30`,
      totalMonths: 4,
      totalBudget: 80000,
      notes: 'Managing ৳20,000 per month across 4 academic months'
    };

    return {
      version: 1,
      currentMonth: currentMonthKey,
      baseAllowance: 20000,
      categories,
      accounts,
      savingsGoals,
      bills,
      transactions,
      semester,
      unallocatedPreference: 'flexible',
      carryOverPreference: 'carry',
    };
  }

  function getDefaultSettings() {
    return {
      currency: '৳',
      theme: 'dark',
      pinEnabled: false,
      pinHash: '',
      pinLocked: false,
      notificationsEnabled: true,
      viewMode: 'mobile-frame',
      onboardingCompleted: true,
      widgetOrder: [
        'balance_card',
        'safe_daily_limit',
        'budget_overview',
        'recent_transactions',
        'savings_preview',
        'upcoming_bills',
        'spending_chart'
      ]
    };
  }

  class Store {
    constructor() {
      this.data = this.loadData();
      this.settings = this.loadSettings();
      this.listeners = [];
    }

    loadData() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!parsed.currentMonth) {
            const now = new Date();
            parsed.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          }
          return parsed;
        }
      } catch (e) {
        console.error('Error loading data from localStorage', e);
      }
      const def = getDefaultData();
      this.saveData(def);
      return def;
    }

    saveData(data = this.data) {
      this.data = data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Error saving data to localStorage', e);
      }
      this.notify();
    }

    loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) return Object.assign({}, getDefaultSettings(), JSON.parse(raw));
      } catch (e) {
        console.error('Error loading settings', e);
      }
      return getDefaultSettings();
    }

    saveSettings(settings = this.settings) {
      this.settings = settings;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error('Error saving settings', e);
      }
      this.notify();
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      for (const listener of this.listeners) {
        try {
          listener(this.data, this.settings);
        } catch (err) {
          console.error('Listener callback error', err);
        }
      }
    }

    resetAllData() {
      const def = getDefaultData();
      this.saveData(def);
      const set = getDefaultSettings();
      this.saveSettings(set);
    }

    // --- Calculations Engine ---
    getCalculations(monthKey = this.data.currentMonth) {
      const currency = this.settings.currency || '৳';
      const categories = this.data.categories || [];
      const transactions = (this.data.transactions || []).filter(t => t.date && t.date.startsWith(monthKey));
      const bills = (this.data.bills || []).filter(b => b.dueDate && b.dueDate.startsWith(monthKey));
      const accounts = this.data.accounts || [];

      // 1. Total Income
      const incomeTransactions = transactions.filter(t => t.type === 'income');
      const incomeTxSum = incomeTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const totalIncome = roundMoney(incomeTxSum > 0 ? incomeTxSum : this.data.baseAllowance);

      // 2. Budget Allocation
      const totalAllocatedBudget = roundMoney(categories.reduce((acc, c) => acc + (Number(c.monthlyBudget) || 0), 0));
      const unallocatedIncome = roundMoney(totalIncome - totalAllocatedBudget);

      // 3. Actual Expenses & Category Breakdown
      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      const totalSpent = roundMoney(expenseTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0));

      // Per category calculation
      const categoryStats = categories.map(cat => {
        const catExpenses = expenseTransactions.filter(t => t.categoryId === cat.id);
        const spent = roundMoney(catExpenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0));
        const budget = roundMoney(Number(cat.monthlyBudget) || 0);
        const remaining = roundMoney(budget - spent);
        const percentUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : (spent > 0 ? 100 : 0);
        const isOverBudget = spent > budget && budget > 0;
        const overAmount = isOverBudget ? roundMoney(spent - budget) : 0;

        return Object.assign({}, cat, {
          spent,
          budget,
          remaining,
          percentUsed,
          isOverBudget,
          overAmount,
          expenseCount: catExpenses.length,
        });
      });

      // 4. Savings allocations & protected reserves
      const savingsCat = categories.find(c => c.id === 'cat_savings');
      const protectedSavings = roundMoney(savingsCat ? (savingsCat.monthlyBudget || 0) : 0);
      const totalSavingsGoalsCurrent = roundMoney((this.data.savingsGoals || []).reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0));
      const emergencyGoal = (this.data.savingsGoals || []).find(g => g.isEmergencyFund);
      const emergencyFundCurrent = roundMoney(emergencyGoal ? emergencyGoal.currentAmount : 0);
      const emergencyFundTarget = roundMoney(emergencyGoal ? emergencyGoal.targetAmount : 0);

      // 5. Total Remaining & Available to Spend
      const totalRemaining = roundMoney(totalIncome - totalSpent);
      const unpaidBills = bills.filter(b => !b.isPaid);
      const upcomingUnpaidBillsTotal = roundMoney(unpaidBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0));
      const availableToSpend = roundMoney(Math.max(0, totalRemaining - protectedSavings - upcomingUnpaidBillsTotal));

      // 6. Time Metrics for current month
      const parts = monthKey.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const daysInMonth = new Date(year, month, 0).getDate();

      const today = new Date();
      const isCurrentActiveMonth = (today.getFullYear() === year && (today.getMonth() + 1) === month);
      
      let currentDayNumber = isCurrentActiveMonth ? today.getDate() : daysInMonth;
      let daysPassed = currentDayNumber;
      let daysRemaining = Math.max(1, daysInMonth - daysPassed);

      // 7. Spending Speeds & Safe Daily Spending Limit
      const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDayNumber).padStart(2, '0')}`;
      const todayExpenses = expenseTransactions.filter(t => t.date === todayStr);
      const todaySpent = roundMoney(todayExpenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0));
      const averageDailySpending = roundMoney(totalSpent / Math.max(1, daysPassed));

      const safeDailyLimit = roundMoney(availableToSpend / daysRemaining);

      // 8. Health Status & Insights
      let healthStatus = 'good';
      let healthMessage = `You're on track. You have ${formatMoney(availableToSpend, currency)} usable spending money remaining for the next ${daysRemaining} days.`;
      let healthBadge = '🟢 On Track';

      const projectedMonthEndSpent = roundMoney(totalSpent + (averageDailySpending * daysRemaining));
      const expectedSurplus = roundMoney(totalIncome - projectedMonthEndSpent);

      if (totalRemaining <= 0 || availableToSpend <= 0) {
        healthStatus = 'danger';
        healthBadge = '🔴 Critical';
        healthMessage = `Warning: At your current spending rate, your money may run out before the end of the month!`;
      } else if (projectedMonthEndSpent > totalIncome) {
        healthStatus = 'warning';
        healthBadge = '🟡 Watch Pace';
        healthMessage = `Spending is slightly above your planned pace. Average spending is ${formatMoney(averageDailySpending, currency)}/day.`;
      } else if (todaySpent > safeDailyLimit * 1.5 && safeDailyLimit > 0) {
        healthStatus = 'warning';
        healthBadge = '🟡 Watch Out';
        healthMessage = `Today's spending (${formatMoney(todaySpent, currency)}) is higher than your safe daily limit of ${formatMoney(safeDailyLimit, currency)}.`;
      }

      const totalAccountBalance = roundMoney(accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0));

      const insights = [];
      const highestSpendingCat = [].concat(categoryStats).sort((a, b) => b.spent - a.spent)[0];
      if (highestSpendingCat && highestSpendingCat.spent > 0) {
        insights.push(`Your highest spending category is ${highestSpendingCat.name} at ${formatMoney(highestSpendingCat.spent, currency)} (${highestSpendingCat.percentUsed}% of budget).`);
      }

      const overBudgetCats = categoryStats.filter(c => c.isOverBudget);
      if (overBudgetCats.length > 0) {
        insights.push(`You have exceeded budget in ${overBudgetCats.length} categor${overBudgetCats.length > 1 ? 'ies' : 'y'}: ${overBudgetCats.map(c => c.name).join(', ')}.`);
      } else {
        insights.push(`All your spending categories are currently within their planned budget.`);
      }

      if (expectedSurplus > 0) {
        insights.push(`If you maintain your current pace, you are projected to finish with ${formatMoney(expectedSurplus, currency)} surplus!`);
      }

      return {
        monthKey,
        year,
        month,
        daysInMonth,
        daysPassed,
        daysRemaining,
        currency,
        totalIncome,
        totalAllocatedBudget,
        unallocatedIncome,
        totalSpent,
        totalRemaining,
        protectedSavings,
        upcomingUnpaidBillsTotal,
        availableToSpend,
        todaySpent,
        averageDailySpending,
        safeDailyLimit,
        projectedMonthEndSpent,
        expectedSurplus,
        healthStatus,
        healthBadge,
        healthMessage,
        categoryStats,
        unpaidBills,
        totalAccountBalance,
        totalSavingsGoalsCurrent,
        emergencyFundCurrent,
        emergencyFundTarget,
        insights,
      };
    }

    // --- Action Handlers ---
    addTransaction(tx) {
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: tx.type || 'expense',
        amount: roundMoney(tx.amount),
        categoryId: tx.categoryId || 'cat_other',
        accountId: tx.accountId || 'acc_cash',
        targetAccountId: tx.targetAccountId || null,
        date: tx.date || new Date().toISOString().split('T')[0],
        note: tx.note || '',
        location: tx.location || '',
        isRecurring: Boolean(tx.isRecurring),
        recurringFrequency: tx.recurringFrequency || 'monthly',
        timestamp: Date.now(),
      };

      const accounts = [].concat(this.data.accounts);
      if (newTx.type === 'expense') {
        const acc = accounts.find(a => a.id === newTx.accountId);
        if (acc) acc.balance = roundMoney(acc.balance - newTx.amount);
      } else if (newTx.type === 'income') {
        const acc = accounts.find(a => a.id === newTx.accountId);
        if (acc) acc.balance = roundMoney(acc.balance + newTx.amount);
      } else if (newTx.type === 'transfer' && newTx.targetAccountId) {
        const srcAcc = accounts.find(a => a.id === newTx.accountId);
        const destAcc = accounts.find(a => a.id === newTx.targetAccountId);
        if (srcAcc) srcAcc.balance = roundMoney(srcAcc.balance - newTx.amount);
        if (destAcc) destAcc.balance = roundMoney(destAcc.balance + newTx.amount);
      }

      const transactions = [newTx].concat(this.data.transactions);
      this.saveData(Object.assign({}, this.data, { accounts, transactions }));
      return newTx;
    }

    deleteTransaction(id) {
      const tx = this.data.transactions.find(t => t.id === id);
      if (!tx) return;

      const accounts = [].concat(this.data.accounts);
      if (tx.type === 'expense') {
        const acc = accounts.find(a => a.id === tx.accountId);
        if (acc) acc.balance = roundMoney(acc.balance + tx.amount);
      } else if (tx.type === 'income') {
        const acc = accounts.find(a => a.id === tx.accountId);
        if (acc) acc.balance = roundMoney(acc.balance - tx.amount);
      } else if (tx.type === 'transfer' && tx.targetAccountId) {
        const srcAcc = accounts.find(a => a.id === tx.accountId);
        const destAcc = accounts.find(a => a.id === tx.targetAccountId);
        if (srcAcc) srcAcc.balance = roundMoney(srcAcc.balance + tx.amount);
        if (destAcc) destAcc.balance = roundMoney(destAcc.balance - tx.amount);
      }

      const transactions = this.data.transactions.filter(t => t.id !== id);
      this.saveData(Object.assign({}, this.data, { accounts, transactions }));
    }

    addCategory(category) {
      const newCat = {
        id: 'cat_' + Date.now(),
        name: category.name || 'New Category',
        icon: category.icon || '🏷️',
        color: category.color || '#3b82f6',
        monthlyBudget: roundMoney(category.monthlyBudget || 0),
        isEssential: Boolean(category.isEssential),
        isFixed: Boolean(category.isFixed),
        sortOrder: (this.data.categories.length || 0) + 1,
      };
      this.saveData(Object.assign({}, this.data, {
        categories: this.data.categories.concat([newCat]),
      }));
      return newCat;
    }

    updateCategory(id, updates) {
      const categories = this.data.categories.map(c => {
        if (c.id === id) {
          return Object.assign({}, c, updates, {
            monthlyBudget: updates.monthlyBudget !== undefined ? roundMoney(updates.monthlyBudget) : c.monthlyBudget,
          });
        }
        return c;
      });
      this.saveData(Object.assign({}, this.data, { categories }));
    }

    deleteCategory(id) {
      const categories = this.data.categories.filter(c => c.id !== id);
      const transactions = this.data.transactions.map(t => {
        if (t.categoryId === id) return Object.assign({}, t, { categoryId: 'cat_other' });
        return t;
      });
      this.saveData(Object.assign({}, this.data, { categories, transactions }));
    }

    addSavingsGoal(goal) {
      const newGoal = {
        id: 'goal_' + Date.now(),
        name: goal.name,
        targetAmount: roundMoney(goal.targetAmount),
        currentAmount: roundMoney(goal.currentAmount || 0),
        targetDate: goal.targetDate || '',
        icon: goal.icon || '🎯',
        color: goal.color || '#10b981',
        isEmergencyFund: Boolean(goal.isEmergencyFund),
        notes: goal.notes || '',
      };
      this.saveData(Object.assign({}, this.data, {
        savingsGoals: this.data.savingsGoals.concat([newGoal]),
      }));
      return newGoal;
    }

    depositToSavings(goalId, amount, accountId) {
      const num = roundMoney(amount);
      if (num <= 0) return;

      const goals = this.data.savingsGoals.map(g => {
        if (g.id === goalId) {
          return Object.assign({}, g, { currentAmount: roundMoney(g.currentAmount + num) });
        }
        return g;
      });

      const accounts = this.data.accounts.map(a => {
        if (a.id === accountId) {
          return Object.assign({}, a, { balance: roundMoney(a.balance - num) });
        }
        return a;
      });

      const goal = this.data.savingsGoals.find(g => g.id === goalId);
      const newTx = {
        id: 'tx_sav_' + Date.now(),
        type: 'expense',
        amount: num,
        categoryId: 'cat_savings',
        accountId: accountId,
        date: new Date().toISOString().split('T')[0],
        note: `Deposit to Goal: ${goal ? goal.name : 'Savings'}`,
        location: 'Savings Vault',
        isRecurring: false,
      };

      this.saveData(Object.assign({}, this.data, {
        savingsGoals: goals,
        accounts,
        transactions: [newTx].concat(this.data.transactions),
      }));
    }

    withdrawFromSavings(goalId, amount, accountId) {
      const num = roundMoney(amount);
      if (num <= 0) return;

      const goals = this.data.savingsGoals.map(g => {
        if (g.id === goalId) {
          return Object.assign({}, g, { currentAmount: roundMoney(Math.max(0, g.currentAmount - num)) });
        }
        return g;
      });

      const accounts = this.data.accounts.map(a => {
        if (a.id === accountId) {
          return Object.assign({}, a, { balance: roundMoney(a.balance + num) });
        }
        return a;
      });

      const goal = this.data.savingsGoals.find(g => g.id === goalId);
      const newTx = {
        id: 'tx_sav_wd_' + Date.now(),
        type: 'income',
        amount: num,
        categoryId: 'cat_other',
        accountId: accountId,
        date: new Date().toISOString().split('T')[0],
        note: `Withdrawal from Goal: ${goal ? goal.name : 'Savings'}`,
        location: 'Savings Vault',
        isRecurring: false,
      };

      this.saveData(Object.assign({}, this.data, {
        savingsGoals: goals,
        accounts,
        transactions: [newTx].concat(this.data.transactions),
      }));
    }

    toggleBillPaid(billId, accountId = 'acc_bank') {
      const bill = this.data.bills.find(b => b.id === billId);
      if (!bill) return;

      const isNowPaid = !bill.isPaid;
      const bills = this.data.bills.map(b => {
        if (b.id === billId) {
          return Object.assign({}, b, {
            isPaid: isNowPaid,
            paidDate: isNowPaid ? new Date().toISOString().split('T')[0] : null,
          });
        }
        return b;
      });

      let transactions = [].concat(this.data.transactions);
      let accounts = [].concat(this.data.accounts);

      if (isNowPaid) {
        const newTx = {
          id: 'tx_bill_' + bill.id + '_' + Date.now(),
          type: 'expense',
          amount: bill.amount,
          categoryId: bill.categoryId || 'cat_other',
          accountId: accountId,
          date: new Date().toISOString().split('T')[0],
          note: `Bill Paid: ${bill.title}`,
          location: 'Online / Bank',
          isRecurring: Boolean(bill.isRecurring),
        };
        transactions.unshift(newTx);

        const acc = accounts.find(a => a.id === accountId);
        if (acc) acc.balance = roundMoney(acc.balance - bill.amount);
      }

      this.saveData(Object.assign({}, this.data, { bills, transactions, accounts }));
    }

    addBill(bill) {
      const newBill = {
        id: 'bill_' + Date.now(),
        title: bill.title,
        amount: roundMoney(bill.amount),
        dueDate: bill.dueDate,
        categoryId: bill.categoryId || 'cat_other',
        isPaid: false,
        isRecurring: Boolean(bill.isRecurring),
        frequency: bill.frequency || 'monthly',
      };
      this.saveData(Object.assign({}, this.data, { bills: this.data.bills.concat([newBill]) }));
      return newBill;
    }

    transferFunds(sourceAccountId, destAccountId, amount, note = 'Wallet Transfer') {
      const num = roundMoney(amount);
      if (num <= 0) return;
      this.addTransaction({
        type: 'transfer',
        amount: num,
        accountId: sourceAccountId,
        targetAccountId: destAccountId,
        date: new Date().toISOString().split('T')[0],
        note: note,
        categoryId: 'cat_other',
      });
    }

    startNewMonth(newMonthKey, carryOverStrategy = 'carry') {
      const prevCalc = this.getCalculations(this.data.currentMonth);
      const unspentMoney = prevCalc.totalRemaining;

      if (unspentMoney > 0 && carryOverStrategy === 'savings') {
        const goal = this.data.savingsGoals.find(g => g.isEmergencyFund) || this.data.savingsGoals[0];
        if (goal) {
          goal.currentAmount = roundMoney(goal.currentAmount + unspentMoney);
        }
      }

      const parts = newMonthKey.split('-');
      const ny = parts[0];
      const nm = parts[1];
      const newBills = this.data.bills
        .filter(b => b.isRecurring)
        .map(b => {
          const oldDay = b.dueDate.split('-')[2] || '01';
          return Object.assign({}, b, {
            id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
            dueDate: `${ny}-${nm}-${oldDay}`,
            isPaid: false,
            paidDate: null,
          });
        });

      const newAllowanceTx = {
        id: 'tx_allowance_' + newMonthKey,
        type: 'income',
        amount: this.data.baseAllowance,
        categoryId: 'cat_other',
        accountId: this.data.accounts[0]?.id || 'acc_bank',
        date: `${newMonthKey}-01`,
        note: 'Monthly Allowance from Parents',
        location: 'Bank / Family',
        isRecurring: true,
      };

      this.saveData(Object.assign({}, this.data, {
        currentMonth: newMonthKey,
        bills: this.data.bills.concat(newBills),
        transactions: [newAllowanceTx].concat(this.data.transactions),
      }));
    }

    canIAfford(itemTitle, itemAmount, categoryId) {
      const calc = this.getCalculations();
      const price = roundMoney(itemAmount);
      const category = this.data.categories.find(c => c.id === categoryId);
      const catStat = calc.categoryStats.find(c => c.id === categoryId);

      const oldUsable = calc.availableToSpend;
      const newUsable = roundMoney(oldUsable - price);
      const oldDaily = calc.safeDailyLimit;
      const newDaily = roundMoney(Math.max(0, newUsable / Math.max(1, calc.daysRemaining)));
      const dailyDrop = roundMoney(oldDaily - newDaily);

      const catBudget = catStat ? catStat.budget : 0;
      const catRemaining = catStat ? catStat.remaining : 0;
      const newCatRemaining = roundMoney(catRemaining - price);

      let verdict = 'within';
      let verdictTitle = 'Within Discretionary Budget';
      let verdictMessage = `This expense fits comfortably inside your available spending pool.`;
      let badgeClass = 'badge-green';

      if (price > oldUsable) {
        verdict = 'unaffordable';
        verdictTitle = 'Over Available Usable Money';
        verdictMessage = `You only have ${formatMoney(oldUsable, calc.currency)} usable money left. Buying this would eat into protected savings or upcoming rent/bills!`;
        badgeClass = 'badge-red';
      } else if (newDaily < 100 && oldDaily >= 100) {
        verdict = 'caution';
        verdictTitle = 'Severe Daily Budget Impact';
        verdictMessage = `This purchase drops your safe daily allowance from ${formatMoney(oldDaily, calc.currency)} to ${formatMoney(newDaily, calc.currency)}/day for the next ${calc.daysRemaining} days.`;
        badgeClass = 'badge-red';
      } else if (newCatRemaining < 0 && catBudget > 0) {
        verdict = 'impact';
        verdictTitle = 'Exceeds Category Budget';
        verdictMessage = `You will overshoot your ${category?.name || 'category'} budget by ${formatMoney(Math.abs(newCatRemaining), calc.currency)}, but you still have enough general liquidity.`;
        badgeClass = 'badge-amber';
      } else if (dailyDrop > 0) {
        verdict = 'impact';
        verdictTitle = 'Budget Impact Preview';
        verdictMessage = `This expense reduces your safe daily spending allowance from ${formatMoney(oldDaily, calc.currency)} to ${formatMoney(newDaily, calc.currency)}/day.`;
        badgeClass = 'badge-blue';
      }

      return {
        price,
        itemTitle,
        categoryName: category?.name || 'General',
        oldUsable,
        newUsable,
        oldDaily,
        newDaily,
        dailyDrop,
        catRemaining,
        newCatRemaining,
        daysRemaining: calc.daysRemaining,
        verdict,
        verdictTitle,
        verdictMessage,
        badgeClass,
        currency: calc.currency,
      };
    }

    exportCSV() {
      const transactions = this.data.transactions || [];
      const catMap = Object.fromEntries(this.data.categories.map(c => [c.id, c.name]));
      const accMap = Object.fromEntries(this.data.accounts.map(a => [a.id, a.name]));

      const headers = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note', 'Location'];
      const rows = transactions.map(t => [
        `"${t.date || ''}"`,
        `"${t.type || ''}"`,
        `"${(catMap[t.categoryId] || t.categoryId || '').replace(/"/g, '""')}"`,
        `"${(accMap[t.accountId] || t.accountId || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        `"${(t.location || '').replace(/"/g, '""')}"`,
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    exportJSON() {
      return JSON.stringify({
        data: this.data,
        settings: this.settings,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }

    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.data) {
          this.saveData(parsed.data);
        }
        if (parsed.settings) {
          this.saveSettings(parsed.settings);
        }
        return true;
      } catch (e) {
        console.error('Failed to import JSON backup', e);
        return false;
      }
    }
  }

  const store = new Store();

  // Export to window for direct script loading
  window.KhorochStore = {
    store,
    roundMoney,
    formatMoney,
    getDefaultData,
    getDefaultSettings,
  };

})(window);
