import { expect, type APIRequestContext, type Response } from '@playwright/test';
import type { CheckpointStatus } from './planApi.ts';

/* GET /api/stats (PRD F10): what the tab "Statistik" shows. */

export interface LevelProgress {
  level: string;
  title: string;
  nextLevel?: string;
  unitsCompleted: number;
  unitsSkipped: number;
  unitsTotal: number;
  /** Completed and skipped units of the total, 0 to 100. */
  percent: number;
  checkpoint: CheckpointStatus;
}

export interface MasteryArea {
  area: string;
  label: string;
  skillTags: number;
  /** Absent while the area has no tag with a mastery value. */
  mastery?: number;
}

/** One of the top errors: a skill tag with the most wrong first answers of the last 30 days. */
export interface FrequentError {
  skillTag: string;
  label: string;
  errors: number;
  attempts: number;
  errorRate: number;
  category?: string;
  categoryLabel?: string;
  /** Absent when no exercise at or below the learner's level carries the tag. */
  practice?: { kind: 'practice'; skillTag: string };
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  xp: number;
  lessons: number;
  goalMet: boolean;
  frozen: boolean;
}

export interface Stats {
  level?: LevelProgress;
  masteryByArea: MasteryArea[];
  topErrors: FrequentError[];
  heatmap: { from: string; to: string; days: HeatmapDay[] };
  learnedWords: number;
  forecast: { dueNow: number; dueToday: number; dueTomorrow: number; days: { date: string; due: number }[] };
}

/** PRD F10: the five most frequent errors. */
export const TOP_ERRORS = 5;

/** The heatmap covers the last 365 days, today included. */
export const HEATMAP_DAYS = 365;

/** The forecast shows today and the six days after it. */
export const FORECAST_DAYS = 7;

export const isStatsRequest = (response: Response) =>
  response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/stats';

export async function fetchStats(request: APIRequestContext): Promise<Stats> {
  const response = await request.get('/api/stats');
  expect(response.status()).toBe(200);
  return (await response.json()) as Stats;
}
