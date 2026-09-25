import { LESSON_COPY } from '../copy';
import type { Answer, LessonExercise, Outcome, Verdict } from '../model';
import { editDistance } from './editDistance';
import { foldDiacritics, normalizeAnswer, wordsOf, writtenWordsOf } from './normalize';

/*
 * Instant pre-check (PRD 11.2) mirroring the backend's rule-based evaluator. The backend knows more
 * (error hints, a lexicon of Standard forms), so its verdict replaces this one when they differ.
 */

const hints = LESSON_COPY.hints;
const CIRCUMFLEX_VOWELS = new Set(['â', 'ê', 'î', 'ô', 'û']);
const ONE_TYPO_MIN_LETTERS = 6;
const TWO_TYPOS_MIN_LETTERS = 16;

interface Phrase {
  text: string;
  normalized: string;
  folded: string;
  words: string[];
  foldedWords: string[];
  writtenWords: string[];
}

function phrase(text: string): Phrase {
  const normalized = normalizeAnswer(text);
  const folded = foldDiacritics(normalized);
  return {
    text,
    normalized,
    folded,
    words: wordsOf(normalized),
    foldedWords: wordsOf(folded),
    writtenWords: writtenWordsOf(text),
  };
}

interface Evaluation {
  outcome: Outcome;
  solution?: string;
  hint?: string;
}

export function precheck(exercise: LessonExercise, answer: Answer): Verdict {
  const evaluation = evaluate(exercise, answer);
  return {
    ...evaluation,
    countsAsCorrect: evaluation.outcome !== 'wrong',
    explanation: exercise.explanation,
    source: 'precheck',
  };
}

function evaluate(exercise: LessonExercise, answer: Answer): Evaluation {
  switch (exercise.type) {
    case 'multiple_choice':
      return checkChoice(exercise.solutions, expect(answer, 'choice').choice);
    case 'fill_gap':
      return exercise.choices
        ? checkChoice(exercise.solutions, expect(answer, 'choice').choice)
        : checkText(exercise.solutions, exercise.standardForms, expect(answer, 'text').text);
    case 'translate_free':
      return checkText(exercise.solutions, exercise.standardForms, expect(answer, 'text').text);
    case 'translate_wordbank':
    case 'word_order':
      return checkText(exercise.solutions, [], expect(answer, 'tokens').tokens.join(' '));
    case 'match_pairs':
      return checkPairs(expect(answer, 'mistakes').mistakes);
  }
}

function expect<K extends Answer['kind']>(answer: Answer, kind: K): Extract<Answer, { kind: K }> {
  if (answer.kind !== kind) throw new Error(`Expected a ${kind} answer, got ${answer.kind}`);
  return answer as Extract<Answer, { kind: K }>;
}

function checkChoice(solutions: string[], choice: string): Evaluation {
  const chosen = normalizeAnswer(choice);
  const solution = solutions.find((candidate) => normalizeAnswer(candidate) === chosen);
  return solution === undefined
    ? { outcome: 'wrong', solution: solutions[0] }
    : { outcome: 'correct', solution };
}

function checkPairs(mistakes: number): Evaluation {
  if (mistakes === 0) return { outcome: 'correct' };
  if (mistakes === 1) return { outcome: 'almost_correct', hint: hints.onePairMismatched };
  return { outcome: 'wrong', hint: hints.pairsMismatched(mistakes) };
}

/** Exact match, Standard form, missing diacritics, Standard form without diacritics, mistake. */
function checkText(solutionTexts: string[], standardFormTexts: string[], text: string): Evaluation {
  const answer = phrase(text);
  const solutions = solutionTexts.map(phrase);
  const standardForms = standardFormTexts.map(phrase);

  const exact = solutions.find((solution) => solution.normalized === answer.normalized);
  if (exact) return { outcome: 'correct', solution: exact.text };

  const standard = standardForm(answer, solutions, standardForms, 'normalized');
  if (standard) return standard;

  const withoutDiacritics = solutions.find((solution) => solution.folded === answer.folded);
  if (withoutDiacritics) return missingDiacritics(answer, withoutDiacritics);

  return standardForm(answer, solutions, standardForms, 'folded') ?? mistake(answer, solutions);
}

