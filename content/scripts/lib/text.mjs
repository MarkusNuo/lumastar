// Text helpers shared by the checks. normalizeAnswer and tokenize implement the section
// "Answer normalisation and tokenisation" of docs/CONTENT_FORMAT.md exactly, so the validator agrees
// with the backend evaluator and the frontend pre-check.

/** Every character that normalisation step 2 removes: anything but a letter, a digit or whitespace. */
export const REMOVED_BY_NORMALISATION = /[^\p{L}\p{N}\s]/u;

const NEITHER_LETTER_DIGIT_NOR_SPACE = new RegExp(REMOVED_BY_NORMALISATION.source, 'gu');
const EDGE_NON_ALPHANUMERICS = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const WHITESPACE = /\s+/gu;

/**
 * Steps 1–2: Unicode NFC, lower case, every character that is not a letter, a digit or whitespace
 * removed (all punctuation and symbols, apostrophes included: "S'ka" → "ska"), then trimmed and
 * collapsed to single spaces. Diacritics are kept (step 3: error hints match this form).
 */
export function normalizeAnswer(text) {
  return text.normalize('NFC').toLowerCase().replace(NEITHER_LETTER_DIGIT_NOR_SPACE, '').replace(WHITESPACE, ' ').trim();
}

/** Step 5: split on whitespace and strip surrounding punctuation from each token (inner apostrophes stay: s'ka). */
export function tokenize(sentence) {
  return sentence
    .trim()
    .split(WHITESPACE)
    .map((token) => token.replace(EDGE_NON_ALPHANUMERICS, ''))
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

function countBy(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
