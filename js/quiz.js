let _allWords = [];
let _currentWord = null;
let _recentIds = [];
let _userAnswer = '';
let _currentDir = 'es-to-en';

function getDirection() {
  return localStorage.getItem('sw-direction') || 'es-to-en';
}

function getDistribution() {
  const saved = localStorage.getItem('sw-distribution');
  if (saved) return JSON.parse(saved);
  return { 1: 40, 2: 30, 3: 20, 4: 10 };
}

function selectNextWord() {
  if (_allWords.length === 0) return null;
  const dist = getDistribution();

  // Bucket words by group
  const groups = {
    1: _allWords.filter(w => w.score === 1),
    2: _allWords.filter(w => w.score >= 2 && w.score <= 3),
    3: _allWords.filter(w => w.score === 4),
    4: _allWords.filter(w => w.score === 5),
  };

  // Build weighted candidates (only non-empty groups)
  const candidates = [];
  let totalWeight = 0;
  for (const [g, weight] of Object.entries(dist)) {
    if (weight > 0 && groups[g].length > 0) {
      candidates.push({ group: g, weight });
      totalWeight += weight;
    }
  }

  let pool;
  if (candidates.length === 0 || totalWeight === 0) {
    pool = _allWords;
  } else {
    // Pick group by weight
    let roll = Math.random() * totalWeight;
    let chosen = candidates[0].group;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) { chosen = c.group; break; }
    }
    pool = groups[chosen];
  }

  // Filter out recent words
  const maxRecent = Math.min(3, _allWords.length - 1);
  const filtered = pool.filter(w => !_recentIds.slice(-maxRecent).includes(w.id));
  const finalPool = filtered.length > 0 ? filtered : pool;

  // Pick random from pool, prefer older lastReviewed
  const word = finalPool[Math.floor(Math.random() * finalPool.length)];
  _recentIds.push(word.id);
  if (_recentIds.length > 10) _recentIds.shift();
  return word;
}

async function initQuiz() {
  _allWords = await getAllWords();
  const quizEmpty = $('#quiz-empty');
  const quizContent = $('#quiz-content');

  if (_allWords.length === 0) {
    quizEmpty.style.display = 'block';
    quizContent.style.display = 'none';
    return;
  }

  quizEmpty.style.display = 'none';
  quizContent.style.display = 'block';
  showNextCard();

  // Event listeners
  $('#btn-check').onclick = handleCheck;
  $('#btn-dont-know').onclick = handleDontKnow;
  $('#btn-next').onclick = showNextCard;
  $('#quiz-answer').onkeydown = (e) => {
    if (e.key === 'Enter') handleCheck();
  };
}

function showNextCard() {
  _currentWord = selectNextWord();
  if (!_currentWord) return;

  const setting = getDirection();
  _currentDir = setting === 'random'
    ? (Math.random() < 0.5 ? 'es-to-en' : 'en-to-es')
    : setting;
  const prompt = _currentDir === 'es-to-en' ? _currentWord.spanish : _currentWord.english.join(' / ');
  const badge = _currentDir === 'es-to-en' ? 'ES → EN' : 'EN → ES';

  $('#quiz-direction-badge').textContent = badge;
  $('#quiz-prompt').textContent = prompt;
  $('#quiz-score').textContent = scoreToStars(_currentWord.score);
  $('#quiz-card').className = 'quiz-card';
  $('#quiz-answer').value = '';
  $('#quiz-answer').disabled = false;
  $('#quiz-input-area').style.display = 'block';
  $('#quiz-result').style.display = 'none';
  const addBtn = $('#btn-add-alt');
  addBtn.style.display = 'none';
  addBtn.textContent = 'Add My Answer as Valid';
  addBtn.disabled = false;
  _userAnswer = '';
  $('#quiz-answer').focus();
}

async function handleCheck() {
  const answer = $('#quiz-answer').value.trim();
  if (!answer) return;
  _userAnswer = answer;

  const correct = checkAnswer(answer, _currentWord, _currentDir);
  await showResult(correct, _currentDir);
}

async function handleDontKnow() {
  _userAnswer = '';
  await showResult(false, _currentDir);
}

async function showResult(correct, dir) {
  // Update score
  if (correct) {
    _currentWord.score = Math.min(_currentWord.score + 1, 5);
    _currentWord.timesCorrect++;
  } else {
    _currentWord.score = Math.max(_currentWord.score - 1, 1);
    _currentWord.timesWrong++;
  }
  _currentWord.lastReviewed = new Date().toISOString();
  await updateWord(_currentWord);
  await recordAnswer(correct);

  // Update allWords cache
  const idx = _allWords.findIndex(w => w.id === _currentWord.id);
  if (idx >= 0) _allWords[idx] = _currentWord;

  // Show result UI
  const card = $('#quiz-card');
  card.className = 'quiz-card ' + (correct ? 'correct' : 'wrong');

  const indicator = $('#result-indicator');
  indicator.textContent = correct ? 'Correct!' : 'Wrong';
  indicator.className = 'result-indicator ' + (correct ? 'correct' : 'wrong');

  const correctAnswers = dir === 'es-to-en'
    ? _currentWord.english.join(', ')
    : _currentWord.spanish;
  $('#result-answer').textContent = correct ? '' : `Answer: ${correctAnswers}`;

  // Show "Add Alt Translation" if wrong and user typed something
  if (!correct && _userAnswer) {
    const addBtn = $('#btn-add-alt');
    addBtn.style.display = 'inline-flex';
    addBtn.onclick = async () => {
      if (dir === 'es-to-en') {
        _currentWord.english.push(_userAnswer.trim());
      } else {
        // EN→ES: user's answer is Spanish, so store it as the spanish field.
        // Since a word only has one spanish string, append as alternative with slash.
        _currentWord.spanish = _currentWord.spanish + ' / ' + _userAnswer.trim();
      }
      await updateWord(_currentWord);
      addBtn.textContent = 'Added!';
      addBtn.disabled = true;
    };
  }

  $('#quiz-input-area').style.display = 'none';
  $('#quiz-result').style.display = 'block';
  $('#quiz-score').textContent = scoreToStars(_currentWord.score);
}
