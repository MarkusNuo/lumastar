import { expect, type APIRequestContext, type APIResponse, type Response } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';

/* The streak screen and the streak goal of M10: GET /api/streak and PUT /api/streak/goal. */

export type StreakDayStatus = 'met' | 'frozen';

export interface StreakCalendarDay {
  date: string;
  status: StreakDayStatus;
}

export interface StreakFreezes {
  /** Freezes left this ISO week, 0 or 1; a freeze bridging yesterday is deducted already. */
  available: number;
  perWeek: number;
  /** The next Monday after today, in the learner's time zone. */
  resetsOn: string;
  /** The last day a freeze bridged; absent before the first time. */
  lastUsedOn?: string;
}

export interface StreakGoal {
  target: number;
  /** The current streak, at most the target. */
  progress: number;
  reached: boolean;
  /** Once reached: the next three rungs above max(target, streak), ascending; empty before. */
  options: number[];
}

/** GET /api/streak. */
export interface StreakOverview {
  current: number;
  longest: number;
  extendedToday: boolean;
  /** Today in the learner's time zone. */
  today: string;
  minutesToday: number;
  goalMinutes: number;
  freezes: StreakFreezes;
  calendar: { month: string; firstDay: string; days: StreakCalendarDay[] };
  goal: StreakGoal;
}

/** The rungs of the streak goal ladder up to a year; then every 100 days more (DECISIONS #98). */
export const GOAL_LADDER = [10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365] as const;

/** The first goal of every learner. */
export const FIRST_GOAL = 10;

export function isRung(days: number): boolean {
  return (GOAL_LADDER as readonly number[]).includes(days) || (days > 365 && (days - 365) % 100 === 0);
}

function* ladder(): Generator<number> {
  yield* GOAL_LADDER;
  for (let rung = 465; ; rung += 100) yield rung;
}

/** The lowest rungs of the ladder above `days`, ascending. */
export function rungsAbove(days: number, count = 3): number[] {
  const rungs: number[] = [];
  for (const rung of ladder()) {
    if (rungs.length === count) break;
    if (rung > days) rungs.push(rung);
  }
  return rungs;
}

const pathOf = (response: Response) => new URL(response.url()).pathname;

export const isGoalUpdate = (response: Response) =>
  response.request().method() === 'PUT' && pathOf(response) === '/api/streak/goal';

export const isStreakRequest = (response: Response) =>
  response.request().method() === 'GET' && pathOf(response) === '/api/streak';

export async function fetchStreak(request: APIRequestContext, month?: string): Promise<StreakOverview> {
  const response = await request.get('/api/streak', month ? { params: { month } } : {});
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as StreakOverview;
}

/** PUT /api/streak/goal; the caller checks the status (400 invalid_streak_goal for a goal not to choose). */
export async function putStreakGoal(request: APIRequestContext, body: unknown): Promise<APIResponse> {
  return request.put('/api/streak/goal', { headers: await csrfHeaders(request), data: body });
}

/** Chooses a streak goal through the API and returns the new goal. */
export async function chooseStreakGoal(request: APIRequestContext, target: number): Promise<StreakGoal> {
  const response = await putStreakGoal(request, { target });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as StreakGoal;
}

/* Calendar days as ISO dates ("2026-10-08"), computed in UTC so no time zone shifts them. */

const MS_PER_DAY = 24 * 3600 * 1000;
const asUtc = (isoDay: string) => new Date(`${isoDay}T00:00:00Z`);

export function addDays(isoDay: string, days: number): string {
  return new Date(asUtc(isoDay).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Monday 0 … Sunday 6. */
export function weekdayOf(isoDay: string): number {
  return (asUtc(isoDay).getUTCDay() + 6) % 7;
}

/** The Monday of the ISO week of the day. */
export const mondayOf = (isoDay: string) => addDays(isoDay, -weekdayOf(isoDay));

/** The Monday after the day (a week later on a Monday): when the next streak freeze comes. */
export const nextMondayAfter = (isoDay: string) => addDays(mondayOf(isoDay), 7);

/** "2026-10-08" → "2026-10" */
export const monthOf = (isoDay: string) => isoDay.slice(0, 7);

/** "2026-01" shifted by -1 → "2025-12" */
export function shiftMonth(month: string, by: number): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
  return shifted.toISOString().slice(0, 7);
}

/** Every day of a month, in order. */
export function daysOfMonth(month: string): string[] {
  const days: string[] = [];
  for (let day = `${month}-01`; monthOf(day) === month; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Today in a time zone, as the backend computes it for a learner there. */
export function todayIn(timeZone: string, at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}
