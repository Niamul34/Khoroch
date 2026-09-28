// app.js - Main Application Controller for Khoroch
// Student Money Management & Budgeting Application

(function (window) {
  'use strict';

  const { store, roundMoney, formatMoney, getDefaultData } = window.KhorochStore;
  const { renderDonutChart, renderDailyBarChart } = window.KhorochCharts;

  class KhorochApp {
    constructor() {
      this.selectedExpenseCategory = null;
      this.selectedExpenseAccount = null;
      this.selectedIncomeAccount = null;
      this.selectedIncomeSource = 'Monthly Allowance';
      this.pinBuffer = '';
      this.selectedCalendarDate = null;

      this.init();
    }

    init() {
      this.bindEvents();
      this.applySettings();
      this.render();
      store.subscribe(() => this.render());
    }

    // --- Theme & View Mode Settings ---
    applySettings() {
      const settings = store.settings;
      document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
      
      const viewport = document.getElementById('appViewport');
      if (settings.viewMode === 'full-width') {
        viewport.classList.add('full-width-mode');
        document.getElementById('viewModeIcon').textContent = '💻';
      } else {
        viewport.classList.remove('full-width-mode');
        document.getElementById('viewModeIcon').textContent = '📱';
      }

      const currSelect = document.getElementById('selectAppCurrency');
      if (currSelect) currSelect.value = settings.currency || '৳';

      if (settings.pinEnabled && settings.pinHash && settings.pinLocked) {
        document.getElementById('pinLockScreen').style.display = 'flex';
      } else {
        document.getElementById('pinLockScreen').style.display = 'none';
      }
    }

    // --- Bind Event Listeners ---
    bindEvents() {
      // 1. Bottom Navigation Tabs
      document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const tabTarget = btn.getAttribute('data-tab');
          this.switchTab(tabTarget);
        });
      });

      // 2. View Mode & Theme Toggles
      document.getElementById('btnToggleViewMode').addEventListener('click', () => {
        const isFull = store.settings.viewMode === 'full-width';
        const newMode = isFull ? 'mobile-frame' : 'full-width';
        store.saveSettings(Object.assign({}, store.settings, { viewMode: newMode }));
        this.applySettings();
        this.renderCharts();
      });

      document.getElementById('btnToggleTheme').addEventListener('click', () => {
        const newTheme = store.settings.theme === 'dark' ? 'light' : 'dark';
        store.saveSettings(Object.assign({}, store.settings, { theme: newTheme }));
        document.getElementById('themeIcon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
        this.applySettings();
        this.renderCharts();
      });

      // 3. Floating Add Expense Button & Shortcuts
      document.getElementById('btnFloatingAddExpense').addEventListener('click', () => {
        this.openExpenseModal();
      });

      document.getElementById('btnCloseExpenseModal').addEventListener('click', () => {
        this.closeModal('modalAddExpense');
      });

      document.getElementById('formAddExpense').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitAddExpense();
      });

      // 4. Add Income Modal
      document.getElementById('chipAddIncome').addEventListener('click', () => {
        this.openIncomeModal();
      });

      document.getElementById('btnCloseIncomeModal').addEventListener('click', () => {
        this.closeModal('modalAddIncome');
      });

      document.getElementById('formAddIncome').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitAddIncome();
      });

      // 5. "Can I Afford This?" Tool
      const openAfford = () => {
        this.openModal('modalAffordTool');
        this.populateAffordCategorySelect();
      };
      document.getElementById('btnHeaderAfford').addEventListener('click', openAfford);
      document.getElementById('chipAfford').addEventListener('click', openAfford);
      document.getElementById('cardHubAfford').addEventListener('click', openAfford);

      document.getElementById('btnCloseAffordModal').addEventListener('click', () => {
        this.closeModal('modalAffordTool');
      });

      document.getElementById('formAffordSimulator').addEventListener('submit', (e) => {
        e.preventDefault();
        this.runAffordSimulator();
      });

      // 6. Transfer Between Accounts
      const openTransfer = () => {
        this.openTransferModal();
      };
      document.getElementById('chipTransfer').addEventListener('click', openTransfer);
      document.getElementById('btnOpenTransferFromWallets').addEventListener('click', openTransfer);

      document.getElementById('btnCloseTransferModal').addEventListener('click', () => {
        this.closeModal('modalTransfer');
      });

      document.getElementById('formTransfer').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitTransfer();
      });

      // 7. Month Reset & Switcher
      const openMonthReset = () => {
        const input = document.getElementById('newMonthInput');
        input.value = store.data.currentMonth;
        this.openModal('modalMonthReset');
      };
      document.getElementById('btnChangeMonth').addEventListener('click', openMonthReset);
      document.getElementById('chipNewMonth').addEventListener('click', openMonthReset);

      document.getElementById('btnCloseMonthResetModal').addEventListener('click', () => {
        this.closeModal('modalMonthReset');
      });

      document.getElementById('formMonthReset').addEventListener('submit', (e) => {
        e.preventDefault();
        const newMonth = document.getElementById('newMonthInput').value;
        const strategy = document.querySelector('input[name="carryStrategy"]:checked').value;
        store.startNewMonth(newMonth, strategy);
        this.closeModal('modalMonthReset');
        this.showToast(`Switched to month ${newMonth} with ${strategy} carry-over`);
      });

      // 8. Category Management
      document.getElementById('btnOpenNewCategoryModal').addEventListener('click', () => {
        this.openCategoryModal();
      });

      document.getElementById('btnCloseCatModal').addEventListener('click', () => {
        this.closeModal('modalCategory');
      });

      document.getElementById('formCategory').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitCategoryForm();
      });

      document.getElementById('btnDeleteCategory').addEventListener('click', () => {
        const id = document.getElementById('catEditId').value;
        if (id && confirm('Delete this category? Transactions will be preserved under Misc.')) {
          store.deleteCategory(id);
          this.closeModal('modalCategory');
          this.showToast('Category deleted');
        }
      });

      // 9. Savings Goals & Deposit/Withdraw
      document.getElementById('btnOpenNewGoalModal').addEventListener('click', () => {
        document.getElementById('formGoal').reset();
        this.openModal('modalGoal');
      });

      document.getElementById('btnCloseGoalModal').addEventListener('click', () => {
        this.closeModal('modalGoal');
      });

      document.getElementById('formGoal').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitNewGoal();
      });

      document.getElementById('btnCloseDepositModal').addEventListener('click', () => {
        this.closeModal('modalGoalDeposit');
      });

      document.getElementById('formGoalDeposit').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitGoalDeposit();
      });

      document.getElementById('btnDepositEmergency').addEventListener('click', () => {
        const emergency = store.data.savingsGoals.find(g => g.isEmergencyFund);
        if (emergency) this.openDepositModal(emergency.id, 'deposit');
      });

      document.getElementById('btnWithdrawEmergency').addEventListener('click', () => {
        const emergency = store.data.savingsGoals.find(g => g.isEmergencyFund);
        if (emergency) this.openDepositModal(emergency.id, 'withdraw');
      });

      // 10. Bills
      document.getElementById('linkViewAllBills').addEventListener('click', () => {
        this.openAddBillModal();
      });

      document.getElementById('btnCloseBillModal').addEventListener('click', () => {
        this.closeModal('modalAddBill');
      });

      document.getElementById('formAddBill').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitAddBill();
      });

      // 11. More Hub Navigation items
      document.getElementById('cardHubCalendar').addEventListener('click', () => {
        this.openCalendarModal();
      });
      document.getElementById('btnCloseCalendarModal').addEventListener('click', () => {
        this.closeModal('modalCalendarView');
      });

      document.getElementById('cardHubWallets').addEventListener('click', () => {
        this.openWalletsModal();
      });
      document.getElementById('btnCloseWalletsModal').addEventListener('click', () => {
        this.closeModal('modalWalletsView');
      });

      document.getElementById('cardHubSemester').addEventListener('click', () => {
        this.openSemesterModal();
      });
      document.getElementById('btnCloseSemesterModal').addEventListener('click', () => {
        this.closeModal('modalSemesterView');
      });
      document.getElementById('formSemesterConfig').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitSemesterConfig();
      });

      document.getElementById('cardHubReport').addEventListener('click', () => {
        this.openReportModal();
      });
      document.getElementById('cardHubAnalytics').addEventListener('click', () => {
        this.openReportModal();
      });
      document.getElementById('linkViewFullAnalytics').addEventListener('click', () => {
        this.openReportModal();
      });
      document.getElementById('btnCloseReportModal').addEventListener('click', () => {
        this.closeModal('modalReportView');
      });

      document.getElementById('btnPrintReport').addEventListener('click', () => {
        window.print();
      });

      document.getElementById('btnExportReportCSV').addEventListener('click', () => {
        this.triggerCSVDownload();
      });

      document.getElementById('btnExportTxCSV').addEventListener('click', () => {
        this.triggerCSVDownload();
      });

      // 12. Quick Nav link shortcuts
      document.getElementById('linkViewAllBudgets').addEventListener('click', () => {
        this.switchTab('view-budget');
      });
      document.getElementById('linkViewAllTransactions').addEventListener('click', () => {
        this.switchTab('view-transactions');
      });
      document.getElementById('linkViewAllGoals').addEventListener('click', () => {
        this.switchTab('view-goals');
      });

      // 13. Transactions Filter and Search
      const searchInput = document.getElementById('txSearchInput');
      const typeFilter = document.getElementById('txTypeFilter');
      const catFilter = document.getElementById('txCategoryFilter');
      const accFilter = document.getElementById('txAccountFilter');

      [searchInput, typeFilter, catFilter, accFilter].forEach(el => {
        if (el) {
          el.addEventListener('input', () => this.renderTransactionsList());
          el.addEventListener('change', () => this.renderTransactionsList());
        }
      });

      // 14. Monthly Allowance Editing
      document.getElementById('btnEditMonthlyAllowance').addEventListener('click', () => {
        const cur = store.data.baseAllowance;
        const res = prompt('Enter your typical monthly allowance / income:', cur);
        if (res !== null && !isNaN(Number(res)) && Number(res) > 0) {
          store.saveData(Object.assign({}, store.data, { baseAllowance: roundMoney(Number(res)) }));
          this.showToast(`Updated monthly allowance to ${formatMoney(Number(res), store.settings.currency)}`);
        }
      });

      // 15. Settings: Currency
      document.getElementById('selectAppCurrency').addEventListener('change', (e) => {
        store.saveSettings(Object.assign({}, store.settings, { currency: e.target.value }));
        this.showToast(`Currency updated to ${e.target.value}`);
      });

      // 16. Settings: Backup & Restore
      document.getElementById('btnExportJSON').addEventListener('click', () => {
        const json = store.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `khoroch_backup_${store.data.currentMonth}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Backup JSON downloaded');
      });

      document.getElementById('btnImportJSON').addEventListener('click', () => {
        document.getElementById('fileRestoreInput').click();
      });

      document.getElementById('fileRestoreInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const success = store.importJSON(event.target.result);
            if (success) {
              this.showToast('Data restored successfully!');
            } else {
              alert('Failed to parse backup JSON file.');
            }
          };
          reader.readAsText(file);
        }
      });

      // 17. Reload Authentic Student Demo Data
      document.getElementById('btnReloadDemoData').addEventListener('click', () => {
        if (confirm('Reload student demo dataset? This will populate sample transactions, categories, and savings goals.')) {
          store.resetAllData();
          this.showToast('Sample university student dataset loaded!');
        }
      });

      // 18. PIN Lock Security
      document.getElementById('btnConfigurePIN').addEventListener('click', () => {
        const current = store.settings.pinHash;
        if (current) {
          if (confirm('Remove existing PIN protection?')) {
            store.saveSettings(Object.assign({}, store.settings, { pinEnabled: false, pinHash: '', pinLocked: false }));
            this.showToast('PIN security disabled');
          }
        } else {
          const code = prompt('Enter a 4-digit numeric PIN for Khoroch:');
          if (code && code.length === 4 && !isNaN(Number(code))) {
            store.saveSettings(Object.assign({}, store.settings, { pinEnabled: true, pinHash: code, pinLocked: true }));
            this.showToast('PIN security enabled!');
            this.applySettings();
          } else {
            alert('Invalid PIN. Please enter exactly 4 numbers.');
          }
        }
      });

      document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.handlePinKey(key);
        });
      });

      document.getElementById('btnHeaderSettings').addEventListener('click', () => {
        this.switchTab('view-more');
      });

      window.addEventListener('resize', () => {
        this.renderCharts();
      });
    }

    // --- Navigation Switcher ---
    switchTab(tabId) {
      document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
      });
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add('active');
      }

      document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (tabId === 'view-home') {
        setTimeout(() => this.renderCharts(), 50);
      }
    }

    // --- Modal Helpers ---
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    }

    showToast(message, icon = '✅') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }, 2800);
    }

    // --- Main Render Cycle ---
    render() {
      const calc = store.getCalculations();
      const currency = store.settings.currency || '৳';

      // 1. Month display
      const parts = calc.monthKey.split('-');
      const year = parts[0];
      const month = parts[1];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthTitle = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      document.getElementById('headerMonthDisplay').textContent = monthTitle;

      // 2. Health Banner & Status
      const banner = document.getElementById('healthBanner');
      banner.className = `health-banner ${calc.healthStatus}`;
      document.getElementById('healthIcon').textContent = calc.healthStatus === 'good' ? '🟢' : (calc.healthStatus === 'warning' ? '🟡' : '🔴');
      document.getElementById('healthMessage').textContent = calc.healthMessage;

      // 3. Hero Card
      document.getElementById('heroAvailableMoney').textContent = formatMoney(calc.availableToSpend, currency);
      document.getElementById('heroBadge').textContent = calc.healthBadge;
      document.getElementById('heroBadge').className = `afford-badge ${calc.healthStatus === 'good' ? 'badge-green' : (calc.healthStatus === 'warning' ? 'badge-amber' : 'badge-red')}`;

      document.getElementById('heroIncome').textContent = formatMoney(calc.totalIncome, currency);
      document.getElementById('heroSpent').textContent = formatMoney(calc.totalSpent, currency);
      document.getElementById('heroSavings').textContent = formatMoney(calc.protectedSavings, currency);
      document.getElementById('heroReservedBills').textContent = formatMoney(calc.upcomingUnpaidBillsTotal, currency);

      // 4. Safe Daily Limit Card
      document.getElementById('safeDailyLimitVal').textContent = `${formatMoney(calc.safeDailyLimit, currency)}/day`;
      document.getElementById('todaySpentVal').textContent = formatMoney(calc.todaySpent, currency);
      document.getElementById('daysRemainingText').textContent = `${calc.daysRemaining} days remaining`;

      // 5. Category Lists on Home & Budget
      this.renderHomeCategories(calc);
      this.renderBudgetFullCategories(calc);

      // 6. Upcoming Bills
      this.renderUpcomingBills(calc);

      // 7. Recent & Full Transactions
      this.renderRecentTransactions(calc);
      this.renderTransactionsList();

      // 8. Savings Goals
      this.renderSavingsGoals(calc);

      // 9. Budget Planning Screen Totals
      document.getElementById('budgetScreenTotalIncome').textContent = formatMoney(calc.totalIncome, currency);
      document.getElementById('budgetScreenTotalAllocated').textContent = formatMoney(calc.totalAllocatedBudget, currency);
      const allocPercent = calc.totalIncome > 0 ? Math.round((calc.totalAllocatedBudget / calc.totalIncome) * 100) : 0;
      document.getElementById('budgetAllocationFill').style.width = `${Math.min(100, allocPercent)}%`;
      document.getElementById('budgetScreenAllocatedPercent').textContent = `${allocPercent}% Allocated`;

      const unallocText = document.getElementById('budgetScreenUnallocatedText');
      if (calc.unallocatedIncome >= 0) {
        unallocText.textContent = `Unallocated: ${formatMoney(calc.unallocatedIncome, currency)}`;
        unallocText.style.color = 'var(--text-secondary)';
        document.getElementById('unallocatedStrategyCard').style.display = calc.unallocatedIncome > 0 ? 'block' : 'none';
      } else {
        unallocText.textContent = `⚠️ Overallocated by ${formatMoney(Math.abs(calc.unallocatedIncome), currency)}`;
        unallocText.style.color = 'var(--color-red)';
        document.getElementById('unallocatedStrategyCard').style.display = 'none';
      }
      document.getElementById('catCountSpan').textContent = store.data.categories.length;

      // 10. Update Currency text globally
      document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = currency;
      });

      // 11. Render Canvas Charts
      this.renderCharts();
    }

    renderCharts() {
      const calc = store.getCalculations();
      const isDark = store.settings.theme === 'dark';
      const currency = store.settings.currency || '৳';

      const homeDailyCanvas = document.getElementById('homeDailyChart');
      if (homeDailyCanvas) {
        renderDailyBarChart(
          homeDailyCanvas,
          store.data.transactions,
          calc.monthKey,
          calc.safeDailyLimit,
          currency,
          { isDarkMode: isDark }
        );
      }

      const reportDonutCanvas = document.getElementById('reportDonutChart');
      if (reportDonutCanvas) {
        renderDonutChart(reportDonutCanvas, calc.categoryStats, currency, { isDarkMode: isDark });
      }
    }

    renderHomeCategories(calc) {
      const container = document.getElementById('homeCategoryList');
      if (!container) return;

      const sorted = [].concat(calc.categoryStats).sort((a, b) => b.spent - a.spent);
      const topCategories = sorted.slice(0, 4);

      if (topCategories.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0;">No categories setup yet.</div>';
        return;
      }

      container.innerHTML = topCategories.map(cat => {
        const isOver = cat.isOverBudget;
        const barColor = isOver ? '#ef4444' : (cat.percentUsed > 80 ? '#f59e0b' : cat.color || '#6366f1');
        return `
          <div class="category-item" data-cat-id="${cat.id}">
            <div class="cat-top-row">
              <div class="cat-title-group">
                <div class="cat-icon-badge">${cat.icon || '🏷️'}</div>
                <div>
                  <span class="cat-name">${cat.name}</span>
                  ${cat.isEssential ? '<span class="cat-badge-tag essential">Essential</span>' : ''}
                  ${cat.isFixed ? '<span class="cat-badge-tag fixed">Fixed</span>' : ''}
                </div>
              </div>
              <div class="cat-amount-group">
                <div class="cat-spent" style="color: ${isOver ? '#ef4444' : 'inherit'};">
                  ${formatMoney(cat.spent, calc.currency)}
                </div>
                <div class="cat-budget">of ${formatMoney(cat.budget, calc.currency)}</div>
              </div>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${cat.percentUsed}%; background: ${barColor};"></div>
            </div>
            <div class="cat-bottom-row">
              <span>${cat.percentUsed}% spent</span>
              <span>${isOver ? `Over by ${formatMoney(cat.overAmount, calc.currency)}` : `Remaining: ${formatMoney(cat.remaining, calc.currency)}`}</span>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-cat-id');
          this.openCategoryModal(id);
        });
      });
    }

    renderBudgetFullCategories(calc) {
      const container = document.getElementById('budgetCategoryFullList');
      if (!container) return;

      container.innerHTML = calc.categoryStats.map(cat => {
        const isOver = cat.isOverBudget;
        const barColor = isOver ? '#ef4444' : (cat.percentUsed > 80 ? '#f59e0b' : cat.color || '#6366f1');
        return `
          <div class="category-item" data-cat-id="${cat.id}">
            <div class="cat-top-row">
              <div class="cat-title-group">
                <div class="cat-icon-badge">${cat.icon || '🏷️'}</div>
                <div>
                  <span class="cat-name">${cat.name}</span>
                  ${cat.isEssential ? '<span class="cat-badge-tag essential">Essential</span>' : ''}
                  ${cat.isFixed ? '<span class="cat-badge-tag fixed">Fixed</span>' : ''}
                </div>
              </div>
              <div class="cat-amount-group">
                <div class="cat-spent" style="color:${isOver ? '#ef4444' : 'inherit'};">
                  ${formatMoney(cat.spent, calc.currency)} / ${formatMoney(cat.budget, calc.currency)}
                </div>
                <div class="cat-budget">${cat.expenseCount} entries</div>
              </div>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${cat.percentUsed}%; background: ${barColor};"></div>
            </div>
            <div class="cat-bottom-row">
              <span>${cat.percentUsed}% consumed</span>
              <span style="font-weight:600; color:${isOver ? '#ef4444' : 'var(--color-green)'};">
                ${isOver ? `Exceeded: -${formatMoney(cat.overAmount, calc.currency)}` : `Left: ${formatMoney(cat.remaining, calc.currency)}`}
              </span>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-cat-id');
          this.openCategoryModal(id);
        });
      });
    }

    renderUpcomingBills(calc) {
      const container = document.getElementById('homeBillsList');
      if (!container) return;

      const bills = calc.unpaidBills;
      if (bills.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding:12px; text-align:center; font-size:12px; color:var(--text-muted); margin-bottom:8px;">
            🎉 All bills and fixed dues for this month are settled!
          </div>
        `;
        return;
      }

      container.innerHTML = bills.map(b => {
        const cat = store.data.categories.find(c => c.id === b.categoryId);
        return `
          <div class="bill-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:20px;">${cat?.icon || '🔔'}</span>
              <div>
                <div style="font-size:13px; font-weight:700;">${b.title}</div>
                <div style="font-size:11px; color:var(--text-muted);">Due: ${b.dueDate}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; font-weight:800; color:var(--color-amber);">${formatMoney(b.amount, calc.currency)}</div>
              <button class="btn-mini btn-bill-pay" data-bill-id="${b.id}" style="margin-top:2px;">Pay Now</button>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-bill-pay').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const billId = btn.getAttribute('data-bill-id');
          store.toggleBillPaid(billId);
          this.showToast('Bill marked as paid and deducted from account');
        });
      });
    }

    renderRecentTransactions(calc) {
      const container = document.getElementById('homeTransactionsList');
      if (!container) return;

      const recent = store.data.transactions.slice(0, 4);
      if (recent.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0;">No transactions recorded this month.</div>';
        return;
      }

      container.innerHTML = recent.map(t => this.renderTransactionItemHTML(t, calc.currency)).join('');
      this.attachTransactionClickEvents(container);
    }

    renderTransactionsList() {
      const container = document.getElementById('fullTransactionsList');
      if (!container) return;

      const search = (document.getElementById('txSearchInput')?.value || '').toLowerCase().trim();
      const typeFilter = document.getElementById('txTypeFilter')?.value || 'all';
      const catFilter = document.getElementById('txCategoryFilter')?.value || 'all';
      const accFilter = document.getElementById('txAccountFilter')?.value || 'all';
      const currency = store.settings.currency || '৳';

      this.populateFilterDropdowns();

      let filtered = [].concat(store.data.transactions);

      if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
      }
      if (catFilter !== 'all') {
        filtered = filtered.filter(t => t.categoryId === catFilter);
      }
      if (accFilter !== 'all') {
        filtered = filtered.filter(t => t.accountId === accFilter || t.targetAccountId === accFilter);
      }
      if (search) {
        filtered = filtered.filter(t => {
          const note = (t.note || '').toLowerCase();
          const loc = (t.location || '').toLowerCase();
          const cat = store.data.categories.find(c => c.id === t.categoryId)?.name.toLowerCase() || '';
          return note.includes(search) || loc.includes(search) || cat.includes(search);
        });
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="card" style="padding:24px; text-align:center; font-size:13px; color:var(--text-muted);">
            🔍 No transactions match your current filters.
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(t => this.renderTransactionItemHTML(t, currency, true)).join('');
      this.attachTransactionClickEvents(container);
    }

    renderTransactionItemHTML(t, currency, showDelete = false) {
      const cat = store.data.categories.find(c => c.id === t.categoryId);
      const acc = store.data.accounts.find(a => a.id === t.accountId);
      const isExpense = t.type === 'expense';
      const isIncome = t.type === 'income';

      const icon = isIncome ? '💰' : (t.type === 'transfer' ? '🔄' : (cat?.icon || '💸'));
      const sign = isIncome ? '+' : (isExpense ? '-' : '');
      const amountClass = isIncome ? 'income' : (isExpense ? 'expense' : 'transfer');

      return `
        <div class="tx-item" data-tx-id="${t.id}">
          <div class="tx-left">
            <div class="tx-icon">${icon}</div>
            <div class="tx-details">
              <div class="tx-note">${t.note || cat?.name || 'Transaction'}</div>
              <div class="tx-sub">
                <span>${t.date}</span> • <span>${acc?.name || 'Cash'}</span>
                ${t.location ? ` • <span>📍 ${t.location}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="tx-amount ${amountClass}">
              ${sign}${formatMoney(t.amount, currency)}
            </div>
            ${showDelete ? `<button class="btn-mini btn-tx-delete" data-del-id="${t.id}" title="Delete" style="padding:2px 6px;">✕</button>` : ''}
          </div>
        </div>
      `;
    }

    attachTransactionClickEvents(container) {
      container.querySelectorAll('.btn-tx-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-del-id');
          if (confirm('Delete this transaction and restore account balance?')) {
            store.deleteTransaction(id);
            this.showToast('Transaction removed');
          }
        });
      });
    }

    populateFilterDropdowns() {
      const catFilter = document.getElementById('txCategoryFilter');
      const accFilter = document.getElementById('txAccountFilter');

      if (catFilter && catFilter.children.length <= 1) {
        store.data.categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.icon} ${c.name}`;
          catFilter.appendChild(opt);
        });
      }

      if (accFilter && accFilter.children.length <= 1) {
        store.data.accounts.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.id;
          opt.textContent = `${a.icon} ${a.name}`;
          accFilter.appendChild(opt);
        });
      }
    }

    renderSavingsGoals(calc) {
      const homeContainer = document.getElementById('homeGoalsList');
      const fullContainer = document.getElementById('savingsGoalsFullList');
      const currency = calc.currency;

      const emergency = store.data.savingsGoals.find(g => g.isEmergencyFund);
      if (emergency) {
        document.getElementById('emergencyCurrentVal').textContent = formatMoney(emergency.currentAmount, currency);
        document.getElementById('emergencyTargetVal').textContent = formatMoney(emergency.targetAmount, currency);
        const rem = Math.max(0, emergency.targetAmount - emergency.currentAmount);
        document.getElementById('emergencyRemainingText').textContent = `Remaining: ${formatMoney(rem, currency)}`;
        const p = Math.min(100, Math.round((emergency.currentAmount / emergency.targetAmount) * 100));
        document.getElementById('emergencyProgressFill').style.width = `${p}%`;
      }

      const nonEmergencyGoals = store.data.savingsGoals.filter(g => !g.isEmergencyFund);

      const renderGoalCard = (g) => {
        const p = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
        const rem = Math.max(0, g.targetAmount - g.currentAmount);
        return `
          <div class="goal-card" data-goal-id="${g.id}">
            <div class="goal-header">
              <div class="goal-name-box">
                <span class="goal-icon">${g.icon || '🎯'}</span>
                <span class="goal-name">${g.name}</span>
              </div>
              <span class="goal-percent-badge">${p}%</span>
            </div>

            <div class="goal-numbers">
              <div class="goal-current">${formatMoney(g.currentAmount, currency)}</div>
              <div class="goal-target">Target: ${formatMoney(g.targetAmount, currency)}</div>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${p}%; background: ${g.color || 'var(--accent-primary)'};"></div>
            </div>

            <div class="goal-footer">
              <span>Remaining: ${formatMoney(rem, currency)} ${g.targetDate ? `• Due ${g.targetDate}` : ''}</span>
              <div class="goal-actions">
                <button class="btn-mini btn-goal-deposit" data-goal-id="${g.id}">➕ Deposit</button>
                <button class="btn-mini btn-goal-withdraw" data-goal-id="${g.id}">➖ Withdraw</button>
              </div>
            </div>
          </div>
        `;
      };

      if (homeContainer) {
        homeContainer.innerHTML = nonEmergencyGoals.slice(0, 2).map(renderGoalCard).join('');
        this.attachGoalCardEvents(homeContainer);
      }

      if (fullContainer) {
        fullContainer.innerHTML = nonEmergencyGoals.map(renderGoalCard).join('');
        this.attachGoalCardEvents(fullContainer);
      }
    }

    attachGoalCardEvents(container) {
      container.querySelectorAll('.btn-goal-deposit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const goalId = btn.getAttribute('data-goal-id');
          this.openDepositModal(goalId, 'deposit');
        });
      });

      container.querySelectorAll('.btn-goal-withdraw').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const goalId = btn.getAttribute('data-goal-id');
          this.openDepositModal(goalId, 'withdraw');
        });
      });
    }

    openExpenseModal() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('expenseDate').value = today;
      document.getElementById('expenseAmount').value = '';
      document.getElementById('expenseNote').value = '';
      document.getElementById('expenseLocation').value = '';

      const picker = document.getElementById('expenseCategoryPicker');
      picker.innerHTML = store.data.categories.map((c, i) => `
        <div class="cat-picker-item ${i === 0 ? 'selected' : ''}" data-cat-id="${c.id}">
          <span style="font-size:20px;">${c.icon}</span>
          <span class="cat-picker-name">${c.name}</span>
        </div>
      `).join('');

      this.selectedExpenseCategory = store.data.categories[0]?.id;

      picker.querySelectorAll('.cat-picker-item').forEach(item => {
        item.addEventListener('click', () => {
          picker.querySelectorAll('.cat-picker-item').forEach(p => p.classList.remove('selected'));
          item.classList.add('selected');
          this.selectedExpenseCategory = item.getAttribute('data-cat-id');
        });
      });

      const accPicker = document.getElementById('expenseAccountPicker');
      accPicker.innerHTML = store.data.accounts.map((a, i) => `
        <div class="pill-item ${i === 0 ? 'selected' : ''}" data-acc-id="${a.id}">
          <span>${a.icon}</span> <span>${a.name}</span>
        </div>
      `).join('');

      this.selectedExpenseAccount = store.data.accounts[0]?.id;

      accPicker.querySelectorAll('.pill-item').forEach(item => {
        item.addEventListener('click', () => {
          accPicker.querySelectorAll('.pill-item').forEach(p => p.classList.remove('selected'));
          item.classList.add('selected');
          this.selectedExpenseAccount = item.getAttribute('data-acc-id');
        });
      });

      this.openModal('modalAddExpense');
      setTimeout(() => {
        document.getElementById('expenseAmount').focus();
      }, 100);
    }

    submitAddExpense() {
      const amount = Number(document.getElementById('expenseAmount').value);
      if (!amount || amount <= 0) {
        alert('Please enter a valid expense amount');
        return;
      }

      const note = document.getElementById('expenseNote').value.trim();
      const date = document.getElementById('expenseDate').value;
      const location = document.getElementById('expenseLocation').value.trim();
      const isRecurring = document.getElementById('expenseIsRecurring').checked;

      store.addTransaction({
        type: 'expense',
        amount,
        categoryId: this.selectedExpenseCategory || 'cat_other',
        accountId: this.selectedExpenseAccount || store.data.accounts[0]?.id,
        date,
        note,
        location,
        isRecurring,
      });

      this.closeModal('modalAddExpense');
      this.showToast(`Saved expense of ${formatMoney(amount, store.settings.currency)}`);
    }

    openIncomeModal() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('incomeDate').value = today;
      document.getElementById('incomeAmount').value = '';
      document.getElementById('incomeNote').value = '';

      const sourcePicker = document.getElementById('incomeSourcePicker');
      sourcePicker.querySelectorAll('.pill-item').forEach(p => {
        p.addEventListener('click', () => {
          sourcePicker.querySelectorAll('.pill-item').forEach(el => el.classList.remove('selected'));
          p.classList.add('selected');
          this.selectedIncomeSource = p.getAttribute('data-source');
        });
      });

      const accPicker = document.getElementById('incomeAccountPicker');
      accPicker.innerHTML = store.data.accounts.map((a, i) => `
        <div class="pill-item ${i === 0 ? 'selected' : ''}" data-acc-id="${a.id}">
          <span>${a.icon}</span> <span>${a.name}</span>
        </div>
      `).join('');

      this.selectedIncomeAccount = store.data.accounts[0]?.id;

      accPicker.querySelectorAll('.pill-item').forEach(p => {
        p.addEventListener('click', () => {
          accPicker.querySelectorAll('.pill-item').forEach(el => el.classList.remove('selected'));
          p.classList.add('selected');
          this.selectedIncomeAccount = p.getAttribute('data-acc-id');
        });
      });

      this.openModal('modalAddIncome');
    }

    submitAddIncome() {
      const amount = Number(document.getElementById('incomeAmount').value);
      if (!amount || amount <= 0) return;

      const note = document.getElementById('incomeNote').value.trim() || this.selectedIncomeSource;
      const date = document.getElementById('incomeDate').value;

      store.addTransaction({
        type: 'income',
        amount,
        categoryId: 'cat_other',
        accountId: this.selectedIncomeAccount || store.data.accounts[0]?.id,
        date,
        note,
        location: 'Bank / Transfer',
        isRecurring: false,
      });

      this.closeModal('modalAddIncome');
      this.showToast(`Recorded income of ${formatMoney(amount, store.settings.currency)}`);
    }

    populateAffordCategorySelect() {
      const select = document.getElementById('affordCategorySelect');
      select.innerHTML = store.data.categories.map(c => `
        <option value="${c.id}">${c.icon} ${c.name}</option>
      `).join('');
    }

    runAffordSimulator() {
      const title = document.getElementById('affordItemTitle').value.trim() || 'Item';
      const price = Number(document.getElementById('affordItemPrice').value);
      const categoryId = document.getElementById('affordCategorySelect').value;

      if (!price || price <= 0) return;

      const sim = store.canIAfford(title, price, categoryId);

      const box = document.getElementById('affordResultBox');
      box.style.display = 'block';

      document.getElementById('affordResultTitle').textContent = sim.verdictTitle;
      const badge = document.getElementById('affordResultBadge');
      badge.textContent = sim.verdict.toUpperCase();
      badge.className = `afford-badge ${sim.badgeClass}`;

      document.getElementById('affordResultMessage').textContent = sim.verdictMessage;
      document.getElementById('affordDailyComparison').textContent = `${formatMoney(sim.oldDaily, sim.currency)} ➔ ${formatMoney(sim.newDaily, sim.currency)}/day`;
      document.getElementById('affordCatComparison').textContent = `${formatMoney(sim.catRemaining, sim.currency)} ➔ ${formatMoney(sim.newCatRemaining, sim.currency)}`;
    }

    openTransferModal() {
      const srcSelect = document.getElementById('transferSourceSelect');
      const destSelect = document.getElementById('transferDestSelect');

      srcSelect.innerHTML = store.data.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance, store.settings.currency)})</option>`).join('');
      destSelect.innerHTML = store.data.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance, store.settings.currency)})</option>`).join('');

      if (destSelect.options.length > 1) {
        destSelect.selectedIndex = 1;
      }

      document.getElementById('transferAmount').value = '';
      this.openModal('modalTransfer');
    }

    submitTransfer() {
      const amount = Number(document.getElementById('transferAmount').value);
      const src = document.getElementById('transferSourceSelect').value;
      const dest = document.getElementById('transferDestSelect').value;
      const note = document.getElementById('transferNote').value.trim();

      if (src === dest) {
        alert('Source and destination accounts must be different');
        return;
      }
      if (!amount || amount <= 0) return;

      store.transferFunds(src, dest, amount, note);
      this.closeModal('modalTransfer');
      this.showToast(`Transferred ${formatMoney(amount, store.settings.currency)}`);
    }

    openCategoryModal(catId = null) {
      const title = document.getElementById('catModalTitle');
      const delBtn = document.getElementById('btnDeleteCategory');

      if (catId) {
        const cat = store.data.categories.find(c => c.id === catId);
        if (!cat) return;
        title.textContent = `Edit ${cat.name}`;
        document.getElementById('catEditId').value = cat.id;
        document.getElementById('catNameInput').value = cat.name;
        document.getElementById('catIconInput').value = cat.icon || '🏷️';
        document.getElementById('catBudgetInput').value = cat.monthlyBudget || 0;
        document.getElementById('catColorInput').value = cat.color || '#6366f1';
        document.getElementById('catIsEssential').checked = Boolean(cat.isEssential);
        document.getElementById('catIsFixed').checked = Boolean(cat.isFixed);
        delBtn.style.display = 'block';
      } else {
        title.textContent = 'Add Category';
        document.getElementById('catEditId').value = '';
        document.getElementById('formCategory').reset();
        document.getElementById('catColorInput').value = '#6366f1';
        delBtn.style.display = 'none';
      }

      this.openModal('modalCategory');
    }

    submitCategoryForm() {
      const id = document.getElementById('catEditId').value;
      const name = document.getElementById('catNameInput').value.trim();
      const icon = document.getElementById('catIconInput').value.trim() || '🏷️';
      const monthlyBudget = Number(document.getElementById('catBudgetInput').value) || 0;
      const color = document.getElementById('catColorInput').value;
      const isEssential = document.getElementById('catIsEssential').checked;
      const isFixed = document.getElementById('catIsFixed').checked;

      if (id) {
        store.updateCategory(id, { name, icon, monthlyBudget, color, isEssential, isFixed });
        this.showToast('Category updated');
      } else {
        store.addCategory({ name, icon, monthlyBudget, color, isEssential, isFixed });
        this.showToast('Category created');
      }
      this.closeModal('modalCategory');
    }

    openDepositModal(goalId, actionType = 'deposit') {
      const goal = store.data.savingsGoals.find(g => g.id === goalId);
      if (!goal) return;

      document.getElementById('depositGoalId').value = goal.id;
      document.getElementById('depositActionType').value = actionType;
      document.getElementById('depositAmount').value = '';

      const title = document.getElementById('depositModalTitle');
      const label = document.getElementById('depositAccountLabel');
      const btn = document.getElementById('btnConfirmDeposit');

      if (actionType === 'deposit') {
        title.textContent = `Deposit into ${goal.name}`;
        label.textContent = 'From Account / Wallet';
        btn.textContent = 'Deposit Money';
      } else {
        title.textContent = `Withdraw from ${goal.name}`;
        label.textContent = 'Deposit Money Into';
        btn.textContent = 'Withdraw Money';
      }

      const select = document.getElementById('depositAccountSelect');
      select.innerHTML = store.data.accounts.map(a => `
        <option value="${a.id}">${a.icon} ${a.name} (${formatMoney(a.balance, store.settings.currency)})</option>
      `).join('');

      this.openModal('modalGoalDeposit');
    }

    submitGoalDeposit() {
      const goalId = document.getElementById('depositGoalId').value;
      const action = document.getElementById('depositActionType').value;
      const amount = Number(document.getElementById('depositAmount').value);
      const accountId = document.getElementById('depositAccountSelect').value;

      if (!amount || amount <= 0) return;

      if (action === 'deposit') {
        store.depositToSavings(goalId, amount, accountId);
        this.showToast(`Deposited ${formatMoney(amount, store.settings.currency)} to goal`);
      } else {
        store.withdrawFromSavings(goalId, amount, accountId);
        this.showToast(`Withdrew ${formatMoney(amount, store.settings.currency)} from goal`);
      }

      this.closeModal('modalGoalDeposit');
    }

    submitNewGoal() {
      const name = document.getElementById('goalNameInput').value.trim();
      const icon = document.getElementById('goalIconInput').value.trim() || '🎯';
      const targetAmount = Number(document.getElementById('goalTargetInput').value);
      const currentAmount = Number(document.getElementById('goalCurrentInput').value) || 0;
      const targetDate = document.getElementById('goalDateInput').value;
      const notes = document.getElementById('goalNotesInput').value.trim();

      store.addSavingsGoal({
        name,
        icon,
        targetAmount,
        currentAmount,
        targetDate,
        notes,
        isEmergencyFund: false,
      });

      this.closeModal('modalGoal');
      this.showToast('Savings goal created!');
    }

    openAddBillModal() {
      const catSelect = document.getElementById('billCategorySelect');
      catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

      const today = new Date().toISOString().split('T')[0];
      document.getElementById('billDueDateInput').value = today;
      document.getElementById('billTitleInput').value = '';
      document.getElementById('billAmountInput').value = '';

      this.openModal('modalAddBill');
    }

    submitAddBill() {
      const title = document.getElementById('billTitleInput').value.trim();
      const amount = Number(document.getElementById('billAmountInput').value);
      const dueDate = document.getElementById('billDueDateInput').value;
      const categoryId = document.getElementById('billCategorySelect').value;
      const isRecurring = document.getElementById('billIsRecurring').checked;

      if (!amount || amount <= 0) return;

      store.addBill({
        title,
        amount,
        dueDate,
        categoryId,
        isRecurring,
        frequency: 'monthly',
      });

      this.closeModal('modalAddBill');
      this.showToast('Upcoming bill added!');
    }

    openCalendarModal() {
      const calc = store.getCalculations();
      const grid = document.getElementById('calendarDaysGrid');
      grid.innerHTML = '';

      const parts = calc.monthKey.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      const firstDayIndex = new Date(year, month - 1, 1).getDay();
      const totalDays = new Date(year, month, 0).getDate();

      for (let i = 0; i < firstDayIndex; i++) {
        const blank = document.createElement('div');
        grid.appendChild(blank);
      }

      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;

      for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell';
        if (isCurrentMonth && today.getDate() === day) {
          cell.classList.add('today');
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTxs = store.data.transactions.filter(t => t.date === dateStr);
        const dayBills = store.data.bills.filter(b => b.dueDate === dateStr);

        const hasExpense = dayTxs.some(t => t.type === 'expense');
        const hasIncome = dayTxs.some(t => t.type === 'income');
        const hasBill = dayBills.length > 0;

        cell.innerHTML = `
          <span>${day}</span>
          <div style="display:flex; gap:2px;">
            ${hasExpense ? '<span class="cal-dot expense"></span>' : ''}
            ${hasIncome ? '<span class="cal-dot income"></span>' : ''}
            ${hasBill ? '<span class="cal-dot bill"></span>' : ''}
          </div>
        `;

        cell.addEventListener('click', () => {
          grid.querySelectorAll('.cal-day-cell').forEach(c => c.style.borderColor = 'var(--border-subtle)');
          cell.style.borderColor = 'var(--accent-primary)';
          this.inspectCalendarDate(dateStr, dayTxs, dayBills);
        });

        grid.appendChild(cell);
      }

      this.openModal('modalCalendarView');
    }

    inspectCalendarDate(dateStr, txs, bills) {
      const title = document.getElementById('calSelectedDateTitle');
      const container = document.getElementById('calSelectedDateItems');
      title.textContent = `Activity on ${dateStr}`;

      if (txs.length === 0 && bills.length === 0) {
        container.innerHTML = '<div>No expenses, income, or bills recorded on this day.</div>';
        return;
      }

      let html = '';
      if (bills.length > 0) {
        html += '<div style="font-weight:700; margin-bottom:4px; color:var(--color-amber);">Bills & Dues:</div>';
        bills.forEach(b => {
          html += `<div>🔔 ${b.title} — ${formatMoney(b.amount, store.settings.currency)} (${b.isPaid ? 'Paid' : 'Unpaid'})</div>`;
        });
      }

      if (txs.length > 0) {
        html += '<div style="font-weight:700; margin-top:8px; margin-bottom:4px; color:var(--text-primary);">Transactions:</div>';
        txs.forEach(t => {
          const cat = store.data.categories.find(c => c.id === t.categoryId);
          const sign = t.type === 'income' ? '+' : '-';
          html += `<div>${t.type === 'income' ? '💰' : (cat?.icon || '💸')} ${t.note || cat?.name}: ${sign}${formatMoney(t.amount, store.settings.currency)}</div>`;
        });
      }

      container.innerHTML = html;
    }

    openWalletsModal() {
      const container = document.getElementById('walletAccountsList');
      const totalSumEl = document.getElementById('walletTotalSum');
      const calc = store.getCalculations();

      totalSumEl.textContent = formatMoney(calc.totalAccountBalance, calc.currency);

      container.innerHTML = store.data.accounts.map(acc => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:24px;">${acc.icon || '💳'}</span>
            <div>
              <div style="font-size:14px; font-weight:700;">${acc.name}</div>
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">${acc.type}</div>
            </div>
          </div>
          <div style="font-size:16px; font-weight:800; color:var(--color-green);">
            ${formatMoney(acc.balance, calc.currency)}
          </div>
        </div>
      `).join('');

      this.openModal('modalWalletsView');
    }

    openSemesterModal() {
      const sem = store.data.semester || {};
      const currency = store.settings.currency || '৳';

      document.getElementById('semesterNameDisplay').textContent = sem.name || 'Autumn Semester 2026';
      document.getElementById('semesterTotalBudget').textContent = formatMoney(sem.totalBudget || 80000, currency);

      const monthlyAvg = roundMoney((sem.totalBudget || 80000) / (sem.totalMonths || 4));
      document.getElementById('semesterMonthlyAvg').textContent = `${formatMoney(monthlyAvg, currency)}/mo`;

      const totalSpentSem = store.data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const semRemaining = Math.max(0, (sem.totalBudget || 80000) - totalSpentSem);
      const semPercent = Math.min(100, Math.round((totalSpentSem / (sem.totalBudget || 80000)) * 100));

      document.getElementById('semesterSpentText').textContent = `Spent: ${formatMoney(totalSpentSem, currency)}`;
      document.getElementById('semesterRemainingText').textContent = `Remaining: ${formatMoney(semRemaining, currency)}`;
      document.getElementById('semesterProgressFill').style.width = `${semPercent}%`;

      this.openModal('modalSemesterView');
    }

    submitSemesterConfig() {
      const name = document.getElementById('inputSemesterName').value.trim();
      const months = Number(document.getElementById('inputSemesterMonths').value) || 4;
      const budget = Number(document.getElementById('inputSemesterBudget').value) || 80000;

      store.saveData(Object.assign({}, store.data, {
        semester: {
          name,
          totalMonths: months,
          totalBudget: budget,
        }
      }));

      this.closeModal('modalSemesterView');
      this.showToast('Semester plan updated!');
    }

    openReportModal() {
      const calc = store.getCalculations();
      const currency = calc.currency;

      document.getElementById('reportIncomeVal').textContent = formatMoney(calc.totalIncome, currency);
      document.getElementById('reportSpentVal').textContent = formatMoney(calc.totalSpent, currency);
      document.getElementById('reportSurplusVal').textContent = formatMoney(calc.expectedSurplus, currency);

      const table = document.getElementById('reportCategoryBreakdownTable');
      table.innerHTML = calc.categoryStats.filter(c => c.spent > 0).map(c => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-subtle);">
          <span>${c.icon} ${c.name}</span>
          <span style="font-weight:700;">${formatMoney(c.spent, currency)} (${c.percentUsed}%)</span>
        </div>
      `).join('') || '<div style="color:var(--text-muted);">No spending recorded yet.</div>';

      const insightsList = document.getElementById('reportInsightsList');
      insightsList.innerHTML = calc.insights.map(i => `<li>${i}</li>`).join('');

      this.openModal('modalReportView');
      setTimeout(() => {
        this.renderCharts();
      }, 100);
    }

    handlePinKey(key) {
      if (key === 'clear') {
        this.pinBuffer = '';
      } else if (key === 'backspace') {
        this.pinBuffer = this.pinBuffer.slice(0, -1);
      } else if (this.pinBuffer.length < 4) {
        this.pinBuffer += key;
      }

      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`pindot-${i}`);
        if (dot) {
          if (i <= this.pinBuffer.length) dot.classList.add('filled');
          else dot.classList.remove('filled');
        }
      }

      if (this.pinBuffer.length === 4) {
        if (this.pinBuffer === store.settings.pinHash) {
          document.getElementById('pinLockScreen').style.display = 'none';
          store.saveSettings(Object.assign({}, store.settings, { pinLocked: false }));
          this.pinBuffer = '';
          this.showToast('Unlocked!');
        } else {
          alert('Incorrect PIN code. Try again.');
          this.pinBuffer = '';
          for (let i = 1; i <= 4; i++) {
            document.getElementById(`pindot-${i}`)?.classList.remove('filled');
          }
        }
      }
    }

    triggerCSVDownload() {
      const csvContent = store.exportCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `khoroch_transactions_${store.data.currentMonth}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      this.showToast('Transactions exported to CSV!');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.app = new KhorochApp();
  });

})(window);
