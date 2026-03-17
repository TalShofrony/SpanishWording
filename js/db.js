const firebaseConfig = {
  apiKey: "AIzaSyCm_yVzNcUBeIfnYsY-fXY9fqmib603OLE",
  authDomain: "spanishwording.firebaseapp.com",
  projectId: "spanishwording",
  storageBucket: "spanishwording.firebasestorage.app",
  messagingSenderId: "117495029910",
  appId: "1:117495029910:web:3874a7682b73a195c9e2b7"
};

let _db = null;

function openDB() {
  firebase.initializeApp(firebaseConfig);
  _db = firebase.firestore();
  return Promise.resolve(_db);
}

async function getAllWords() {
  const snapshot = await _db.collection('words').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addWord(word) {
  word.spanishLower = word.spanish.toLowerCase();
  const docRef = await _db.collection('words').add(word);
  return docRef.id;
}

async function updateWord(word) {
  const { id, ...data } = word;
  data.spanishLower = data.spanish.toLowerCase();
  await _db.collection('words').doc(id).set(data);
}

async function deleteWord(id) {
  await _db.collection('words').doc(id).delete();
}

async function findBySpanish(spanish) {
  const snapshot = await _db.collection('words')
    .where('spanishLower', '==', spanish.toLowerCase())
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function getStats(id) {
  const doc = await _db.collection('stats').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function putStats(obj) {
  const { id, ...data } = obj;
  await _db.collection('stats').doc(id).set(data);
}

async function bulkAddWords(words) {
  let added = 0, skipped = 0, errors = 0;

  // Pre-fetch all existing words for fast dedup
  const existingWords = await getAllWords();
  const existingSet = new Set(existingWords.map(w => w.spanish.toLowerCase()));

  for (const w of words) {
    try {
      if (existingSet.has(w.spanish.trim().toLowerCase())) {
        skipped++;
      } else {
        await addWord({
          spanish: w.spanish.trim(),
          english: w.english.map(e => e.trim()),
          score: w.score || 1,
          createdAt: new Date().toISOString(),
          lastReviewed: null,
          timesCorrect: 0,
          timesWrong: 0
        });
        existingSet.add(w.spanish.trim().toLowerCase());
        added++;
      }
    } catch (e) {
      errors++;
    }
  }
  return { added, skipped, errors };
}
