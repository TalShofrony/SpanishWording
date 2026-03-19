// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function scoreToStars(score) {
  return '★'.repeat(score) + '☆'.repeat(5 - score);
}

function scoreToLabel(score) {
  if (score === 1) return 'Unfamiliar';
  if (score <= 3) return 'Familiar';
  if (score === 4) return 'Confident';
  return 'Mastered';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function pct(correct, total) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

function niceAxisMax(raw) {
  if (raw <= 0) return 10;
  if (raw <= 10) return 10;
  if (raw <= 50) return Math.ceil(raw / 10) * 10;
  if (raw <= 200) return Math.ceil(raw / 50) * 50;
  return Math.ceil(raw / 100) * 100;
}
