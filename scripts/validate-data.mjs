import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../src/data/bank.json', import.meta.url), 'utf8'));
const ids = new Set();
const types = ['vocabulary', 'sentence', 'reading', 'alphabet'];
const difficulties = ['easy', 'normal', 'hard'];
const requiredStrings = ['id', 'topic', 'question', 'correctAnswer', 'explanation', 'image', 'audioText', 'translation'];
const passages = new Map();

assert(Array.isArray(bank), 'Bank must be a JSON array.');
for (const q of bank) {
  const label = q.id || 'missing id';
  for (const field of requiredStrings) {
    assert.equal(typeof q[field], 'string', `${label}: ${field} must be a string`);
    assert(q[field].trim().length > 0, `${label}: ${field} must not be empty`);
    assert(!/undefined|\bNaN\b/.test(q[field]), `${label}: invalid placeholder in ${field}`);
  }
  assert(!ids.has(q.id), `Duplicate id: ${q.id}`);
  ids.add(q.id);
  assert(Number.isInteger(q.grade) && q.grade >= 1 && q.grade <= 6, `${label}: invalid grade`);
  assert(difficulties.includes(q.difficulty), `${label}: invalid difficulty`);
  assert(types.includes(q.questionType), `${label}: invalid question type`);
  assert(Array.isArray(q.choices), `${label}: choices must be an array`);
  assert.equal(new Set(q.choices).size, q.choices.length, `${label}: duplicate choices`);
  assert(q.choices.every(c => typeof c === 'string' && c.trim()), `${label}: empty choice`);
  if (q.questionType === 'sentence') {
    assert(/[.!?]$/.test(q.correctAnswer), `${label}: sentence needs ending punctuation`);
    assert(/^[A-Z]/.test(q.correctAnswer), `${label}: sentence needs initial capital`);
    assert.equal(q.audioText, q.correctAnswer, `${label}: sentence audio mismatch`);
  } else {
    assert(q.choices.length >= 3, `${label}: insufficient choices`);
    assert(q.choices.includes(q.correctAnswer), `${label}: answer absent from choices`);
  }
  if (q.questionType === 'vocabulary') {
    assert(/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(q.correctAnswer), `${label}: malformed vocabulary`);
    assert.equal(q.audioText, q.correctAnswer, `${label}: vocabulary audio mismatch`);
  }
  if (q.questionType === 'alphabet') {
    assert.equal(q.grade, 1, `${label}: alphabet record should be grade 1`);
    assert(/^[a-z]$/.test(q.correctAnswer), `${label}: lowercase answer expected`);
    assert.equal(q.image.toLowerCase(), q.correctAnswer, `${label}: mismatched case pair`);
  }
  if (q.questionType === 'reading') {
    assert(typeof q.passageId === 'string' && q.passageId, `${label}: missing passage id`);
    assert(typeof q.passage === 'string' && q.passage.length > 40, `${label}: missing passage`);
    assert.equal(q.audioText, q.passage, `${label}: reading audio mismatch`);
    assert(Array.isArray(q.glossary) && q.glossary.length >= 2, `${label}: glossary missing`);
    for (const entry of q.glossary) {
      assert(typeof entry.word === 'string' && entry.word, `${label}: empty glossary word`);
      assert(typeof entry.meaning === 'string' && entry.meaning, `${label}: empty glossary meaning`);
    }
    const previous = passages.get(q.passageId);
    if (previous) assert.equal(previous.text, q.passage, `${label}: inconsistent shared passage`);
    passages.set(q.passageId, { text: q.passage, count: (previous?.count || 0) + 1 });
  }
}

const report = [];
for (let grade = 1; grade <= 6; grade++) {
  const records = bank.filter(q => q.grade === grade);
  assert(records.length >= 60, `Grade ${grade} must contain at least 60 records.`);
  const vocabulary = records.filter(q => q.questionType === 'vocabulary');
  const sentences = records.filter(q => q.questionType === 'sentence');
  const reading = records.filter(q => q.questionType === 'reading');
  assert(new Set(vocabulary.map(q => q.correctAnswer)).size >= 30, `Grade ${grade}: at least 30 distinct vocabulary answers expected`);
  assert(sentences.length >= 18, `Grade ${grade}: at least 18 sentences expected`);
  assert(reading.length >= 12, `Grade ${grade}: at least 12 reading questions expected`);
  assert(new Set(records.map(q => q.topic)).size >= 3, `Grade ${grade}: insufficient topics`);
  for (const difficulty of difficulties) {
    for (const type of ['vocabulary', 'sentence', 'reading']) {
      assert(records.some(q => q.difficulty === difficulty && q.questionType === type), `Grade ${grade}: ${difficulty}/${type} is empty`);
    }
  }
  report.push({ grade, total: records.length, vocabulary: vocabulary.length, sentence: sentences.length, reading: reading.length, alphabet: records.filter(q => q.questionType === 'alphabet').length });
}
assert(passages.size >= 36, 'Expected at least 36 original reading passages.');
for (const [id, passage] of passages) assert(passage.count >= 2, `${id}: expected at least two questions`);
assert.equal(new Set(bank.filter(q => q.questionType === 'alphabet').map(q => q.correctAnswer)).size, 26, 'Expected all 26 alphabet pairs.');
console.table(report);
console.log(`PASS: ${bank.length} records; unique IDs, all required fields, complete grade/difficulty/type coverage, valid choices, ${passages.size} consistent passages, 26 letter pairs.`);
console.log('Editorial scope: original practice material; grade suggestions are not a publisher curriculum alignment. Structural validation does not replace teacher review.');
