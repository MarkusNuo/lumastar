import { CheckIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'children' | 'checked'
> {
  checked: boolean;
  /** The label; it may contain a link, which opens without ticking the box. */
  children: ReactNode;
  error?: string;
}

/** A big tappable check box with a 3D edge; the native input stays for keyboard and forms. */
export function Checkbox({ checked, children, error, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="flex min-h-12 cursor-pointer items-center gap-3">
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          data-tone={checked ? 'primary' : error ? 'danger' : 'neutral'}
          className={cx(
            'grid size-8 shrink-0 place-items-center rounded-sm border-2 edge-3d transition-colors duration-(--duration-fast) peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus',
            checked
              ? 'border-tone-edge bg-tone-face text-tone-on'
              : 'border-tone-border bg-surface',
          )}
        >
          <AnimatePresence initial={false}>
            {checked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={springs.bouncy}
                className="inline-flex"
              >
                <CheckIcon size={20} weight="bold" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1 text-label font-bold text-fg">{children}</span>
      </label>
      {error && (
        <p id={errorId} className="pl-11 text-caption font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
