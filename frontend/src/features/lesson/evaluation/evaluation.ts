import type { ErrorCategory, Outcome } from '../model';

/** The verdict of one check before the exercise's explanation is added. */
export interface Evaluation {
  outcome: Outcome;
  errorCategory?: ErrorCategory;
  solution?: string;
  hint?: string;
}

export function correct(solution?: string): Evaluation {
  return { outcome: 'correct', solution };
}

export function standardForm(solution: string, hint: string): Evaluation {
  return {
    outcome: 'correct_standard_form',
    errorCategory: 'variant.standard_form',
    solution,
    hint,
  };
}

export function almostCorrect(
  errorCategory: ErrorCategory,
  solution: string,
  hint: string,
): Evaluation {
  return { outcome: 'almost_correct', errorCategory, solution, hint };
}

export function wrong(errorCategory: ErrorCategory, solution?: string, hint?: string): Evaluation {
  return { outcome: 'wrong', errorCategory, solution, hint };
}
