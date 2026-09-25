/*
 * Answer normalisation and tokenisation of docs/CONTENT_FORMAT.md ("Answer normalisation and
 * tokenisation", points 1, 2, 4 and 5), identical to the backend evaluator and the content validator.
 */

const APOSTROPHES = /['’‘ʼ]/gu;
const NEITHER_LETTER_DIGIT_NOR_SPACE = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE = /\s+/gu;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

const FOLDED: Readonly<Record<string, string>> = {
  ë: 'e',
  ç: 'c',
  â: 'a',
  ê: 'e',
  î: 'i',
  ô: 'o',
  û: 'u',
};

/**
 * NFC, lower case, apostrophes removed ("s'ka" → "ska"), every other character that is not a
 * letter, a digit or whitespace replaced by a space ("Jo,faleminderit" → "jo faleminderit"), single
 * spaces.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(NEITHER_LETTER_DIGIT_NOR_SPACE, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

/** Replaces ë, ç, â, ê, î, ô and û of a normalised text by their base letter; the length stays. */
export function foldDiacritics(normalized: string): string {
  let folded = '';
  for (const char of normalized) folded += FOLDED[char] ?? char;
  return folded;
}

/**
 * Whether a written character stands for an expected one: the same character, or the plain letter
 * of a Gheg special character (a missing diacritic). An added or wrong diacritic never matches.
 */
export function matchesWithoutDiacritic(written: string, expected: string): boolean {
  return written === expected || written === FOLDED[expected];
}

/** Whether the answer differs from the solution (both normalised) in missing diacritics only. */
export function differsInMissingDiacriticsOnly(answer: string, solution: string): boolean {
  if (answer.length !== solution.length) return false;
  for (let i = 0; i < solution.length; i++) {
    if (!matchesWithoutDiacritic(answer.charAt(i), solution.charAt(i))) return false;
  }
  return true;
}

/** The words of a normalised text. */
export function wordsOf(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ');
}

/** The words as written (edge punctuation stripped), for feedback texts. */
export function writtenWordsOf(text: string): string[] {
  return text
    .trim()
    .split(WHITESPACE)
    .filter((chunk) => normalizeAnswer(chunk) !== '')
    .map((chunk) => chunk.replace(EDGE_PUNCTUATION, ''));
}

/**
 * Word-bank and word-order tokens (point 5): split on whitespace, surrounding punctuation stripped
 * (inner apostrophes stay: "s'ka"), lower case for the case-insensitive comparison.
 */
export function tokensOf(text: string): string[] {
  return text
    .normalize('NFC')
    .trim()
    .split(WHITESPACE)
    .map((token) => token.replace(EDGE_PUNCTUATION, '').toLowerCase())
    .filter((token) => token !== '');
}
