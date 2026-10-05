import { firstBuildableChips, normalizeAnswer, withoutDiacritics } from './answers.ts';
import type { LessonExercise, SubmittedAnswer } from './lessonApi.ts';

/*
 * How a test answers an exercise of the lesson response: right, almost right (diacritics left out),
 * with a Standard form or wrong. Shared by the UI flow (LessonPlayer) and the API flow (lessonApi).
 */

export type Intent = 'correct' | 'almost' | 'standard' | 'wrong';

export const solutionsOf = (exercise: LessonExercise) => exercise.solutions ?? [];

export const hasChoices = (exercise: LessonExercise) => exercise.choices !== undefined;

/** Answered by typing: free translation and a gap without choices. */
export const isTyped = (exercise: LessonExercise) =>
  exercise.type === 'translate_free' || (exercise.type === 'fill_gap' && !hasChoices(exercise));

/** A solution typed without ë, ç, â…, which neither is a solution nor a Standard form by itself. */
export function almostAnswer(exercise: LessonExercise): string | undefined {
  const taken = new Set(
    [...solutionsOf(exercise), ...(exercise.standardForms ?? [])].map(normalizeAnswer),
  );
  return solutionsOf(exercise)
    .map(withoutDiacritics)
    .find((answer) => !taken.has(normalizeAnswer(answer)));
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

/** The text to type for a right, almost right or Standard answer. */
export function textFor(exercise: LessonExercise, intent: Intent): string {
  const text =
    intent === 'almost'
      ? almostAnswer(exercise)
      : intent === 'standard'
        ? exercise.standardForms?.[0]
        : solutionsOf(exercise)[0];
  if (text === undefined) throw new Error(`No ${intent} text for ${exercise.id}`);
  return text;
}

/** The first exercise to answer wrong: a multiple choice if there is one, else any with choices. */
export function firstWrongCandidate(exercises: readonly LessonExercise[]): LessonExercise {
  const exercise =
    exercises.find((candidate) => candidate.type === 'multiple_choice') ?? exercises.find(hasChoices);
  if (!exercise) throw new Error('The lesson has no exercise with choices to answer wrong');
  return exercise;
}

/**
 * The answer body of POST /api/lessons/{id}/attempts. Wrong answers are only planned for exercises
 * with choices; typed exercises take the intents correct, almost and standard.
 */
export function submittedAnswer(exercise: LessonExercise, intent: Intent): SubmittedAnswer {
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
