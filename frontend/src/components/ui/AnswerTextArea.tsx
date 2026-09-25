import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../lib/cx';
import { answerStatusClass, fieldClass, type AnswerStatus } from './fieldStyles';

export type { AnswerStatus } from './fieldStyles';

export interface AnswerTextAreaProps extends ComponentPropsWithRef<'textarea'> {
  /** Accessible name; the exercise prompt is usually the visible label. */
  label: string;
  status?: AnswerStatus;
}

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
        status && answerStatusClass[status],
        className,
      )}
    />
  );
}
