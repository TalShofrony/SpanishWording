function initImport() {
  $('#import-file').onchange = handleFileUpload;
  $('#btn-export').onclick = handleExport;
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const resultEl = $('#import-result');
  resultEl.style.display = 'block';
  resultEl.className = 'import-result';
  resultEl.textContent = 'Importing...';

  try {
    const text = await file.text();
    let words;

    if (file.name.endsWith('.json')) {
      words = parseJSON(text);
    } else {
      words = parseCSV(text);
    }

    if (words.length === 0) {
      resultEl.className = 'import-result error';
      resultEl.textContent = 'No valid words found in file.';
      return;
    }

    const result = await bulkAddWords(words);
    resultEl.className = 'import-result success';
    resultEl.textContent = `Done! Added: ${result.added}, Skipped (existing): ${result.skipped}${result.errors > 0 ? `, Errors: ${result.errors}` : ''}`;
  } catch (err) {
    resultEl.className = 'import-result error';
    resultEl.textContent = `Error: ${err.message}`;
  }

  // Reset file input
  e.target.value = '';
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect and skip header
  const first = lines[0].toLowerCase();
  const start = (first.includes('spanish') || first.includes('english')) ? 1 : 0;

  const results = [];
  for (let i = start; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 2) continue;

    const spanish = parts[0].trim();
    const englishRaw = parts[1].trim();
    if (!spanish || !englishRaw) continue;

    const english = englishRaw.split(';').map(s => s.trim()).filter(Boolean);
    const score = parts.length >= 3 ? parseInt(parts[2]) : undefined;

    results.push({
      spanish,
      english,
      score: (score >= 1 && score <= 5) ? score : undefined
    });
  }
  return results;
}

function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function parseJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON must be an array');
  return data.map(item => ({
    spanish: item.spanish || '',
    english: Array.isArray(item.english) ? item.english : [item.english || ''],
    score: (item.score >= 1 && item.score <= 5) ? item.score : undefined
  })).filter(w => w.spanish && w.english.length > 0 && w.english[0]);
}

async function handleExport() {
  const words = await getAllWords();

  // Build CSV with 3 columns: spanish, english, score
  const header = 'spanish,english,score';
  const rows = words.map(w => {
    const spanish = csvEscape(w.spanish);
    const english = csvEscape(w.english.join('; '));
    return `${spanish},${english},${w.score}`;
  });

  const csv = [header, ...rows].join('\n');
  downloadFile(csv, 'spanish-wording-export.csv', 'text/csv');
}

function csvEscape(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
