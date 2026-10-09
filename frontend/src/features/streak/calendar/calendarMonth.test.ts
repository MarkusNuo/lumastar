import { describe, expect, it } from 'vitest';
import type { StreakDay } from '../model';
import {
  calendarMonth,
  clampMonth,
  isMonth,
  monthOf,
  monthRange,
  shiftMonth,
  type CalendarDay,
} from './calendarMonth';

/* October 2026 starts on a Thursday; the 8th (a Thursday) is today. */
const TODAY = '2026-10-08';

const met = (...days: number[]): StreakDay[] =>
  days.map((day) => ({ date: `2026-10-${String(day).padStart(2, '0')}`, status: 'met' }));

function dayOf(layout: ReturnType<typeof calendarMonth>, day: number): CalendarDay {
  const found = layout.weeks.flat().find((cell) => cell?.day === day);
  if (!found) throw new Error(`No day ${day}`);
  return found;
}

describe('calendarMonth', () => {
  it('lays the month out in weeks from Monday to Sunday', () => {
    const { weeks } = calendarMonth('2026-10', [], TODAY);

    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.map((cell) => cell?.day ?? null)).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks[4]?.map((cell) => cell?.day ?? null)).toEqual([26, 27, 28, 29, 30, 31, null]);
  });

  it('needs no padding in front of a month that starts on a Monday', () => {
    const { weeks } = calendarMonth('2026-06', [], '2026-10-08');

    expect(weeks[0]?.[0]?.day).toBe(1);
    expect(weeks.flat().every((cell) => cell === null || cell.state === 'open')).toBe(true);
  });

  it('joins adjacent streak days into one band with two ends', () => {
    const layout = calendarMonth('2026-10', met(5, 6, 7), TODAY);

    expect(dayOf(layout, 5).band).toEqual({ joinsBefore: false, joinsAfter: true });
    expect(dayOf(layout, 6).band).toEqual({ joinsBefore: true, joinsAfter: true });
    expect(dayOf(layout, 7).band).toEqual({ joinsBefore: true, joinsAfter: false });
    expect(dayOf(layout, 8).band).toBeUndefined();
    expect(layout.streakDays).toBe(3);
  });

  it('breaks the band at the end of a week and at gaps', () => {
    const layout = calendarMonth('2026-10', met(10, 11, 12, 14), TODAY);

    // Sunday the 11th ends its row, Monday the 12th starts the next one.
    expect(dayOf(layout, 11).band).toEqual({ joinsBefore: true, joinsAfter: false });
    expect(dayOf(layout, 12).band).toEqual({ joinsBefore: false, joinsAfter: false });
    expect(dayOf(layout, 14).band).toEqual({ joinsBefore: false, joinsAfter: false });
  });

  it('keeps a frozen day inside the band it bridges', () => {
    const days: StreakDay[] = [...met(1, 2), { date: '2026-10-03', status: 'frozen' }, ...met(4)];
    const layout = calendarMonth('2026-10', days, TODAY);

    expect(dayOf(layout, 3).state).toBe('frozen');
    expect(dayOf(layout, 3).band).toEqual({ joinsBefore: true, joinsAfter: true });
    expect(dayOf(layout, 4).band).toEqual({ joinsBefore: true, joinsAfter: false });
    expect(layout.frozenDays).toBe(1);
    expect(layout.streakDays).toBe(4);
  });

  it('starts and ends the band at the edges of the month', () => {
    const layout = calendarMonth('2026-10', met(1, 31), TODAY);

    expect(dayOf(layout, 1).band?.joinsBefore).toBe(false);
    expect(dayOf(layout, 31).band?.joinsAfter).toBe(false);
  });

  it('marks today and the days still to come', () => {
    const layout = calendarMonth('2026-10', met(8), TODAY);

    expect(dayOf(layout, 8)).toMatchObject({ state: 'met', today: true });
    expect(dayOf(layout, 7)).toMatchObject({ state: 'open', today: false });
    expect(dayOf(layout, 9)).toMatchObject({ state: 'future', today: false });
  });
});

describe('month helpers', () => {
  it('shifts months across the turn of the year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', -12)).toBe('2025-10');
  });

  it('reads the month of a day and recognises month parameters', () => {
    expect(monthOf('2026-10-08')).toBe('2026-10');
    expect(isMonth('2026-10')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('oktober')).toBe(false);
  });

  it('reaches from a year back to the current month', () => {
    expect(monthRange(TODAY, 12)).toEqual({ earliest: '2025-10', current: '2026-10' });
  });

  it('keeps an asked month within reach and moves one beyond it to the nearest end', () => {
    const range = monthRange(TODAY, 12);

    expect(clampMonth('2026-03', range)).toBe('2026-03');
    expect(clampMonth('2025-10', range)).toBe('2025-10');
    expect(clampMonth('2025-09', range)).toBe('2025-10');
    expect(clampMonth('1999-01', range)).toBe('2025-10');
    expect(clampMonth('2026-11', range)).toBe('2026-10');
    expect(clampMonth('2030-01', range)).toBe('2026-10');
  });

  it('takes the current month for a parameter that is no month', () => {
    const range = monthRange(TODAY, 12);

    expect(clampMonth('2026-13', range)).toBe('2026-10');
    expect(clampMonth('', range)).toBe('2026-10');
  });
});
