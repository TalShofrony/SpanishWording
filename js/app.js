// View switching
function switchView(viewName) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${viewName}`).classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
  localStorage.setItem('sw-active-view', viewName);

  // Refresh data when switching to these views
  if (viewName === 'wordlist') refreshWordList();
  if (viewName === 'stats') renderStats();
  if (viewName === 'quiz') initQuiz();
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await openDB();

  // One-time backfill of history from alltime stats
  await backfillHistory();

  // Init all modules
  await initQuiz();
  initSettings();
  initImport();
  await initWordList();
  await renderStats();

  // Nav buttons
  $$('.nav-btn').forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });

  // Restore last view
  const saved = localStorage.getItem('sw-active-view');
  if (saved) switchView(saved);
});
