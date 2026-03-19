async function getOrResetDaily() {
  const today = todayISO();
  let daily = await getStats('daily');
  if (!daily || daily.date !== today) {
    // Archive previous day to history before resetting
    if (daily && daily.date && daily.total > 0) {
      await putDailyHistory(daily.date, daily.correct, daily.total);
    }
    daily = { id: 'daily', date: today, correct: 0, total: 0 };
    await putStats(daily);
  }
  return daily;
}

async function getOrCreateAlltime() {
  let alltime = await getStats('alltime');
  if (!alltime) {
    alltime = { id: 'alltime', date: todayISO(), correct: 0, total: 0 };
    await putStats(alltime);
  }
  return alltime;
}

async function recordAnswer(isCorrect) {
  const daily = await getOrResetDaily();
  const alltime = await getOrCreateAlltime();
  daily.total++;
  alltime.total++;
  if (isCorrect) {
    daily.correct++;
    alltime.correct++;
  }
  await putStats(daily);
  await putStats(alltime);
  await putDailyHistory(daily.date, daily.correct, daily.total);
}

async function renderStats() {
  const daily = await getOrResetDaily();
  const alltime = await getOrCreateAlltime();
  const words = await getAllWords();

  // Daily
  const dp = pct(daily.correct, daily.total);
  $('#stat-daily-label').textContent = `${daily.correct} / ${daily.total}`;
  $('#stat-daily-pct').textContent = `${dp}%`;
  $('#stat-daily-bar').style.width = `${dp}%`;

  // All time
  const ap = pct(alltime.correct, alltime.total);
  $('#stat-alltime-label').textContent = `${alltime.correct} / ${alltime.total}`;
  $('#stat-alltime-pct').textContent = `${ap}%`;
  $('#stat-alltime-bar').style.width = `${ap}%`;

  // Knowledge Index
  const circumference = 2 * Math.PI * 52; // ~326.73
  if (words.length === 0) {
    $('#ki-value').textContent = '—';
    $('#ki-ring-fill').style.strokeDashoffset = circumference;
    $('#ki-label').textContent = 'No words yet';
    $('#ki-detail').textContent = '';
  } else {
    const avgScore = words.reduce((sum, w) => sum + w.score, 0) / words.length;
    const kiPct = Math.round(((avgScore - 1) / 4) * 100);
    const offset = circumference - (circumference * kiPct / 100);
    $('#ki-value').textContent = `${kiPct}%`;
    $('#ki-ring-fill').style.strokeDashoffset = offset;
    const labels = ['Just Starting', 'Getting There', 'Making Progress', 'Almost There', 'Mastered'];
    const labelIdx = Math.min(Math.floor(kiPct / 25), 4);
    if (kiPct === 100) {
      $('#ki-label').textContent = labels[4];
    } else {
      $('#ki-label').textContent = labels[labelIdx];
    }
    $('#ki-detail').textContent = `${words.length} words · avg ${avgScore.toFixed(1)} / 5`;
  }

  // Score distribution
  const counts = [0, 0, 0, 0, 0]; // index 0=score1, 1=score2, etc.
  words.forEach(w => counts[w.score - 1]++);
  const total = words.length || 1;
  const starLabels = ['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];
  const container = $('#stat-distribution');
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pctVal = Math.round((counts[i] / total) * 100);
    container.innerHTML += `
      <div class="dist-row">
        <span class="dist-label">${starLabels[i]}</span>
        <div class="dist-bar-container">
          <div class="dist-bar-fill" style="width:${pctVal}%"></div>
        </div>
        <span class="dist-count">${counts[i]} (${pctVal}%)</span>
      </div>`;
  }

  // Weekly chart
  const history = await getAllHistory();
  const historyMap = {};
  history.forEach(h => { historyMap[h.date] = h; });
  // Override today with live daily stats
  historyMap[daily.date] = { correct: daily.correct, total: daily.total };

  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    const data = historyMap[dateStr] || { total: 0, correct: 0 };
    weekDays.push({ date: dateStr, day: dayName, total: data.total, correct: data.correct });
  }

  const maxWeek = Math.max(...weekDays.map(d => d.total), 1);
  const W = 280, H = 150;
  const padL = 28, padR = 8, padT = 8, padB = 22;
  const cW = W - padL - padR, cH = H - padT - padB;

  let wSvg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
  // Grid lines
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padT + (i / gridSteps) * cH;
    const val = Math.round(maxWeek * (1 - i / gridSteps));
    wSvg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    if (i === 0 || i === gridSteps || i === gridSteps / 2) {
      wSvg += `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" fill="#94a3b8" font-size="9">${val}</text>`;
    }
  }
  // Total line + area fill
  const totalPts = weekDays.map((d, i) => {
    const x = padL + (i / 6) * cW;
    const y = padT + cH - (d.total / maxWeek) * cH;
    return { x, y };
  });
  const correctPts = weekDays.map((d, i) => {
    const x = padL + (i / 6) * cW;
    const y = padT + cH - (d.correct / maxWeek) * cH;
    return { x, y };
  });
  // Area under total line
  wSvg += `<polygon points="${totalPts.map(p => `${p.x},${p.y}`).join(' ')} ${totalPts[6].x},${padT + cH} ${totalPts[0].x},${padT + cH}" fill="url(#totalGrad)" opacity="0.15"/>`;
  // Lines
  wSvg += `<polyline points="${totalPts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  wSvg += `<polyline points="${correctPts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Dots
  totalPts.forEach(p => { wSvg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#6366f1"/>`; });
  correctPts.forEach(p => { wSvg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#10b981"/>`; });
  // X labels
  weekDays.forEach((d, i) => {
    const x = padL + (i / 6) * cW;
    wSvg += `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="#94a3b8" font-size="9">${d.day}</text>`;
  });
  // Gradient def
  wSvg += `<defs><linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs>`;
  wSvg += '</svg>';

  const weekContainer = $('#weekly-chart');
  weekContainer.innerHTML = wSvg + `
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-dot" style="background:#6366f1"></span>Practiced</span>
      <span class="legend-item"><span class="legend-dot" style="background:#10b981"></span>Correct</span>
    </div>`;

  // Monthly chart (last 6 months, vertical bars)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7); // YYYY-MM
    const label = d.toLocaleDateString('en', { month: 'short' });
    months.push({ key, label, total: 0, correct: 0 });
  }
  // Aggregate history by month
  history.forEach(h => {
    const monthKey = h.date.slice(0, 7);
    const m = months.find(m => m.key === monthKey);
    if (m) { m.total += h.total; m.correct += h.correct; }
  });
  // Also include today's live data
  const todayMonthKey = daily.date.slice(0, 7);
  const todayMonth = months.find(m => m.key === todayMonthKey);
  if (todayMonth) {
    // Check if today is already in history to avoid double-counting
    const todayInHistory = history.find(h => h.date === daily.date);
    if (todayInHistory) {
      todayMonth.total += daily.total - todayInHistory.total;
      todayMonth.correct += daily.correct - todayInHistory.correct;
    } else {
      todayMonth.total += daily.total;
      todayMonth.correct += daily.correct;
    }
  }

  const maxMonth = Math.max(...months.map(m => m.total), 1);
  const MW = 280, MH = 140;
  const mPadL = 28, mPadR = 8, mPadT = 8, mPadB = 22;
  const mCW = MW - mPadL - mPadR, mCH = MH - mPadT - mPadB;
  const barW = mCW / 6 * 0.6;
  const barGap = mCW / 6;

  let mSvg = `<svg viewBox="0 0 ${MW} ${MH}" class="chart-svg">`;
  // Grid lines
  for (let i = 0; i <= gridSteps; i++) {
    const y = mPadT + (i / gridSteps) * mCH;
    const val = Math.round(maxMonth * (1 - i / gridSteps));
    mSvg += `<line x1="${mPadL}" y1="${y}" x2="${MW - mPadR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    if (i === 0 || i === gridSteps || i === gridSteps / 2) {
      mSvg += `<text x="${mPadL - 4}" y="${y + 3}" text-anchor="end" fill="#94a3b8" font-size="9">${val}</text>`;
    }
  }
  // Bars
  months.forEach((m, i) => {
    const x = mPadL + i * barGap + (barGap - barW) / 2;
    const totalH = (m.total / maxMonth) * mCH;
    const correctH = (m.correct / maxMonth) * mCH;
    // Total bar (background)
    mSvg += `<rect x="${x}" y="${mPadT + mCH - totalH}" width="${barW}" height="${totalH}" rx="3" fill="#6366f1" opacity="0.25"/>`;
    // Correct bar (foreground, narrower)
    mSvg += `<rect x="${x}" y="${mPadT + mCH - correctH}" width="${barW}" height="${correctH}" rx="3" fill="#6366f1"/>`;
    // Label
    mSvg += `<text x="${x + barW / 2}" y="${MH - 4}" text-anchor="middle" fill="#94a3b8" font-size="9">${m.label}</text>`;
    // Count on top of bar
    if (m.total > 0) {
      mSvg += `<text x="${x + barW / 2}" y="${mPadT + mCH - totalH - 4}" text-anchor="middle" fill="#64748b" font-size="8" font-weight="600">${m.total}</text>`;
    }
  });
  mSvg += '</svg>';

  const monthContainer = $('#monthly-chart');
  monthContainer.innerHTML = mSvg + `
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-dot" style="background:rgba(99,102,241,0.25)"></span>Practiced</span>
      <span class="legend-item"><span class="legend-dot" style="background:#6366f1"></span>Correct</span>
    </div>`;
}
