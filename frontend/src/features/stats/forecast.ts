import type { DueForecast } from '../../api/types';
import { parseDay } from '../plan/estimates';
import { STATS_COPY } from './copy';

export interface ForecastBar {
  date: string;
  /** "Heute", then the short weekday: "Di" */
  label: string;
  /** Read by screen readers: "Dienstag, 6. Oktober". */
  longLabel: string;
  due: number;
  /** Height relative to the busiest day, 0..1. */
  share: number;
}

const shortDay = new Intl.DateTimeFormat('de-CH', { weekday: 'short' });
const longDay = new Intl.DateTimeFormat('de-CH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** The 7-day FSRS forecast as bars; today includes the overdue cards. */
export function forecastBars(forecast: DueForecast): ForecastBar[] {
  const busiest = Math.max(1, ...forecast.days.map((day) => day.due));
  return forecast.days.map((day, index) => {
    const date = parseDay(day.date);
    const today = index === 0;
    return {
      date: day.date,
      label: today ? STATS_COPY.forecast.today : shortDay.format(date),
      longLabel: today ? STATS_COPY.forecast.today : longDay.format(date),
      due: day.due,
      share: day.due / busiest,
    };
  });
}
