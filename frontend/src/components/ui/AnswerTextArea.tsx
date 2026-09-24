import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../lib/cx';
import { fieldClass } from './fieldStyles';

export type AnswerStatus = 'correct' | 'wrong';

export interface AnswerTextAreaProps extends ComponentPropsWithRef<'textarea'> {
  /** Accessible name; the exercise prompt is usually the visible label. */
  label: string;
  status?: AnswerStatus;
}

const statusClass: Record<AnswerStatus, string> = {
  correct: 'border-success text-success focus:border-success focus:ring-success/25',
  wrong: 'border-danger text-danger focus:border-danger focus:ring-danger/25',
};

export function AnswerTextArea({
  label,
  status,
  rows = 4,
  className,
  ...rest
}: AnswerTextAreaProps) {
  return (
    <textarea
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      {...rest}
      rows={rows}
      aria-label={label}
      className={cx(
        fieldClass,
        'min-h-40 resize-none rounded-card p-4 text-lead',
        status && statusClass[status],
        className,
      )}
    />
  );
}
