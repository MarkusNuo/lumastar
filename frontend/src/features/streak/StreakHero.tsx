import { TimerIcon } from '@phosphor-icons/react';
import { Flame } from '../../components/ui/Flame';
import { StreakFlame } from '../../components/ui/StreakFlame';
import { cx } from '../../lib/cx';
import { STREAK_COPY } from './copy';
import type { StreakOverview } from './model';

const copy = STREAK_COPY.hero;

export type StreakHeroProps = Pick<
  StreakOverview,
  'current' | 'longest' | 'extendedToday' | 'minutesToday' | 'goalMinutes'
>;

/**
 * The top of the streak screen: the big number with the flame, lit once today's goal is met, and
 * what is left to do today.
 */
export function StreakHero({
  current,
  longest,
  extendedToday,
  minutesToday,
  goalMinutes,
}: StreakHeroProps) {
  return (
    <section
      data-testid="streak-hero"
      className={cx(
        'relative isolate flex flex-col items-start gap-2 overflow-hidden rounded-card-lg border-2 p-5',
        extendedToday ? 'border-streak bg-streak-surface' : 'border-border bg-surface',
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <p className="flex flex-col">
          <span
            aria-hidden="true"
            className={cx(
              'text-hero font-black tabular-nums',
              extendedToday ? 'text-streak' : 'text-fg',
            )}
          >
            {current}
          </span>
          <span aria-hidden="true" className="text-title font-black text-fg">
            {copy.unit(current)}
          </span>
          <span className="sr-only">{copy.label(current)}</span>
        </p>
        <StreakFlame lit={extendedToday} className="-my-2 size-32 shrink-0" />
      </div>
      <p
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label font-extrabold',
          extendedToday ? 'bg-bg text-streak' : 'bg-surface-raised text-fg',
        )}
      >
        {extendedToday ? (
          <Flame lit className="size-5 shrink-0" />
        ) : (
          <TimerIcon aria-hidden="true" size={18} weight="bold" className="shrink-0" />
        )}
        {extendedToday ? copy.doneToday : copy.minutesLeft(Math.max(0, goalMinutes - minutesToday))}
      </p>
      <p className="text-label font-bold text-fg-muted">{copy.longest(longest)}</p>
    </section>
  );
}
