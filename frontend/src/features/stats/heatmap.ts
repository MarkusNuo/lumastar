import type { Heatmap, HeatmapDay } from '../../api/types';
import { parseDay } from '../plan/estimates';

/*
 * The calendar heatmap of the statistics tab (PRD F10): one column per week (Monday on top, as in
 * Swiss calendars), the oldest week on the left, today in the last column.
 */

/** How a day looks: a frozen day is marked as such even though nothing was practised. */
export type HeatLevel = 'none' | 'practised' | 'goal' | 'frozen';

export interface HeatCell {
  date: string;
  minutes: number;
  level: HeatLevel;
  today: boolean;
}

export interface MonthLabel {
  /** 0 = January. */
  month: number;
  /** The week column where the month starts. */
  column: number;
}

export interface HeatmapLayout {
  /** Seven entries per week; null before the first day of the year shown. */
  weeks: (HeatCell | null)[][];
  months: MonthLabel[];
  totals: { practised: number; goals: number; frozen: number };
}

const DAYS_PER_WEEK = 7;
/** A month label needs about three columns; a shorter month at the left edge gets none. */
const MIN_LABEL_GAP = 3;

/** Monday 0 … Sunday 6. */
function weekday(date: Date): number {
  return (date.getDay() + 6) % DAYS_PER_WEEK;
}

export function heatLevel(day: HeatmapDay): HeatLevel {
  if (day.frozen) return 'frozen';
  if (day.goalMet) return 'goal';
  return day.minutes > 0 || day.lessons > 0 ? 'practised' : 'none';
}

export function heatmapLayout(heatmap: Heatmap): HeatmapLayout {
  const first = heatmap.days[0];
  const lead = first ? weekday(parseDay(first.date)) : 0;
  const slots: (HeatCell | null)[] = [
    ...Array<null>(lead).fill(null),
    ...heatmap.days.map((day) => ({
      date: day.date,
      minutes: day.minutes,
      level: heatLevel(day),
      today: day.date === heatmap.to,
    })),
  ];
  const weeks: (HeatCell | null)[][] = [];
  for (let start = 0; start < slots.length; start += DAYS_PER_WEEK) {
    weeks.push(slots.slice(start, start + DAYS_PER_WEEK));
  }
  return { weeks, months: monthLabels(weeks), totals: totals(heatmap.days) };
}

function monthLabels(weeks: (HeatCell | null)[][]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  weeks.forEach((week, column) => {
    const firstOfMonth = week.find((cell) => cell?.date.endsWith('-01'));
    const start = firstOfMonth ?? (column === 0 ? week.find((cell) => cell !== null) : undefined);
    if (!start) return;
    const month = parseDay(start.date).getMonth();
    const previous = labels.at(-1);
    if (previous && column - previous.column < MIN_LABEL_GAP) {
      // The new month wins over a partial one at the left edge.
      if (previous.column === 0) labels.pop();
      else return;
    }
    labels.push({ month, column });
  });
  return labels;
}

function totals(days: readonly HeatmapDay[]): HeatmapLayout['totals'] {
  return {
    practised: days.filter((day) => day.minutes > 0 || day.lessons > 0).length,
    goals: days.filter((day) => day.goalMet).length,
    frozen: days.filter((day) => day.frozen).length,
  };
}
