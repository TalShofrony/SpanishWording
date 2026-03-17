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

  // Score distribution
  const counts = [0, 0, 0, 0, 0]; // index 0=score1, 1=score2, etc.
  words.forEach(w => counts[w.score - 1]++);
  const total = words.length || 1;
  const labels = ['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];
  const container = $('#stat-distribution');
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pctVal = Math.round((counts[i] / total) * 100);
    container.innerHTML += `
      <div class="dist-row">
        <span class="dist-label">${labels[i]}</span>
        <div class="dist-bar-container">
          <div class="dist-bar-fill" style="width:${pctVal}%"></div>
        </div>
        <span class="dist-count">${counts[i]} (${pctVal}%)</span>
      </div>`;
  }
}
