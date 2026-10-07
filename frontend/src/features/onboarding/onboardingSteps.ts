/*
 * The counted steps of the first start (PRD F1) in order: the account is created on /registrieren,
 * the questions follow on /onboarding once signed in. Both show one shared progress bar.
 */
export const ACCOUNT_STEP = 'account';
export const QUESTION_STEPS = ['motivation', 'dailyGoal', 'selfAssessment'] as const;

export type AccountStep = typeof ACCOUNT_STEP;
export type QuestionStep = (typeof QUESTION_STEPS)[number];

const ALL_STEPS: readonly (AccountStep | QuestionStep)[] = [ACCOUNT_STEP, ...QUESTION_STEPS];

export const COUNTED_STEPS = ALL_STEPS.length;

export interface StepProgress {
  /** 1-based number among the counted steps. */
  number: number;
  /** Progress bar value; the bar fills up completely only once the last step is done. */
  value: number;
  max: number;
}

export function stepProgress(step: AccountStep | QuestionStep): StepProgress {
  const number = ALL_STEPS.indexOf(step) + 1;
  return { number, value: number, max: COUNTED_STEPS + 1 };
}
