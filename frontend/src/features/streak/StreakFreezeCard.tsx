import { ArrowsClockwiseIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { FreezeShield } from '../../components/ui/FreezeShield';
import { STREAK_COPY } from './copy';
import type { StreakFreezes } from './model';

const copy = STREAK_COPY.freeze;

/** "Streak-Schutz" (PRD F9): this week's freeze, what it does and when the next one comes. */
export function StreakFreezeCard({ freezes }: { freezes: StreakFreezes }) {
  const titleId = useId();
  const { available, perWeek, resetsOn, lastUsedOn } = freezes;

  return (
    <section
      aria-labelledby={titleId}
      data-testid="streak-freezes"
      className="flex flex-col gap-3 rounded-card border-2 border-border bg-surface p-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 gap-1.5">
          {Array.from({ length: perWeek }, (_, index) => (
            <FreezeShield key={index} ready={index < available} className="h-16 w-14" />
          ))}
        </div>
        <div className="min-w-0">
          <h2 id={titleId} className="text-micro font-black tracking-wider text-fg-muted uppercase">
            {copy.title}
          </h2>
          <p
            className={available > 0 ? 'text-lead font-black text-freeze' : 'text-lead font-black'}
          >
            {copy.status(available, perWeek)}
          </p>
        </div>
      </div>
      <p className="text-body font-bold text-fg">{copy.explanation}</p>
      <ul className="flex flex-col gap-1.5 text-label font-bold text-fg-muted">
        <li className="flex items-start gap-2">
          <ArrowsClockwiseIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="mt-px shrink-0"
          />
          {copy.resetsOn(resetsOn)}
        </li>
        <li className="flex items-start gap-2">
          <ClockCounterClockwiseIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="mt-px shrink-0"
          />
          {lastUsedOn ? copy.lastUsed(lastUsedOn) : copy.neverUsed}
        </li>
      </ul>
    </section>
  );
}
