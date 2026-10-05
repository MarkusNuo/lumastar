import { editDistance } from './editDistance';
import {
  foldDiacritics,
  matchesWithoutDiacritic,
  normalizeAnswer,
  wordsOf,
  writtenWordsOf,
} from './normalize';

/**
 * A solution or an answer in every form the comparison steps need: normalised (diacritics kept),
 * folded, both split into words, and the words as written for feedback texts.
 */
export interface Phrase {
  text: string;
  normalized: string;
  words: string[];
  foldedWords: string[];
  writtenWords: string[];
}

export function phrase(text: string): Phrase {
  const normalized = normalizeAnswer(text);
  return {
    text,
    normalized,
    words: wordsOf(normalized),
    foldedWords: wordsOf(foldDiacritics(normalized)),
    writtenWords: writtenWordsOf(text),
  };
}

/** The word at `index` as written, or its normalised form if the text splits unusually. */
export function writtenWord(of: Phrase, index: number): string {
  const words = of.writtenWords.length === of.words.length ? of.writtenWords : of.words;
  return words[index] ?? '';
}

/** Letters and digits of the normalised text. */
export function letterCount(of: Phrase): number {
  return of.normalized.replaceAll(' ', '').length;
}

/** The edits from the answer to `expected`; a missing diacritic costs nothing, an added one does. */
export function editsTo(answer: Phrase, expected: Phrase): number {
  return editDistance(answer.normalized, expected.normalized, matchesWithoutDiacritic);
}

/** The candidate with the fewest edits from the answer; the earlier candidate wins a tie. */
export function closestOf(answer: Phrase, candidates: readonly Phrase[]): Phrase {
  const [first, ...rest] = candidates;
  if (!first) throw new Error('An exercise needs at least one solution');
  let closest = first;
  let fewestEdits = editsTo(answer, first);
  for (const candidate of rest) {
    const edits = editsTo(answer, candidate);
    if (edits < fewestEdits) {
      closest = candidate;
      fewestEdits = edits;
    }
  }
  return closest;
}
