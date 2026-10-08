import { ShieldCheckIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import { Flame } from './Flame';
import { PopNumber } from './PopNumber';
import { UI_COPY } from './copy';

export interface StreakCounterProps {
  days: number;
  /** Lit when today's goal is reached; grey while the streak is still at risk. */
  active: boolean;
  /** Streak freezes left this week; a small shield on the flame shows that one is ready. */
  freezes?: number;
  /** Makes the counter a link, e.g. to the streak screen; its name is the streak as read aloud. */
  to?: string;
  className?: string;
}

export function StreakCounter({ days, active, freezes = 0, to, className }: StreakCounterProps) {
  const content = (
    <>
      <span className="relative inline-grid">
        <Flame
          lit={active}
          className={cx('size-7 origin-bottom', active && 'motion-safe:animate-flicker')}
        />
        {freezes > 0 && <ShieldBadge />}
      </span>
      <PopNumber
        value={days}
        className={cx(
          'text-lead font-black tabular-nums',
          active ? 'text-streak' : 'text-fg-subtle',
        )}
      />
      <span className="sr-only">{UI_COPY.streak(days, active, freezes)}</span>
    </>
  );
  return to ? (
    <CounterLink to={to} className={className}>
      {content}
    </CounterLink>
  ) : (
    <span className={cx('inline-flex items-center gap-1.5', className)}>{content}</span>
  );
}

function CounterLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cx(
        '-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-button-sm px-2 transition-[background-color,scale] duration-(--duration-fast) select-none hover:bg-surface active:scale-95 active:bg-surface-raised',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function ShieldBadge() {
  return (
    <span
      aria-hidden="true"
      data-testid="streak-freeze"
      className="absolute -right-1.5 -bottom-1 grid size-4 place-items-center rounded-full bg-bg"
    >
      <ShieldCheckIcon size={14} weight="fill" className="text-freeze" />
    </span>
  );
}
