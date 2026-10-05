import { firstBuildableChips, normalizeAnswer, withoutDiacritics } from './answers.ts';
import type { LessonExercise, SubmittedAnswer } from './lessonApi.ts';

/*
 * How a test answers an exercise of the lesson response: right, almost right (diacritics left out or
 * one typo), with a Standard form or wrong. Shared by the UI flow (LessonPlayer) and the API flow
 * (lessonApi).
 */

/** Point 6 of the format contract: one typo is tolerated in solutions with at least 6 letters. */
const ONE_TYPO_MIN_LETTERS = 6;

export type Intent = 'correct' | 'almost' | 'standard' | 'wrong';

export const solutionsOf = (exercise: LessonExercise) => exercise.solutions ?? [];

export const hasChoices = (exercise: LessonExercise) => exercise.choices !== undefined;

/** Answered by typing: free translation and a gap without choices. */
export const isTyped = (exercise: LessonExercise) =>
  exercise.type === 'translate_free' || (exercise.type === 'fill_gap' && !hasChoices(exercise));

/**
 * An answer the evaluator calls almost correct (contract points 4 and 6): a solution typed without
 * ë, ç, â…, or else a solution of at least 6 letters with its last letter doubled. It is neither a
 * solution nor a Standard form itself and matches no error hint, which would be checked first.
 */
export function almostAnswer(exercise: LessonExercise): string | undefined {
  const taken = new Set(
    [...solutionsOf(exercise), ...(exercise.standardForms ?? [])].map(normalizeAnswer),
  );
  const hints = (exercise.errorHints ?? []).map((hint) => new RegExp(hint.pattern, 'u'));
  const withoutAccents = solutionsOf(exercise).map(withoutDiacritics);
  const withTypo = solutionsOf(exercise).filter(hasTypoTolerance).map(doubleLastLetter);
  return [...withoutAccents, ...withTypo].find((answer) => {
    const normalized = normalizeAnswer(answer);
    return !taken.has(normalized) && !hints.some((hint) => hint.test(normalized));
  });
}

function hasTypoTolerance(solution: string): boolean {
  return [...solution].filter((char) => /\p{L}/u.test(char)).length >= ONE_TYPO_MIN_LETTERS;
}

/** "Mirëdita." → "Mirëditaa.": one inserted letter, a single edit. */
function doubleLastLetter(solution: string): string {
  return solution.replace(/(\p{L})(\P{L}*)$/u, '$1$1$2');
}

/** A right choice, or a wrong one for the intent "wrong". */
export function choiceFor(exercise: LessonExercise, intent: Intent): string {
  const solutions = new Set(solutionsOf(exercise).map(normalizeAnswer));
  const choice = (exercise.choices ?? []).find(
    (candidate) => solutions.has(normalizeAnswer(candidate)) === (intent !== 'wrong'),
  );
  if (choice === undefined) throw new Error(`No ${intent} choice in ${exercise.id}`);
  return choice;
}

/** Far from every solution, so not even the typo tolerance accepts it. */
export const WRONG_TEXT = 'qqqq zzzz';

/** The text to type for a right, almost right, Standard or wrong answer. */
export function textFor(exercise: LessonExercise, intent: Intent): string {
  const text =
    intent === 'almost'
      ? almostAnswer(exercise)
      : intent === 'standard'
        ? exercise.standardForms?.[0]
        : intent === 'wrong'
          ? WRONG_TEXT
          : solutionsOf(exercise)[0];
  if (text === undefined) throw new Error(`No ${intent} text for ${exercise.id}`);
  return text;
}

/** Exercises the tests can answer wrong for sure: a wrong choice or a nonsense text. */
export const canAnswerWrong = (exercise: LessonExercise) =>
  hasChoices(exercise) || isTyped(exercise);

/** The first exercise to answer wrong: a multiple choice if there is one, else any with choices. */
export function firstWrongCandidate(exercises: readonly LessonExercise[]): LessonExercise {
  const exercise =
    exercises.find((candidate) => candidate.type === 'multiple_choice') ?? exercises.find(hasChoices);
  if (!exercise) throw new Error('The lesson has no exercise with choices to answer wrong');
  return exercise;
}

/**
 * The answer body of POST /api/lessons/{id}/attempts. Wrong answers are only planned for exercises
 * with choices or a typed answer (see canAnswerWrong); typed exercises also take almost and standard.
 */
export function submittedAnswer(exercise: LessonExercise, intent: Intent): SubmittedAnswer {
  if (intent === 'wrong' && !canAnswerWrong(exercise)) {
    throw new Error(`${exercise.id} (${exercise.type}) cannot be answered wrong for sure`);
  }
  switch (exercise.type) {
    case 'multiple_choice':
      return { choice: choiceFor(exercise, intent) };
    case 'fill_gap':
      return hasChoices(exercise)
        ? { choice: choiceFor(exercise, intent) }
        : { text: textFor(exercise, intent) };
    case 'translate_free':
      return { text: textFor(exercise, intent) };
    case 'translate_wordbank':
      return { tokens: firstBuildableChips(solutionsOf(exercise), exercise.wordBank ?? []) };
    case 'word_order':
      return { tokens: [...(exercise.tokens ?? [])] };
    case 'match_pairs':
      return { mistakes: 0 };
  }
}

/**
 * The skill tag with the most exercises the tests can answer wrong for sure (ties by name), with
 * those exercises in lesson order; `only` limits the choice to one tag.
 */
export function mostWrongableTag(
  exercises: readonly LessonExercise[],
  only?: string,
): { tag: string; candidates: LessonExercise[] } | undefined {
  const byTag = new Map<string, LessonExercise[]>();
  for (const exercise of exercises.filter(canAnswerWrong)) {
    for (const tag of exercise.skillTags) {
      if (only === undefined || tag === only) byTag.set(tag, [...(byTag.get(tag) ?? []), exercise]);
    }
  }
  const [best] = [...byTag.entries()].sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b));
  return best && { tag: best[0], candidates: best[1] };
}

/**
 * One wrong choice, one typed answer without its special characters and one Standard form, each on
 * an exercise of its own where the lesson has one: a lesson that shows every feedback sheet.
 */
export function feedbackTour(exercises: readonly LessonExercise[]): Map<string, Intent> {
  const intents = new Map<string, Intent>();
  const pick = (intent: Intent, fits: (exercise: LessonExercise) => boolean) => {
    const exercise = exercises.find((candidate) => !intents.has(candidate.id) && fits(candidate));
    if (exercise) intents.set(exercise.id, intent);
  };
  pick('wrong', (exercise) => exercise.type === 'multiple_choice');
  pick('standard', (exercise) => isTyped(exercise) && (exercise.standardForms?.length ?? 0) > 0);
  pick('almost', (exercise) => isTyped(exercise) && almostAnswer(exercise) !== undefined);
  return intents;
}
