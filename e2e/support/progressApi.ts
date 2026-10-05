import { expect, type APIRequestContext, type Response } from '@playwright/test';

/* The daily goal, the streak (PRD F9) and the settings the tests compare the screens with. */

/** The streak of GET /api/progress/today. */
export interface StreakStatus {
  current: number;
  longest: number;
  /** Streak freezes left this ISO week: 0 or 1 (PRD F9). */
  freezesLeft: number;
  /** Today's goal is met and has extended the streak. */
  extendedToday: boolean;
  lastActiveDate?: string;
  freezeUsedYesterday: boolean;
}

/** GET /api/progress/today: the source of the goal ring and the streak flame of the top bar. */
export interface TodayProgress {
  date: string;
  minutesToday: number;
  goalMinutes: number;
  goalMet: boolean;
  xpToday: number;
  lessonsToday: number;
  streak: StreakStatus;
}

/** GET and PUT /api/settings. */
export interface Settings {
  dailyGoalMinutes: number;
  requestRetention: number;
  timeZone: string;
}

/** The daily goals a learner can choose (PRD F1). */
export const DAILY_GOALS = [5, 10, 15, 20] as const;
export type DailyGoalMinutes = (typeof DAILY_GOALS)[number];

const pathOf = (response: Response) => new URL(response.url()).pathname;

export const isSettingsUpdate = (response: Response) =>
  response.request().method() === 'PUT' && pathOf(response) === '/api/settings';

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.status(), `GET ${path}`).toBe(200);
  return (await response.json()) as T;
}

export const fetchTodayProgress = (request: APIRequestContext) =>
  getJson<TodayProgress>(request, '/api/progress/today');

export const fetchSettings = (request: APIRequestContext) => getJson<Settings>(request, '/api/settings');
