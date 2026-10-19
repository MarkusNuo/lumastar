import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import {
  countKey,
  entriesOf,
  type BackupEntries,
  type DataTable,
  type Manifest,
  type StreakDayRow,
  type StreakGoalRow,
  type StreakRow,
} from './backup.ts';
import { csrfHeaders } from './csrf.ts';
import { playLessonViaApi } from './lessonApi.ts';
import { currentUnit, fetchPath } from './planApi.ts';
import { fetchExport, type ImportResult } from './profileApi.ts';
import { fetchSettings } from './progressApi.ts';
import { addDays, mondayOf } from './streakApi.ts';

/*
 * A streak of many days for a new learner of a test (M10). The backend has no test clock, so the
 * days before today come from a backup: the learner plays one lesson through the API, exports, and
 * imports the export again with the streak days, the stored streak and the minutes practised today
 * changed. An import never extends the streak itself; the next lesson that meets the daily goal does,
 * as on any other day, and only needs to take the few seconds still missing.
 */

/** The smallest daily goal (PRD F1): the seeded practice time leaves only seconds of it open. */
export const HISTORY_GOAL_MINUTES = 5;

export interface HistoryDay {
  day: string;
  kind: StreakDayRow['kind'];
}

export interface StreakHistory {
  /** The learner's time zone; every day is a date there. */
  timeZone: string;
  /** The days before today that counted for the streak, in any order. */
  days: HistoryDay[];
  /**
   * The lesson of the learner, finished just now, is stretched to this long, so that today's goal is
   * that much on its way (and must stay below the goal: an import does not meet it).
   */
  practisedTodayMs: number;
  /** The stored streak goal; without one the learner has the first goal of 10 days. */
  goal?: { target: number; reachedOn: string | null };
  /** The daily goal after the import; five minutes unless given. */
  dailyGoalMinutes?: number;
  /**
   * Imports the stored streak without its days, as a backup may hold it whose days were never
   * recorded (DECISIONS #101): the streak counts on from the stored row alone.
   */
  withoutDayRows?: boolean;
}

/** The stored streak the days stand for: the run of the last day with its goal met, and the longest. */
export function streakOf(days: HistoryDay[]): Omit<StreakRow, 'id' | 'updatedAt'> {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  let run = 0;
  let longest = 0;
  let previous: string | undefined;
  for (const { day, kind } of sorted) {
    const joins = previous !== undefined && addDays(previous, 1) === day;
    run = (joins ? run : 0) + (kind === 'goal_met' ? 1 : 0);
    longest = Math.max(longest, run);
    previous = day;
  }
  const lastMet = sorted.filter((day) => day.kind === 'goal_met').at(-1)?.day ?? null;
  const lastFreeze = sorted.filter((day) => day.kind === 'freeze').at(-1)?.day ?? null;
  return {
    currentDays: lastMet === null ? 0 : run,
    longestDays: longest,
    lastActiveDate: lastMet,
    // The week of the last freeze has none left; every other week has its freeze.
    freezesAvailable: lastFreeze === null ? 1 : 0,
    freezesRefilledOn: lastFreeze === null ? null : mondayOf(lastFreeze),
  };
}

const noonOf = (day: string) => `${day}T12:00:00Z`;

/** Replaces the rows of a learner table and its count in the manifest. */
function withRows(entries: BackupEntries, table: DataTable, rows: object[]): BackupEntries {
  const manifest = JSON.parse(entries['manifest.json'] ?? '{}') as Manifest;
  return {
    ...entries,
    [`data/${table}.json`]: JSON.stringify(rows),
    'manifest.json': JSON.stringify({ ...manifest, counts: { ...manifest.counts, [countKey(table)]: rows.length } }),
  };
}

function edited(entries: BackupEntries, file: string, edit: (data: never) => unknown): BackupEntries {
  return { ...entries, [file]: JSON.stringify(edit(JSON.parse(entries[file] ?? 'null') as never)) };
}

/** POST /api/profile/import of a ZIP made of the given entries. */
export async function importViaApi(request: APIRequestContext, entries: BackupEntries): Promise<ImportResult> {
  const files = Object.fromEntries(Object.entries(entries).map(([name, content]) => [name, strToU8(content)]));
  const response = await request.post('/api/profile/import', {
    headers: await csrfHeaders(request),
    multipart: {
      file: { name: 'lumastar-export.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync(files)) },
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as ImportResult;
}

/**
 * Gives the signed-in (new) learner the history: a lesson through the API, then its export imported
 * again with the learner in `timeZone`, a daily goal of five minutes, the streak days, the stored
 * streak and the goal.
 */
export async function seedStreakHistory(request: APIRequestContext, history: StreakHistory): Promise<void> {
  await playLessonViaApi(request, currentUnit(await fetchPath(request)).unitId);
  const backup = await fetchExport(request);
  const [existingStreak] = backup.rows<StreakRow>('streaks');
  const now = new Date().toISOString();

  let entries = entriesOf(backup);
  entries = edited(entries, 'data/profile.json', (profile: Record<string, unknown>) => ({
    ...profile,
    timeZone: history.timeZone,
    dailyGoalMinutes: history.dailyGoalMinutes ?? HISTORY_GOAL_MINUTES,
  }));
  entries = edited(entries, 'data/sessions.json', (sessions: { startedAt: string; finishedAt: string | null }[]) => {
    expect(sessions, 'the lesson just played').toHaveLength(1);
    return sessions.map((session) => ({
      ...session,
      startedAt: new Date(Date.parse(session.finishedAt ?? now) - history.practisedTodayMs).toISOString(),
    }));
  });
  const streak: StreakRow = { id: existingStreak?.id ?? randomUUID(), ...streakOf(history.days), updatedAt: now };
  entries = withRows(entries, 'streaks', [streak]);
  const recordedDays = history.withoutDayRows ? [] : history.days;
  entries = withRows(
    entries,
    'streak_days',
    recordedDays.map(
      ({ day, kind }): StreakDayRow & { recordedAt: string } => ({
        id: randomUUID(),
        day,
        kind,
        goalMinutes: kind === 'goal_met' ? HISTORY_GOAL_MINUTES : null,
        sessionId: null,
        placementTestId: null,
        recordedAt: noonOf(day),
      }),
    ),
  );
  const goals: StreakGoalRow[] = history.goal
    ? [
        {
          id: randomUUID(),
          target: history.goal.target,
          reachedOn: history.goal.reachedOn,
          reachedAt: history.goal.reachedOn === null ? null : noonOf(history.goal.reachedOn),
          updatedAt: now,
        },
      ]
    : [];
  entries = withRows(entries, 'streak_goals', goals);
  await importViaApi(request, entries);
}

/**
 * PUT /api/settings with another daily goal: like every change of the goal, it extends the streak
 * when today's practice meets the new goal (without a lesson, so no celebration).
 */
export async function setDailyGoalViaApi(request: APIRequestContext, dailyGoalMinutes: number): Promise<void> {
  const settings = await fetchSettings(request);
  const response = await request.put('/api/settings', {
    headers: await csrfHeaders(request),
    data: { ...settings, dailyGoalMinutes },
  });
  expect(response.status(), await response.text()).toBe(200);
}

/** `count` days in a row ending on `last`, all of one kind. */
export function run(last: string, count: number, kind: HistoryDay['kind'] = 'goal_met'): HistoryDay[] {
  return Array.from({ length: count }, (_, index) => ({ day: addDays(last, -index), kind }));
}
