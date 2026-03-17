let _wordlistAll = [];

async function initWordList() {
  _wordlistAll = await getAllWords();
  renderWordList(_wordlistAll);

  $('#wordlist-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = _wordlistAll.filter(w =>
      w.spanish.toLowerCase().includes(q) ||
      w.english.some(en => en.toLowerCase().includes(q))
    );
    renderWordList(filtered);
  };

  $('#btn-add-word').onclick = () => openWordModal(null);
  $('#btn-modal-cancel').onclick = closeWordModal;
  $('#btn-modal-save').onclick = handleSaveWord;
}

function renderWordList(words) {
  const container = $('#wordlist-table');
  if (words.length === 0) {
    container.innerHTML = '<div class="wordlist-empty">No words found</div>';
    return;
  }

  // Sort: lowest score first
  const sorted = [...words].sort((a, b) => a.score - b.score || a.spanish.localeCompare(b.spanish));
  container.innerHTML = sorted.map(w => `
    <div class="word-row" data-id="${w.id}">
      <span class="word-spanish">${escapeHtml(w.spanish)}</span>
      <span class="word-english">${escapeHtml(w.english.join(', '))}</span>
      <span class="word-score">${scoreToStars(w.score)}</span>
    </div>
  `).join('');

  container.querySelectorAll('.word-row').forEach(row => {
    row.onclick = () => {
      const id = row.dataset.id;
      const word = _wordlistAll.find(w => w.id === id);
      if (word) openWordModal(word);
    };
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openWordModal(word) {
  const modal = $('#word-modal');
  const title = $('#modal-title');
  const spanishInput = $('#modal-spanish');
  const englishInput = $('#modal-english');
  const wordIdInput = $('#modal-word-id');
  const deleteBtn = $('#btn-modal-delete');

  if (word) {
    title.textContent = 'Edit Word';
    spanishInput.value = word.spanish;
    englishInput.value = word.english.join('; ');
    wordIdInput.value = word.id;
    deleteBtn.style.display = 'inline-flex';
    deleteBtn.onclick = () => handleDeleteWord(word.id);
  } else {
    title.textContent = 'Add Word';
    spanishInput.value = '';
    englishInput.value = '';
    wordIdInput.value = '';
    deleteBtn.style.display = 'none';
  }

  modal.style.display = 'flex';
  spanishInput.focus();
}

function closeWordModal() {
  $('#word-modal').style.display = 'none';
}

async function handleSaveWord() {
  const spanish = $('#modal-spanish').value.trim();
  const englishRaw = $('#modal-english').value.trim();
  const wordId = $('#modal-word-id').value;

  if (!spanish || !englishRaw) return;
  const english = englishRaw.split(';').map(s => s.trim()).filter(Boolean);

  if (wordId) {
    // Edit existing
    const word = _wordlistAll.find(w => w.id === wordId);
    if (word) {
      word.spanish = spanish;
      word.english = english;
      await updateWord(word);
    }
  } else {
    // Add new
    await addWord({
      spanish,
      english,
      score: 1,
      createdAt: new Date().toISOString(),
      lastReviewed: null,
      timesCorrect: 0,
      timesWrong: 0
    });
  }

  closeWordModal();
  await refreshWordList();
}

async function handleDeleteWord(id) {
  if (!confirm('Delete this word?')) return;
  await deleteWord(id);
  closeWordModal();
  await refreshWordList();
}

async function refreshWordList() {
  _wordlistAll = await getAllWords();
  renderWordList(_wordlistAll);
}
