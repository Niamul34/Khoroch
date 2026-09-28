// charts.js - Native high-DPI Canvas & SVG Data Visualization
// Clean, interactive, zero-dependency charts for student financial analytics

(function (window) {
  'use strict';

  const formatMoney = (window.KhorochStore && window.KhorochStore.formatMoney) || function(v, c='৳') { return `${c}${v}`; };

  /**
   * Render a high-DPI Interactive Donut Chart for Category Spending Breakdown
   */
  function renderDonutChart(canvasEl, categoryStats, currency = '৳', options = {}) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvasEl.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 220;

    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.78;
    const innerRadius = radius * 0.58;

    const activeSlices = categoryStats.filter(c => c.spent > 0);
    const totalSpent = activeSlices.reduce((sum, c) => sum + c.spent, 0);

    ctx.clearRect(0, 0, width, height);

    if (totalSpent === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px system-ui, sans-serif';
      ctx.fillText('No expenses yet', centerX, centerY);
      return;
    }

    let startAngle = -Math.PI / 2;

    activeSlices.forEach(slice => {
      const sliceAngle = (slice.spent / totalSpent) * (2 * Math.PI);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = slice.color || '#6366f1';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = options.isDarkMode ? '#0f172a' : '#ffffff';
      ctx.stroke();

      startAngle = endAngle;
    });

    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = options.isDarkMode ? '#94a3b8' : '#64748b';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('TOTAL SPENT', centerX, centerY - 12);

    ctx.fillStyle = options.isDarkMode ? '#f8fafc' : '#0f172a';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(formatMoney(totalSpent, currency), centerX, centerY + 8);
  }

  /**
   * Render Daily Spending Bar Chart with Safe Daily Limit guideline
   */
  function renderDailyBarChart(canvasEl, transactions, currentMonthKey, safeDailyLimit = 0, currency = '৳', options = {}) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvasEl.getBoundingClientRect();
    const width = rect.width || 340;
    const height = rect.height || 150;

    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    ctx.scale(dpr, dpr);

    const parts = currentMonthKey.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyTotals = Array(daysInMonth).fill(0);
    const monthPrefix = `${parts[0]}-${parts[1]}`;

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(monthPrefix)) {
        const dayNum = parseInt(t.date.split('-')[2], 10);
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          dailyTotals[dayNum - 1] += Number(t.amount) || 0;
        }
      }
    });

    const maxDaily = Math.max(...dailyTotals, safeDailyLimit * 1.4, 500);

    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 32;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 22;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Grid lines
    ctx.strokeStyle = options.isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft + chartWidth, paddingTop);
    ctx.moveTo(paddingLeft, paddingTop + chartHeight / 2);
    ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight / 2);
    ctx.moveTo(paddingLeft, paddingTop + chartHeight);
    ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight);
    ctx.stroke();

    // Safe daily limit dashed reference line
    if (safeDailyLimit > 0) {
      const limitY = paddingTop + chartHeight - (safeDailyLimit / maxDaily) * chartHeight;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, limitY);
      ctx.lineTo(paddingLeft + chartWidth, limitY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Safe: ${formatMoney(safeDailyLimit, currency)}`, paddingLeft + chartWidth, limitY - 4);
    }

    // Draw Bars
    const barWidth = Math.max(3, (chartWidth / daysInMonth) - 2);
    const step = chartWidth / daysInMonth;

    for (let i = 0; i < daysInMonth; i++) {
      const amount = dailyTotals[i];
      const x = paddingLeft + (i * step) + 1;
      const barHeight = (amount / maxDaily) * chartHeight;
      const y = paddingTop + chartHeight - barHeight;

      if (amount > 0) {
        const isOver = safeDailyLimit > 0 && amount > safeDailyLimit;
        ctx.fillStyle = isOver ? '#ef4444' : '#6366f1';
        
        const r = Math.min(barWidth / 2, 3);
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
        ctx.lineTo(x + barWidth, paddingTop + chartHeight);
        ctx.lineTo(x, paddingTop + chartHeight);
        ctx.closePath();
        ctx.fill();
      }

      if ((i + 1) === 1 || (i + 1) % 5 === 0 || (i + 1) === daysInMonth) {
        ctx.fillStyle = options.isDarkMode ? '#64748b' : '#94a3b8';
        ctx.font = '500 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, x + barWidth / 2, paddingTop + chartHeight + 12);
      }
    }
  }

  window.KhorochCharts = {
    renderDonutChart,
    renderDailyBarChart,
  };

})(window);
