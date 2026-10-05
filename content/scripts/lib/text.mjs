// Text helpers shared by the checks. normalizeAnswer and tokenize implement the section
// "Answer normalisation and tokenisation" of docs/CONTENT_FORMAT.md exactly, so the validator agrees
// with the backend evaluator and the frontend pre-check.

/** Apostrophes (' ’ ‘ ʼ) are removed by normalisation step 2: "s'ka" → "ska". U+02BC is a letter in Unicode, so it is listed. */
const APOSTROPHES = /['’‘ʼ]/gu;
/** Every other character that is not a letter, a digit or whitespace becomes a space in step 2. */
const PUNCTUATION_AND_SYMBOLS = /[^\p{L}\p{N}\s]/gu;
const EDGE_NON_ALPHANUMERICS = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const WHITESPACE = /\s+/gu;

/** Characters that never occur in a normalised answer: apostrophes and anything but letters, digits and whitespace. */
export const ABSENT_AFTER_NORMALISATION = new RegExp(`${APOSTROPHES.source}|${PUNCTUATION_AND_SYMBOLS.source}`, 'u');

/**
 * Steps 1–2: Unicode NFC, lower case, apostrophes removed ("S'ka" → "ska"), every other character that is not a
 * letter, a digit or whitespace replaced by a space ("Jo,faleminderit" → "jo faleminderit"), then trimmed and
 * collapsed to single spaces. Diacritics are kept (step 3: error hints match this form).
 */
export function normalizeAnswer(text) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(PUNCTUATION_AND_SYMBOLS, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

/** Step 4: the plain letter of every diacritic letter; the circumflex vowels are the Gheg nasal vowels. */
const PLAIN_LETTERS = new Map([['ë', 'e'], ['ç', 'c'], ['â', 'a'], ['ê', 'e'], ['î', 'i'], ['ô', 'o'], ['û', 'u']]);
const CIRCUMFLEX_VOWELS = new Set(['â', 'ê', 'î', 'ô', 'û']);

/**
 * Step 4: the diacritic letters of `expected` that `written` lacks (both normalised), e.g. "asht mire" for
 * "âsht mirë" → ["â", "ë"]; [] when both are equal. null when they differ in anything else: an added or wrong
 * diacritic ("jâm" for "jam"), another letter or another length.
 */
export function missingDiacriticsOf(written, expected) {
  const writtenLetters = [...written];
  const expectedLetters = [...expected];
  if (writtenLetters.length !== expectedLetters.length) return null;
  const missing = [];
  for (const [index, letter] of expectedLetters.entries()) {
    if (writtenLetters[index] === letter) continue;
    if (writtenLetters[index] !== PLAIN_LETTERS.get(letter)) return null;
    missing.push(letter);
  }
  return missing;
}

export function isCircumflexVowel(letter) {
  return CIRCUMFLEX_VOWELS.has(letter);
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
