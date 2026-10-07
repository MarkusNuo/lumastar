import type { ComponentPropsWithRef } from 'react';
import { cx } from '../../lib/cx';
import { fieldClass } from './fieldStyles';

export interface TimeInputProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  invalid?: boolean;
}

/**
 * A time of day (HH:mm). The native control opens the system's own time picker on phones; label
 * it through `aria-labelledby` or a `<label>`.
 */
export function TimeInput({ invalid = false, className, ...rest }: TimeInputProps) {
  return (
    <input
      {...rest}
      type="time"
      aria-invalid={invalid || undefined}
      className={cx(
        fieldClass,
        'h-14 rounded-button-lg px-4 text-lead tabular-nums disabled:opacity-60',
        className,
      )}
    />
  );
}
