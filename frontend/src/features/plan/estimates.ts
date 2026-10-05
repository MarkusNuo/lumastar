import type { LearningPath, Level } from '../../api/types';
import { parseLevel } from '../../app/learnerStats';
import { CEFR_LEVELS, type CefrLevel } from '../../components/ui/levels';

const DAY_MS = 86_400_000;
const swissDate = new Intl.DateTimeFormat('de-CH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "2026-11-10" (a day without a time zone) as local midnight, so it never shifts by a day. */
export function parseDay(isoDay: string): Date {
  const [year = 0, month = 1, day = 1] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "2026-11-10" → "10. Nov. 2026" */
export function formatDay(isoDay: string): string {
  return swissDate.format(parseDay(isoDay));
}

/** Whole days from the start of `today` to the day, at least 0. */
export function daysUntil(isoDay: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((parseDay(isoDay).getTime() - start.getTime()) / DAY_MS));
}

/** The CEFR band of a level: "A1.2" → "A1". */
export function bandOf(level: Level): CefrLevel {
  return parseLevel(level).level;
}

export interface BandEstimate {
  band: CefrLevel;
  /** ISO day by which the band's last stage is expected to be done. */
  day: string;
}

/** The estimates of the plan in level order (the API keys them by band, A0 has none). */
export function bandEstimates(path: LearningPath): BandEstimate[] {
  return CEFR_LEVELS.flatMap((band) => {
    const day = path.estimates[band];
    return day ? [{ band, day }] : [];
  });
}

/** The next band to finish: the current one, or A1 while still at A0. */
export function nextGoal(path: LearningPath): BandEstimate | undefined {
  const current = CEFR_LEVELS.indexOf(bandOf(path.currentLevel));
  return bandEstimates(path).find(({ band }) => CEFR_LEVELS.indexOf(band) >= current);
}
