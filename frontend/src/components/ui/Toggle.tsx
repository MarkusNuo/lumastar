import { useId } from 'react';
import { cx } from '../../lib/cx';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /**
   * A change is under way: the switch ignores taps but stays focusable, so keyboard and
   * screen-reader users keep their place (a disabled button would drop the focus).
   */
  busy?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  busy = false,
  className,
}: ToggleProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className={cx('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cx('text-body font-extrabold', disabled ? 'text-fg-subtle' : 'text-fg')}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-caption font-bold text-fg-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        aria-disabled={busy || undefined}
        aria-busy={busy || undefined}
        onClick={() => {
          if (!busy) onChange(!checked);
        }}
        className="group relative h-8 w-13 shrink-0 cursor-pointer rounded-full border-2 border-border bg-surface-raised transition-colors duration-(--duration-base) disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-50 aria-checked:border-primary-edge aria-checked:bg-primary"
      >
        <span
          aria-hidden="true"
          className="absolute top-0.5 left-0.5 size-6 rounded-full bg-fg shadow-knob transition-[translate] duration-(--duration-base) ease-bounce group-aria-checked:translate-x-5"
        />
      </button>
    </div>
  );
}
