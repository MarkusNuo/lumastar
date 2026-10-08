import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useId, useMemo } from 'react';
import { IconButton } from '../../../components/ui/IconButton';
import { cx } from '../../../lib/cx';
import { STREAK_COPY } from '../copy';
import type { StreakMonth } from '../model';
import { calendarMonth, monthOf, shiftMonth, type CalendarDay } from './calendarMonth';

const copy = STREAK_COPY.calendar;

export interface StreakCalendarProps {
  calendar: StreakMonth;
  /** Today in the learner's time zone; later months cannot be opened. */
  today: string;
  /** The first month the back arrow leads to. */
  earliestMonth: string;
  onMonthChange: (month: string) => void;
  /** Another month is loading; the shown one stays until it arrives. */
  busy?: boolean;
}

/** Half a day's width on both sides of the middle of a cell: where a band ends round. */
const BAND_END = 'calc(50% - var(--spacing-calendar-day) / 2)';

/**
 * One month of streak days (Monday first). Days in a row form one continuous band that breaks at
 * the end of a week and at missed days; a day bridged by the streak freeze shows in ice blue.
 */
export function StreakCalendar({
  calendar,
  today,
  earliestMonth,
  onMonthChange,
  busy = false,
}: StreakCalendarProps) {
  const titleId = useId();
  const { month } = calendar;
  const layout = useMemo(
    () => calendarMonth(month, calendar.days, today),
    [month, calendar.days, today],
  );

  return (
    <section
      aria-labelledby={titleId}
      data-testid="streak-calendar"
      className="flex flex-col gap-3 rounded-card border-2 border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <IconButton
          icon={CaretLeftIcon}
          label={copy.previous}
          size="sm"
          disabled={month <= earliestMonth}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        />
        <h2 id={titleId} aria-live="polite" className="text-lead font-black">
          {copy.title(month)}
        </h2>
        <IconButton
          icon={CaretRightIcon}
          label={copy.next}
          size="sm"
          disabled={month >= monthOf(today)}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        />
      </div>
      <table
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        className={cx(
          'w-full table-fixed border-collapse transition-opacity duration-(--duration-fast)',
          busy && 'opacity-60',
        )}
      >
        <thead>
          <tr>
            {copy.weekdays.map((weekday) => (
              <th
                key={weekday.short}
                scope="col"
                abbr={weekday.long}
                className="pb-1 text-micro font-black text-fg-subtle uppercase"
              >
                {weekday.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {layout.weeks.map((week) => (
            <tr key={week.find((cell) => cell !== null)?.date}>
              {week.map((cell, column) =>
                cell ? <DayCell key={cell.date} cell={cell} /> : <td key={`pad-${column}`} />,
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-label font-bold text-fg-muted">
        {layout.streakDays > 0 ? copy.summary(layout.streakDays, layout.frozenDays) : copy.empty}
      </p>
      <Legend />
    </section>
  );
}

function DayCell({ cell }: { cell: CalendarDay }) {
  const { band, state, today } = cell;
  const tone = state === 'frozen' ? 'freeze' : 'streak';

  return (
    <td
      aria-label={copy.day(cell.date, state, today)}
      data-state={state}
      data-today={today || undefined}
      className="relative h-12 p-0 text-center"
    >
      {band && (
        <span
          aria-hidden="true"
          data-tone={tone}
          data-band={bandShape(band)}
          style={{
            left: band.joinsBefore ? 0 : BAND_END,
            right: band.joinsAfter ? 0 : BAND_END,
          }}
          className={cx(
            'absolute top-1/2 h-(--spacing-calendar-day) -translate-y-1/2 bg-tone-face edge-3d',
            !band.joinsBefore && 'rounded-l-full',
            !band.joinsAfter && 'rounded-r-full',
            state === 'frozen' && 'calendar-ice',
          )}
        />
      )}
      <span
        data-tone={band ? tone : undefined}
        className={cx(
          'relative mx-auto grid size-(--spacing-calendar-day) place-items-center rounded-full text-label font-black tabular-nums',
          band && 'text-tone-on',
          state === 'open' && 'text-fg-muted',
          state === 'future' && 'text-fg-subtle opacity-50',
          today && (band ? 'ring-3 ring-fg ring-inset' : 'border-3 border-fg text-fg'),
        )}
      >
        {cell.day}
      </span>
    </td>
  );
}

/** "start", "middle", "end" or "single": which part of a band a day is. */
function bandShape({ joinsBefore, joinsAfter }: NonNullable<CalendarDay['band']>): string {
  if (joinsBefore && joinsAfter) return 'middle';
  if (joinsBefore) return 'end';
  return joinsAfter ? 'start' : 'single';
}

function Legend() {
  return (
    <ul
      aria-hidden="true"
      className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-bold text-fg-muted"
    >
      <li className="inline-flex items-center gap-1.5">
        <span data-tone="streak" className="h-3 w-5 rounded-full bg-tone-face" />
        {copy.legend.met}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span data-tone="freeze" className="h-3 w-5 rounded-full bg-tone-face calendar-ice" />
        {copy.legend.frozen}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2 border-fg" />
        {copy.legend.today}
      </li>
    </ul>
  );
}
