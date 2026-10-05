import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { playCue } from '../../lib/effects/playCue';
import type { Tone } from './tones';

export type OptionResult = 'correct' | 'wrong';

export interface OptionCardProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  label: string;
  description?: string;
  /** Leading element: an icon, a number key hint or a small illustration. */
  marker?: ReactNode;
  selected?: boolean;
  /** Colours the card after checking a multiple-choice answer. */
  result?: OptionResult;
  labelLang?: string;
}

function optionTone(selected: boolean, result: OptionResult | undefined): Tone {
  if (result === 'correct') return 'success';
  if (result === 'wrong') return 'danger';
  return selected ? 'primary' : 'neutral';
}

export function OptionCard({
  label,
  description,
  marker,
  selected = false,
  result,
  labelLang,
  type = 'button',
  className,
  onClick,
  ...rest
}: OptionCardProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Locked options (after checking) stay focusable but no longer answer with a tap sound.
    if (!rest['aria-disabled']) playCue('tap');
    onClick?.(event);
  };

  return (
    <button
      {...rest}
      type={type}
      onClick={handleClick}
      aria-pressed={selected}
      data-tone={optionTone(selected, result)}
      className={cx(
        'flex min-h-16 w-full pressable items-center gap-3 rounded-card-sm tone-outline px-4 py-3 text-left disabled:opacity-60',
        className,
      )}
    >
      {marker && (
        <span className="grid size-9 shrink-0 place-items-center rounded-button-sm border-2 border-tone-border text-caption font-black text-tone-text">
          {marker}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span lang={labelLang} className="text-body font-extrabold">
          {label}
        </span>
        {description && <span className="text-caption font-bold text-fg-muted">{description}</span>}
      </span>
    </button>
  );
}
