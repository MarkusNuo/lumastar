import { LESSON_COPY } from '../copy';
import type { Lang } from '../model';
import { almostCorrect, correct, standardForm, wrong, type Evaluation } from './evaluation';
import { sameWords, sorted } from './exactChecks';
import { differsInMissingDiacriticsOnly } from './normalize';
import { closestOf, editsTo, letterCount, phrase, writtenWord, type Phrase } from './phrase';
import type { StandardFormLexicon } from './standardFormLexicon';
import { categoryFromSkillTags, matchingHint, type WrongAnswerRules } from './wrongAnswers';

/*
 * Tolerant check of a typed answer (PRD F5, LANGUAGE_GUIDE section 11, docs/CONTENT_FORMAT.md
 * points 4, 6 and 7), in the order of the backend's TextAnswerCheck: exact match, Standard form,
 * missing diacritics, Standard form with missing diacritics, known error, word order, typo, wrong.
 * Only missing diacritics are tolerated; an added or wrong diacritic counts as a typo.
 */

const hints = LESSON_COPY.hints;
const CIRCUMFLEX_VOWELS = 'âêîôû';
const ONE_TYPO_MIN_LETTERS = 6;
const TWO_TYPOS_MIN_LETTERS = 16;

export interface TypedExercise extends WrongAnswerRules {
  answerLang: Lang;
  solutions: readonly string[];
  /** Complete Standard Albanian variants of a solution. */
  standardForms: readonly string[];
}

/** How a written word or text is compared with an expected one. */
type Comparison = 'exact' | 'missingDiacritics';

function compare(comparison: Comparison, written: string, expected: string): boolean {
  return comparison === 'exact'
    ? written === expected
    : differsInMissingDiacriticsOnly(written, expected);
}

export function checkTyped(
  exercise: TypedExercise,
  lexicon: StandardFormLexicon,
  text: string,
): Evaluation {
  const answer = phrase(text);
  const solutions = exercise.solutions.map(phrase);
  const matching = (comparison: Comparison) =>
    solutions.find((solution) => compare(comparison, answer.normalized, solution.normalized));
  const standard = (comparison: Comparison) =>
    standardFormOf(exercise, lexicon, answer, solutions, comparison);

  const exact = matching('exact');
  if (exact) return correct(exact.text);
  const exactStandard = standard('exact');
  if (exactStandard) return exactStandard;
  const withoutDiacritics = matching('missingDiacritics');
  if (withoutDiacritics) return missingDiacritics(answer, withoutDiacritics);
  return standard('missingDiacritics') ?? mistake(exercise, answer, solutions);
}

function standardFormOf(
  exercise: TypedExercise,
  lexicon: StandardFormLexicon,
  answer: Phrase,
  solutions: Phrase[],
  comparison: Comparison,
): Evaluation | undefined {
  const listed = exercise.standardForms.map(phrase);
  if (listed.some((form) => compare(comparison, answer.normalized, form.normalized))) {
    const solution = closestOf(answer, solutions);
    return standardForm(solution.text, hints.standardForm(swaps(answer, solution), solution.text));
  }
  if (exercise.answerLang !== 'sq') return undefined;
  for (const solution of solutions) {
    const lexiconSwaps = swapsByLexicon(lexicon, answer, solution, comparison);
    if (lexiconSwaps) {
      return standardForm(solution.text, hints.standardForm(lexiconSwaps, solution.text));
    }
  }
  return undefined;
}

interface WordSwap {
  gheg: string;
  standard: string;
}

/** The word swaps if every word that differs from the solution is a Standard form of its word. */
function swapsByLexicon(
  lexicon: StandardFormLexicon,
  answer: Phrase,
  solution: Phrase,
  comparison: Comparison,
): WordSwap[] | undefined {
  if (answer.words.length !== solution.words.length) return undefined;
  const result: WordSwap[] = [];
  for (const [index, ghegWord] of solution.words.entries()) {
    const written = answer.words[index] ?? '';
    if (compare(comparison, written, ghegWord)) continue;
    const isStandard =
      comparison === 'exact'
        ? lexicon.isStandardFormOf(written, ghegWord, false)
        : lexicon.isStandardFormOf(
            answer.foldedWords[index] ?? '',
            solution.foldedWords[index] ?? '',
            true,
          );
    if (!isStandard) return undefined;
    result.push({ gheg: ghegWord, standard: written });
  }
  return result;
}

function missingDiacritics(answer: Phrase, solution: Phrase): Evaluation {
  let circumflexMissing = false;
  let otherDiacriticMissing = false;
  for (let index = 0; index < solution.normalized.length; index++) {
    const expected = solution.normalized.charAt(index);
    if (answer.normalized.charAt(index) === expected) continue;
    if (CIRCUMFLEX_VOWELS.includes(expected)) circumflexMissing = true;
    else otherDiacriticMissing = true;
  }
  const words = differingWords(answer, solution);
  // LANGUAGE_GUIDE section 11: a missing circumflex together with a missing ë or ç is spelling.diacritics.
  return circumflexMissing && !otherDiacriticMissing
    ? almostCorrect('spelling.nasal_vowel', solution.text, hints.missingCircumflex(words))
    : almostCorrect('spelling.diacritics', solution.text, hints.missingDiacritics(words));
}

/** Known errors and reorderings are real mistakes, so they are classified before any typo tolerance. */
function mistake(exercise: TypedExercise, answer: Phrase, solutions: Phrase[]): Evaluation {
  const closest = closestOf(answer, solutions);
  const hint = matchingHint(exercise.errorHints, answer.normalized);
  if (hint) return wrong(hint.category, closest.text, hint.hint);
  if (solutions.some((solution) => isReordering(answer, solution))) {
    return wrong('grammar.word_order', closest.text, hints.wordOrder);
  }
  const typos = solutions.filter((solution) => isTypo(answer, solution));
  if (typos.length > 0) {
    const solution = closestOf(answer, typos);
    return almostCorrect(
      'spelling.other',
      solution.text,
      hints.typo(differingWords(answer, solution)),
    );
  }
  return wrong(categoryFromSkillTags(exercise.skillTags, 'vocab.unknown'), closest.text);
}

/** The same words, compared without diacritics, in another order. */
function isReordering(answer: Phrase, solution: Phrase): boolean {
  return (
    !sameWords(answer.foldedWords, solution.foldedWords) &&
    sameWords(sorted(answer.foldedWords), sorted(solution.foldedWords))
  );
}

function isTypo(answer: Phrase, solution: Phrase): boolean {
  const letters = letterCount(solution);
  const allowedEdits =
    letters >= TWO_TYPOS_MIN_LETTERS ? 2 : letters >= ONE_TYPO_MIN_LETTERS ? 1 : 0;
  return allowedEdits > 0 && editsTo(answer, solution) <= allowedEdits;
}

/** The solution words the answer got wrong, or the whole solution if the word counts differ. */
function differingWords(answer: Phrase, solution: Phrase): string[] {
  if (answer.words.length !== solution.words.length) return [solution.text];
  return solution.words.flatMap((word, index) =>
    answer.words[index] === word ? [] : [writtenWord(solution, index)],
  );
}

function swaps(answer: Phrase, solution: Phrase): WordSwap[] {
  if (answer.words.length !== solution.words.length) return [];
  return solution.words.flatMap((word, index) => {
    const written = answer.words[index] ?? '';
    return written === word ? [] : [{ gheg: word, standard: written }];
  });
}
