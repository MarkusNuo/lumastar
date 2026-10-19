import type { Answer, LessonExercise, Verdict } from '../model';
import type { Evaluation } from './evaluation';
import { checkChoice, checkPairs, checkTiles } from './exactChecks';
import type { StandardFormLexicon } from './standardFormLexicon';
import { checkTyped } from './textCheck';

/*
 * Instant pre-check with the rules of the backend's RuleBasedAnswerEvaluator, so its
 * verdict is the same in all but rare cases; the backend's binding verdict replaces it when they
 * differ. Tolerance (missing diacritics, typos) applies to typed answers only; answers built from
 * tiles, choices or pairs are exact (docs/CONTENT_FORMAT.md point 7).
 */

export function precheck(
  exercise: LessonExercise,
  answer: Answer,
  lexicon: StandardFormLexicon,
): Verdict {
  const evaluation = evaluate(exercise, answer, lexicon);
  return {
    ...evaluation,
    countsAsCorrect: evaluation.outcome !== 'wrong',
    explanation: exercise.explanation,
    source: 'precheck',
  };
}

function evaluate(
  exercise: LessonExercise,
  answer: Answer,
  lexicon: StandardFormLexicon,
): Evaluation {
  switch (exercise.type) {
    case 'multiple_choice':
      return checkChoice(exercise, exercise.solutions, expect(answer, 'choice').choice);
    case 'fill_gap':
      return exercise.choices
        ? checkChoice(exercise, exercise.solutions, expect(answer, 'choice').choice)
        : checkTyped(exercise, lexicon, expect(answer, 'text').text);
    case 'translate_free':
      return checkTyped(exercise, lexicon, expect(answer, 'text').text);
    case 'translate_wordbank':
    case 'word_order':
      return checkTiles(exercise, exercise.solutions, expect(answer, 'tokens').tokens);
    case 'match_pairs':
      return checkPairs(exercise.pairs, expect(answer, 'pairs').wrongMatches);
  }
}

function expect<K extends Answer['kind']>(answer: Answer, kind: K): Extract<Answer, { kind: K }> {
  if (answer.kind !== kind) throw new Error(`Expected a ${kind} answer, got ${answer.kind}`);
  return answer as Extract<Answer, { kind: K }>;
}
