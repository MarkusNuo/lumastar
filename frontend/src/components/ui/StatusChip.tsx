import type { Icon } from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import type { Tone } from './tones';

export interface StatusChipProps {
  tone: Tone;
  icon: Icon;
  label: string;
  className?: string;
}

/** Small coloured pill naming a state, e.g. "Bestätigt" next to an e-mail address. */
export function StatusChip({ tone, icon: ChipIcon, label, className }: StatusChipProps) {
  return (
    <span
      data-tone={tone}
      className={cx(
        'inline-flex items-center gap-1 rounded-full tone-outline px-2.5 py-0.5 text-caption font-extrabold whitespace-nowrap',
        className,
      )}
    >
      <ChipIcon aria-hidden="true" size={14} weight="bold" />
      {label}
    </span>
  );
}
