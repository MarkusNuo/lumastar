/*
 * Answer normalisation of docs/CONTENT_FORMAT.md ("Answer normalisation and tokenisation"),
 * identical to the backend evaluator and the content validator.
 */

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

/** NFC, lower case, every character that is not a letter, a digit or whitespace removed, single spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(NEITHER_LETTER_DIGIT_NOR_SPACE, '')
    .replace(WHITESPACE, ' ')
    .trim();
}

/** Replaces ë, ç, â, ê, î, ô and û of a normalised text by their base letter; the length stays. */
export function foldDiacritics(normalized: string): string {
  let folded = '';
  for (const char of normalized) folded += FOLDED[char] ?? char;
  return folded;
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
