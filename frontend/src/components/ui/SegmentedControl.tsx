import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { cx } from '../../lib/cx';
import { playCue } from '../../lib/effects/playCue';
import { focusInPlace } from '../../lib/focus';

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
  /**
   * automatic: the arrow keys choose, as with native radio buttons. manual: they only move the
   * focus and Space, Enter or a tap chooses, for a choice that is saved at once (passing over a
   * chip must not save it).
   */
  activation?: 'automatic' | 'manual';
  /** Takes the focus when it appears (on the chosen chip, else the first), e.g. after "Ändern". */
  focusOnMount?: boolean;
  className?: string;
}

const ARROW_STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const radiosIn = (group: HTMLElement | null) => [...(group?.querySelectorAll('input') ?? [])];

const chipSize = {
  md: 'min-h-12 rounded-button-sm text-label',
  lg: 'min-h-16 rounded-button text-lead',
} as const;

/**
 * One choice out of a few, side by side: native radio buttons dressed as 3D chips, e.g. the daily
 * goal.
 */
export function SegmentedControl<Value extends string | number>({
  options,
  value,
  onChange,
  busy = false,
  disabled = false,
  size = 'md',
  activation = 'automatic',
  focusOnMount = false,
  className,
  ...labels
}: SegmentedControlProps<Value>) {
  const name = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusOnMount) return;
    const radios = radiosIn(groupRef.current);
    focusInPlace(radios.find((radio) => radio.checked) ?? radios[0]);
  }, [focusOnMount]);

  const choose = (chosen: Value) => {
    if (busy) return;
    playCue('tap');
    onChange(chosen);
  };

  /** Arrows walk round the chips like radio buttons do, but only Enter (or Space) chooses. */
  const manualKey = (event: KeyboardEvent<HTMLInputElement>, chip: Value, index: number) => {
    const step = ARROW_STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      const radios = radiosIn(groupRef.current);
      focusInPlace(radios[(index + step + radios.length) % radios.length]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (chip !== value) choose(chip);
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      {...labels}
      aria-busy={busy || undefined}
      className={cx('grid auto-cols-fr grid-flow-col gap-2', className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={checked}
              disabled={disabled}
              onChange={() => choose(option.value)}
              onKeyDown={
                activation === 'manual'
                  ? (event) => manualKey(event, option.value, index)
                  : undefined
              }
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
