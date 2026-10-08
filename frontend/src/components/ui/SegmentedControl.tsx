import { useId } from 'react';
import { cx } from '../../lib/cx';
import { playCue } from '../../lib/effects/playCue';

export interface SegmentedOption<Value extends string | number> {
  value: Value;
  label: string;
}

export interface SegmentedControlProps<Value extends string | number> {
  options: readonly SegmentedOption<Value>[];
  value: Value | undefined;
  onChange: (value: Value) => void;
  /** Names the group, e.g. the label of a settings row. */
  'aria-labelledby': string;
  'aria-describedby'?: string;
  /** A change is being saved; further taps are ignored, focus stays. */
  busy?: boolean;
  disabled?: boolean;
  /** Large chips for a choice that is the moment's main action, e.g. the next streak goal. */
  size?: 'md' | 'lg';
  className?: string;
}

const chipSize = {
  md: 'min-h-12 rounded-button-sm text-label',
  lg: 'min-h-16 rounded-button text-lead',
} as const;

/**
 * One choice out of a few, side by side: native radio buttons (arrow keys move the choice) dressed
 * as 3D chips, e.g. the daily goal.
 */
export function SegmentedControl<Value extends string | number>({
  options,
  value,
  onChange,
  busy = false,
  disabled = false,
  size = 'md',
  className,
  ...labels
}: SegmentedControlProps<Value>) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      {...labels}
      aria-busy={busy || undefined}
      className={cx('grid auto-cols-fr grid-flow-col gap-2', className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={checked}
              disabled={disabled}
              onChange={() => {
                if (busy) return;
                playCue('tap');
                onChange(option.value);
              }}
              className="peer sr-only"
            />
            <span
              data-tone={checked ? 'primary' : 'neutral'}
              className={cx(
                'flex w-full pressable items-center justify-center tone-outline px-2 font-extrabold whitespace-nowrap peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                chipSize[size],
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
