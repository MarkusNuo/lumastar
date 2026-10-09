import { parseDay } from '../../plan/estimates';
import type { StreakDay, StreakDayStatus } from '../model';

/*
 * The month grid of the streak calendar: weeks start on Monday (as in Swiss calendars), and days
 * that counted for the streak are joined into one band that breaks at gaps and at the week's end.
 */

/** met / frozen: a streak day; open: a past day (or today) without one; future: still to come. */
export type CalendarDayState = StreakDayStatus | 'open' | 'future';

export interface CalendarDay {
  /** ISO day, e.g. "2026-10-03". */
  date: string;
  /** Day of the month. */
  day: number;
  state: CalendarDayState;
  today: boolean;
  /** Streak days only: whether the band runs on into the day before and after in the same row. */
  band?: { joinsBefore: boolean; joinsAfter: boolean };
}

export interface CalendarMonth {
  /** Rows of seven days, Monday first; null pads the first and the last week. */
  weeks: (CalendarDay | null)[][];
  streakDays: number;
  frozenDays: number;
}

const DAYS_PER_WEEK = 7;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/u;

const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-10" for a URL parameter that may hold anything. */
export function isMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** "2026-10-08" → "2026-10" */
export function monthOf(isoDay: string): string {
  return isoDay.slice(0, 7);
}

/** "2026-01" shifted by -1 → "2025-12" */
export function shiftMonth(month: string, by: number): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const shifted = new Date(year, monthNumber - 1 + by, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

/** The months the calendar can show, e.g. "2025-10" to "2026-10". */
export interface MonthRange {
  earliest: string;
  current: string;
}

/** From `monthsBack` months before today's month up to it; the calendar never looks ahead. */
export function monthRange(today: string, monthsBack: number): MonthRange {
  const current = monthOf(today);
  return { earliest: shiftMonth(current, -monthsBack), current };
}

/** The nearest month in the range, e.g. for a URL parameter; one that is no month is the current. */
export function clampMonth(asked: string, { earliest, current }: MonthRange): string {
  if (!isMonth(asked) || asked > current) return current;
  return asked < earliest ? earliest : asked;
}

/** Monday 0 … Sunday 6. */
function weekday(date: Date): number {
  return (date.getDay() + 6) % DAYS_PER_WEEK;
}

export function calendarMonth(month: string, days: StreakDay[], today: string): CalendarMonth {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const length = new Date(year, monthNumber, 0).getDate();
  const status = new Map(days.map((day) => [day.date, day.status]));
  const dateOf = (day: number) => `${month}-${pad(day)}`;
  const isStreak = (day: number) => day >= 1 && day <= length && status.has(dateOf(day));

  const cells: CalendarDay[] = [];
  for (let day = 1; day <= length; day += 1) {
    const date = dateOf(day);
    const column = weekday(parseDay(date));
    const streakStatus = status.get(date);
    cells.push({
      date,
      day,
      state: streakStatus ?? (date > today ? 'future' : 'open'),
      today: date === today,
      band: streakStatus && {
        joinsBefore: column > 0 && isStreak(day - 1),
        joinsAfter: column < DAYS_PER_WEEK - 1 && isStreak(day + 1),
      },
    });
  }

  const lead = weekday(parseDay(dateOf(1)));
  const slots: (CalendarDay | null)[] = [...Array<null>(lead).fill(null), ...cells];
  const trail = (DAYS_PER_WEEK - (slots.length % DAYS_PER_WEEK)) % DAYS_PER_WEEK;
  slots.push(...Array<null>(trail).fill(null));
  const weeks: (CalendarDay | null)[][] = [];
  for (let start = 0; start < slots.length; start += DAYS_PER_WEEK) {
    weeks.push(slots.slice(start, start + DAYS_PER_WEEK));
  }

  return {
    weeks,
    streakDays: cells.filter((cell) => cell.band).length,
    frozenDays: cells.filter((cell) => cell.state === 'frozen').length,
  };
}
