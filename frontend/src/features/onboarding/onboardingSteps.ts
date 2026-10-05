/*
 * The steps of the first start (PRD F1) in order: the account is created on /setup, the questions
 * follow on /onboarding once signed in. Both show one shared progress bar.
 */
export const ACCOUNT_STEPS = ['welcome', 'name', 'password'] as const;
export const QUESTION_STEPS = ['motivation', 'dailyGoal', 'selfAssessment'] as const;

export type AccountStep = (typeof ACCOUNT_STEPS)[number];
export type QuestionStep = (typeof QUESTION_STEPS)[number];

const ALL_STEPS: readonly (AccountStep | QuestionStep)[] = [...ACCOUNT_STEPS, ...QUESTION_STEPS];

/** The welcome screen has no progress bar and is not counted. */
export const COUNTED_STEPS = ALL_STEPS.length - 1;

export interface StepProgress {
  /** 1-based number among the counted steps. */
  number: number;
  /** Progress bar value; the bar fills up completely only once the last step is done. */
  value: number;
  max: number;
}

export function stepProgress(step: AccountStep | QuestionStep): StepProgress {
  const number = ALL_STEPS.indexOf(step);
  return { number, value: number, max: COUNTED_STEPS + 1 };
}
