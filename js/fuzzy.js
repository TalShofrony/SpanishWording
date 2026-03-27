function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
      }
    }
  }
  return dp[m][n];
}

const STRIP_PREFIXES = ['to ', 'the ', 'a ', 'an ', 'el ', 'la ', 'los ', 'las ', 'un ', 'una '];

function stripPrefix(str) {
  const lower = str.toLowerCase();
  for (const p of STRIP_PREFIXES) {
    if (lower.startsWith(p)) return str.slice(p.length);
  }
  return str;
}

function isFuzzyMatch(userAnswer, correctAnswer) {
  const a = userAnswer.trim().toLowerCase();
  const b = correctAnswer.trim().toLowerCase();
  if (a === b) return true;

  // Also try with common prefixes stripped
  const aStripped = stripPrefix(a);
  const bStripped = stripPrefix(b);
  if (aStripped === bStripped) return true;

  // Try all combinations: raw vs raw, stripped vs stripped, raw vs stripped
  const pairs = [[a, b], [aStripped, bStripped], [a, bStripped], [aStripped, b]];
  for (const [x, y] of pairs) {
    if (fuzzyCompare(x, y)) return true;
  }
  return false;
}

function fuzzyCompare(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return false;
  const dist = levenshtein(a, b);
  if (maxLen <= 6) return dist <= 1;
  return dist <= Math.max(Math.floor(maxLen * 0.2), 1);
}

function isExactMatch(a, b) {
  const al = a.trim().toLowerCase(), bl = b.trim().toLowerCase();
  if (al === bl) return true;
  return stripPrefix(al) === stripPrefix(bl);
}

function checkAnswer(userAnswer, word, direction) {
  if (!userAnswer.trim()) return { correct: false, fuzzy: false, matchedAnswer: '' };
  const candidates = direction === 'es-to-en'
    ? word.english
    : word.spanish.split(' / ').map(s => s.trim());

  // First pass: exact matches (case/prefix insensitive)
  for (const c of candidates) {
    if (isExactMatch(userAnswer, c)) return { correct: true, fuzzy: false, matchedAnswer: c };
  }

  // Second pass: fuzzy matches
  for (const c of candidates) {
    if (isFuzzyMatch(userAnswer, c)) return { correct: true, fuzzy: true, matchedAnswer: c };
  }

  return { correct: false, fuzzy: false, matchedAnswer: '' };
}
