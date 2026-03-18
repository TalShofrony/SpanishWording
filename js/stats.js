async function getOrResetDaily() {
  const today = todayISO();
  let daily = await getStats('daily');
  if (!daily || daily.date !== today) {
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
}
