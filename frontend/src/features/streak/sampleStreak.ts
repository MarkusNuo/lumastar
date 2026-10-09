import type { StreakDay, StreakOverview } from './model';

/*
 * Streak screens for unit tests and the component catalog: Thursday, 8 October 2026, with a streak
 * since 27 September whose band runs across two weeks and over a day bridged by the streak freeze.
 */

const october = (...days: number[]): StreakDay[] =>
  days.map((day) => ({ date: `2026-10-${String(day).padStart(2, '0')}`, status: 'met' }));

const OCTOBER = { month: '2026-10', firstDay: '2026-10-01' } as const;

const BRIDGED_STREAK: StreakDay[] = [
  ...october(1, 2),
  { date: '2026-10-03', status: 'frozen' },
  ...october(4, 5, 6, 7),
];

/** Today's goal met: the flame burns. */
export const SAMPLE_STREAK: StreakOverview = {
  current: 12,
  longest: 21,
  extendedToday: true,
  today: '2026-10-08',
  minutesToday: 12,
  goalMinutes: 10,
  freezes: { available: 0, perWeek: 1, resetsOn: '2026-10-12', lastUsedOn: '2026-10-03' },
  calendar: { ...OCTOBER, days: [...BRIDGED_STREAK, ...october(8)] },
  // Before the goal is reached: the first rungs above the streak, without the goal itself.
  goal: { target: 20, progress: 12, reached: false, options: [30, 50, 75] },
};

/** Today still open: the flame is grey, 6 minutes to go. */
export const SAMPLE_STREAK_COLD: StreakOverview = {
  ...SAMPLE_STREAK,
  current: 11,
  extendedToday: false,
  minutesToday: 4,
  calendar: { ...OCTOBER, days: BRIDGED_STREAK },
  goal: { target: 20, progress: 11, reached: false, options: [30, 50, 75] },
};

/** The goal of 10 days was just reached; the next one is still to choose. */
export const SAMPLE_STREAK_GOAL_REACHED: StreakOverview = {
  ...SAMPLE_STREAK,
  current: 10,
  longest: 10,
  freezes: { available: 1, perWeek: 1, resetsOn: '2026-10-12' },
  calendar: { ...OCTOBER, days: october(1, 2, 3, 4, 5, 6, 7, 8) },
  goal: { target: 10, progress: 10, reached: true, options: [20, 30, 50] },
};

/** A month before the first streak day. */
export const SAMPLE_EMPTY_MONTH: StreakOverview['calendar'] = {
  month: '2026-08',
  firstDay: '2026-08-01',
  days: [],
};
