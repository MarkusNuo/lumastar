/** Shared look of text inputs: large, rounded, border highlights on focus and validation. */
export const fieldClass =
  'w-full border-2 border-border bg-surface font-bold text-fg transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-fg-subtle focus:border-primary focus:ring-4 focus:ring-primary/25 focus-visible:outline-none aria-invalid:border-danger aria-invalid:focus:ring-danger/25';

/** Same colours as the feedback sheet: almost = typo, standard = Standard Albanian form. */
export type AnswerStatus = 'correct' | 'almost' | 'standard' | 'wrong';

/** Colours of a checked answer field; they also win over the focus highlight. */
export const answerStatusClass: Record<AnswerStatus, string> = {
  correct: 'border-success text-success focus:border-success focus:ring-success/25',
  almost: 'border-warning text-warning focus:border-warning focus:ring-warning/25',
  standard: 'border-secondary text-secondary focus:border-secondary focus:ring-secondary/25',
  wrong: 'border-danger text-danger focus:border-danger focus:ring-danger/25',
};