function standardForm(
  answer: Phrase,
  solutions: Phrase[],
  standardForms: Phrase[],
  form: 'normalized' | 'folded',
): Evaluation | undefined {
  if (!standardForms.some((standard) => standard[form] === answer[form])) return undefined;
  const solution = closest(solutions, answer);
  return {
    outcome: 'correct_standard_form',
    solution: solution.text,
    hint: hints.standardForm(swaps(answer, solution), solution.text),
  };
}

function missingDiacritics(answer: Phrase, solution: Phrase): Evaluation {
  let circumflexMissing = false;
  let otherDiacriticMissing = false;
  for (let i = 0; i < solution.normalized.length; i++) {
    const expected = solution.normalized.charAt(i);
    if (answer.normalized.charAt(i) === expected) continue;
    if (CIRCUMFLEX_VOWELS.has(expected)) circumflexMissing = true;
    else otherDiacriticMissing = true;
  }
  const words = differingWords(answer, solution);
  return {
    outcome: 'almost_correct',
    solution: solution.text,
    hint:
      circumflexMissing && !otherDiacriticMissing
        ? hints.missingCircumflex(words)
        : hints.missingDiacritics(words),
  };
}

/** Reorderings are real mistakes, so they are classified before any typo tolerance. */
function mistake(answer: Phrase, solutions: Phrase[]): Evaluation {
  const nearest = closest(solutions, answer);
  if (solutions.some((solution) => isReordering(answer, solution))) {
    return { outcome: 'wrong', solution: nearest.text, hint: hints.wordOrder };
  }
  const typos = solutions.filter((solution) => isTypo(answer, solution));
  if (typos.length > 0) {
    const solution = closest(typos, answer);
    return {
      outcome: 'almost_correct',
      solution: solution.text,
      hint: hints.typo(differingWords(answer, solution)),
    };
  }
  return { outcome: 'wrong', solution: nearest.text };
}

function isReordering(answer: Phrase, solution: Phrase): boolean {
  return sorted(answer.foldedWords).join(' ') === sorted(solution.foldedWords).join(' ');
}

function isTypo(answer: Phrase, solution: Phrase): boolean {
  const letters = solution.folded.replaceAll(' ', '').length;
  const allowedEdits =
    letters >= TWO_TYPOS_MIN_LETTERS ? 2 : letters >= ONE_TYPO_MIN_LETTERS ? 1 : 0;
  return allowedEdits > 0 && editDistance(answer.folded, solution.folded) <= allowedEdits;
}

/** The solution words the answer got wrong, or the whole solution if the word counts differ. */
function differingWords(answer: Phrase, solution: Phrase): string[] {
  if (answer.words.length !== solution.words.length) return [solution.text];
  const written =
    solution.writtenWords.length === solution.words.length ? solution.writtenWords : solution.words;
  return solution.words.flatMap((word, index) =>
    answer.words[index] === word ? [] : [written[index] ?? word],
  );
}

function swaps(answer: Phrase, solution: Phrase): { gheg: string; standard: string }[] {
  if (answer.words.length !== solution.words.length) return [];
  return solution.words.flatMap((word, index) => {
    const written = answer.words[index] ?? '';
    return written === word ? [] : [{ gheg: word, standard: written }];
  });
}

/** The solution with the fewest edits to the answer; the earlier solution wins a tie. */
function closest(solutions: Phrase[], answer: Phrase): Phrase {
  const [first, ...rest] = solutions;
  if (!first) throw new Error('An exercise needs at least one solution');
  let best = first;
  let fewestEdits = editDistance(answer.folded, first.folded);
  for (const solution of rest) {
    const edits = editDistance(answer.folded, solution.folded);
    if (edits < fewestEdits) {
      best = solution;
      fewestEdits = edits;
    }
  }
  return best;
}

function sorted(words: string[]): string[] {
  return [...words].sort();
}
