// Text helpers shared by the checks. They mirror the evaluator's tolerance rules
// (content/LANGUAGE_GUIDE.md): case and sentence punctuation are ignored, apostrophes are kept.

const PUNCTUATION = '.,!?;:…"„“”«»‹›()\\[\\]¿¡–—-';
const EDGE_PUNCTUATION = new RegExp(`^[${PUNCTUATION}]+|[${PUNCTUATION}]+$`, 'gu');
const ANY_PUNCTUATION = new RegExp(`[${PUNCTUATION}]`, 'gu');
const TYPOGRAPHIC_APOSTROPHES = /[’‘´]/gu;

function clean(text) {
  return text.normalize('NFC').replace(TYPOGRAPHIC_APOSTROPHES, "'");
}

/** Lower-cases, drops sentence punctuation and collapses whitespace. */
export function normalizeForComparison(text) {
  return clean(text).toLowerCase().replace(ANY_PUNCTUATION, ' ').replace(/\s+/gu, ' ').trim();
}

/** Splits a sentence into tap tokens: whitespace-separated, without leading/trailing punctuation. */
export function tokenize(text) {
  return clean(text)
    .split(/\s+/u)
    .map((token) => token.replace(EDGE_PUNCTUATION, ''))
    .filter(Boolean);
}

/** Lower-cased letter runs of a text; apostrophes split words (s'ka → s, ka). */
export function wordsOf(text) {
  return clean(text).toLowerCase().match(/\p{L}+/gu) ?? [];
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
