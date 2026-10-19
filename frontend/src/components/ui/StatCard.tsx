import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import type { Tone } from './tones';

export interface StatCardProps {
  label: string;
  icon: Icon;
  /** The value, e.g. a counting number; kept on one line. */
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** Coloured result card of the lesson end: label on the face, value below. */
export function StatCard({
  label,
  icon: StatIcon,
  children,
  tone = 'xp',
  className,
}: StatCardProps) {
  return (
    <div
      data-tone={tone}
      className={cx('flex min-w-0 flex-col rounded-card-sm bg-tone-face p-0.5 edge-3d', className)}
    >
      {/* Tight tracking and padding so "Genauigkeit" fits a third of a 360 px screen. */}
      <p className="truncate px-1 py-1 text-center text-micro font-black tracking-wide text-tone-on uppercase">
        {label}
      </p>
      <p className="flex min-h-14 items-center justify-center gap-1.5 rounded-[calc(var(--radius-card-sm)-2px)] bg-bg px-2 text-lead font-black whitespace-nowrap text-tone-text tabular-nums">
        <StatIcon aria-hidden="true" size={22} weight="fill" className="shrink-0" />
        {children}
      </p>
    </div>
  );
}
