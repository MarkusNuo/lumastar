import { ShieldCheckIcon } from '@phosphor-icons/react';
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
  className?: string;
}

export function StreakCounter({ days, active, freezes = 0, className }: StreakCounterProps) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-grid">
        <Flame
          lit={active}
          className={cx('size-7 origin-bottom', active && 'motion-safe:animate-flicker')}
        />
        {freezes > 0 && <FreezeShield />}
      </span>
      <PopNumber
        value={days}
        className={cx(
          'text-lead font-black tabular-nums',
          active ? 'text-streak' : 'text-fg-subtle',
        )}
      />
      <span className="sr-only">{UI_COPY.streak(days, active, freezes)}</span>
    </span>
  );
}

function FreezeShield() {
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
