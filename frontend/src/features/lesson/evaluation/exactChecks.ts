import { LESSON_COPY } from '../copy';
import type { WordPair } from '../model';
import { correct, wrong, type Evaluation } from './evaluation';
import { normalizeAnswer, tokensOf } from './normalize';
import { closestOf, phrase } from './phrase';
import { classifyWrong, type WrongAnswerRules } from './wrongAnswers';

/*
 * Answers built from choices, tiles or pairs are exact: correct, or wrong (docs/CONTENT_FORMAT.md
 * point 7), like the backend's ChoiceAnswerCheck, TileAnswerCheck and PairAnswerCheck.
 */

const hints = LESSON_COPY.hints;

/** A picked option (multiple_choice, fill_gap with chips): exact, error hints, wrong. */
export function checkChoice(
  rules: WrongAnswerRules,
  solutions: readonly string[],
  choice: string,
): Evaluation {
  const chosen = normalizeAnswer(choice);
  const solution = solutions.find((candidate) => normalizeAnswer(candidate) === chosen);
  if (solution !== undefined) return correct(solution);
  const { errorCategory, hint } = classifyWrong(rules, chosen, 'vocab.confused');
  return wrong(errorCategory, solutions[0], hint);
}

/** Whether the tiles form one of the solutions in its order. */
export function isExactTileAnswer(solutions: readonly string[], tiles: readonly string[]): boolean {
  const tokens = tokensOf(tiles.join(' '));
  return solutions.some((solution) => sameWords(tokensOf(solution), tokens));
}

/** Word tiles (translate_wordbank, word_order): exact, same tiles reordered, error hints, wrong. */
export function checkTiles(
  rules: WrongAnswerRules,
  solutions: readonly string[],
  tiles: readonly string[],
): Evaluation {
  const sentence = tiles.join(' ');
  const tokens = tokensOf(sentence);
  const exact = solutions.find((solution) => sameWords(tokensOf(solution), tokens));
  if (exact !== undefined) return correct(exact);

  const reordered = solutions.find((solution) =>
    sameWords(sorted(tokensOf(solution)), sorted(tokens)),
  );
  if (reordered !== undefined) return wrong('grammar.word_order', reordered, hints.wordOrder);

  const closest = closestOf(phrase(sentence), solutions.map(phrase)).text;
  const { errorCategory, hint } = classifyWrong(rules, normalizeAnswer(sentence), 'vocab.unknown');
  return wrong(errorCategory, closest, hint);
}

/** Matched pairs: no wrong match is correct, any wrong match a confusion (DECISIONS #52). */
export function checkPairs(
  pairs: readonly WordPair[],
  wrongMatches: readonly WordPair[],
): Evaluation {
  if (wrongMatches.length === 0) return correct();
  const same = (side: string, reported: string) =>
    normalizeAnswer(side) === normalizeAnswer(reported);
  const confused = pairs.filter((pair) =>
    wrongMatches.some((match) => same(pair.left, match.left) || same(pair.right, match.right)),
  );
  return wrong('vocab.confused', undefined, hints.confusedPairs(confused));
}

export function sameWords(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((word, index) => word === b[index]);
}

export function sorted(words: readonly string[]): string[] {
  return [...words].sort();
}
