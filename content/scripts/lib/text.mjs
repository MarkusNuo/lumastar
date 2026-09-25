// Text helpers shared by the checks. normalizeAnswer and tokenize implement the section
// "Answer normalisation and tokenisation" of docs/CONTENT_FORMAT.md exactly, so the validator agrees
// with the backend evaluator and the frontend pre-check.

/** Characters removed by normalisation step 2 and stripped from token edges (step 5). */
export const STRIPPED_PUNCTUATION = ['.', ',', '!', '?', ';', ':', '"', '„', '“', '”', '«', '»', "'", '’', '‘', '(', ')', '-', '–', '—', '…'];

const PUNCTUATION_CLASS = `[${STRIPPED_PUNCTUATION.map((character) => (/[\\\]\-^]/u.test(character) ? `\\${character}` : character)).join('')}]`;
const ANY_PUNCTUATION = new RegExp(PUNCTUATION_CLASS, 'gu');
const EDGE_PUNCTUATION = new RegExp(`^${PUNCTUATION_CLASS}+|${PUNCTUATION_CLASS}+$`, 'gu');
const WHITESPACE = /\s+/gu;

/**
 * Steps 1–2: Unicode NFC, trim, lower case, single spaces, then the listed punctuation stripped.
 * Diacritics are kept (step 3: error hints match this form). Whitespace is collapsed once more after
 * stripping, so "Mirë – po ti" and "Mirë, po ti" both become "mirë po ti".
 */
export function normalizeAnswer(text) {
  return collapseWhitespace(collapseWhitespace(text.normalize('NFC').toLowerCase()).replace(ANY_PUNCTUATION, ''));
}

/** Step 5: split on whitespace and strip surrounding punctuation from each token (inner apostrophes stay: s'ka). */
export function tokenize(sentence) {
  return sentence
    .trim()
    .split(WHITESPACE)
    .map((token) => token.replace(EDGE_PUNCTUATION, ''))
    .filter(Boolean);
}

/** Step 5: tokens are compared case-insensitively. */
export function sameToken(left, right) {
  return left.toLowerCase() === right.toLowerCase();
}

/** Lower-cased letter runs of a text, for word-level blocklist lookups; apostrophes split words (s'ka → s, ka). */
export function wordsOf(text) {
  return text.normalize('NFC').toLowerCase().match(/\p{L}+/gu) ?? [];
}

/** Returns the entries of `needed` that are missing from `available` (case-insensitive multisets). */
export function missingFromMultiset(needed, available) {
  const remaining = countBy(available.map((entry) => entry.toLowerCase()));
  const missing = [];
  for (const entry of needed.map((value) => value.toLowerCase())) {
    const count = remaining.get(entry) ?? 0;
    if (count === 0) missing.push(entry);
    else remaining.set(entry, count - 1);
  }
  return missing;
}

function collapseWhitespace(text) {
  return text.replace(WHITESPACE, ' ').trim();
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
