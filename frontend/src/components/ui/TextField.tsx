import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { fieldClass } from './fieldStyles';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label: string;
  hint?: string;
  error?: string;
  /** Control inside the right end of the field, e.g. a visibility toggle. */
  trailing?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  trailing,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-label font-extrabold text-fg-muted">
        {label}
      </label>
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cx(
            fieldClass,
            'h-14 rounded-button-lg px-4 text-body disabled:opacity-60',
            trailing !== undefined && 'pr-14',
          )}
        />
        {trailing !== undefined && (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cx('text-caption font-bold', error ? 'text-danger' : 'text-fg-subtle')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
