import { expect, test, type APIRequestContext } from '@playwright/test';
import { newApiContext, newLearnerViaApi } from '../../support/auth.ts';
import { asFormat4, type StreakDayRow, type StreakGoalRow } from '../../support/backup.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { finishViaApi, startViaApi, type LessonResponse } from '../../support/lessonApi.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchExport } from '../../support/profileApi.ts';
import { fetchSettings } from '../../support/progressApi.ts';
import {
  addDays,
  chooseStreakGoal,
  fetchStreak,
  FIRST_GOAL,
  monthOf,
  nextMondayAfter,
  putStreakGoal,
  todayIn,
} from '../../support/streakApi.ts';
import { HISTORY_GOAL_MINUTES, importViaApi, run, seedStreakHistory } from '../../support/streakHistory.ts';
import { localTime, moveLearnerTo, secondsLeftInDay, zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * GET /api/streak and PUT /api/streak/goal (M10) through the API, on learners of their own: the
 * defaults, the learner's time zone, the month calendar, the goal ladder and its options (the goals to
 * choose now, before and after reaching, DECISIONS #101), the streak before a lesson and the reached
 * goal in the lesson result, export format 5 and the isolation.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/** Today's goal lacks ten seconds after the import; a lesson through the API takes them. */
const PRACTISED_TODAY_MS = HISTORY_GOAL_MINUTES * 60_000 - 10_000;
const LESSON_MS = 15_000;

async function expectRefused(request: APIRequestContext, body: unknown, code: string): Promise<void> {
  const response = await putStreakGoal(request, body);
  expect(response.status(), `${JSON.stringify(body)}: ${await response.text()}`).toBe(400);
  expect(((await response.json()) as { code: string }).code, JSON.stringify(body)).toBe(code);
}

/** A lesson of the path through the API that takes at least `durationMs` from start to completion. */
async function lessonTaking(request: APIRequestContext, durationMs: number) {
  const started = await startViaApi(request, { unitId: currentUnit(await fetchPath(request)).unitId });
  expect(started.status(), await started.text()).toBe(201);
  const lesson = (await started.json()) as LessonResponse;
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  return { lesson, result: await finishViaApi(request, lesson) };
}

test('a new learner: no streak, the first goal of 10 days with 20, 30 and 50 to switch to, a freeze ready until the Monday after today in the learner\'s time zone', async ({
  page,
}) => {
  await newLearnerViaApi(page.request, 'streak-new');
  const { timeZone } = await fetchSettings(page.request);
  const overview = await fetchStreak(page.request);
  const today = todayIn(timeZone);
  expect(overview).toEqual({
    current: 0,
    longest: 0,
    extendedToday: false,
    today,
    minutesToday: 0,
    goalMinutes: 15,
    freezes: { available: 1, perWeek: 1, resetsOn: nextMondayAfter(today) },
    calendar: { month: monthOf(today), firstDay: `${monthOf(today)}-01`, days: [] },
    goal: { target: FIRST_GOAL, progress: 0, reached: false, options: [20, 30, 50] },
  });

  // UTC+14 and UTC−10 show the same time of day, a day apart: today and the next Monday differ.
  const east = 'Pacific/Kiritimati';
  const west = 'Pacific/Honolulu';
  const left = secondsLeftInDay(localTime(east));
  if (left < 60) await page.waitForTimeout((left + 2) * 1000);
  await moveLearnerTo(page.request, east);
  const eastern = await fetchStreak(page.request);
  await moveLearnerTo(page.request, west);
  const western = await fetchStreak(page.request);
  expect(eastern.today).toBe(todayIn(east));
  expect(western.today).toBe(todayIn(west));
  expect(addDays(western.today, 1), 'a day apart').toBe(eastern.today);
  expect(eastern.freezes.resetsOn).toBe(nextMondayAfter(eastern.today));
  expect(western.freezes.resetsOn).toBe(nextMondayAfter(western.today));
  expect(eastern.calendar.month).toBe(monthOf(eastern.today));
});

test('the calendar shows any month: empty before the first streak day and to come; a malformed month is refused; signed out there is nothing', async ({
  page,
  playwright,
}) => {
  await newLearnerViaApi(page.request, 'streak-months');
  expect((await fetchStreak(page.request, '2030-01')).calendar).toEqual({
    month: '2030-01',
    firstDay: '2030-01-01',
    days: [],
  });
  expect((await fetchStreak(page.request, '2025-02')).calendar.firstDay).toBe('2025-02-01');
  for (const month of ['2026-13', '2026-1', '26-10', 'Oktober']) {
    const response = await page.request.get('/api/streak', { params: { month } });
    expect(response.status(), month).toBe(400);
  }

  const signedOut = await newApiContext(playwright);
  try {
    expect((await signedOut.get('/api/streak')).status()).toBe(401);
    const put = await signedOut.put('/api/streak/goal', { headers: await csrfHeaders(signedOut), data: { target: 20 } });
    expect(put.status()).toBe(401);
  } finally {
    await signedOut.dispose();
  }
});

test('the goal ladder: before a goal is reached any rung above the streak can be chosen, the first three others are offered, anything else is refused', async ({
  page,
}) => {
  await newLearnerViaApi(page.request, 'streak-ladder');
  expect(await chooseStreakGoal(page.request, 20)).toEqual({ target: 20, progress: 0, reached: false, options: [10, 30, 50] });
  for (const target of [10, 30, 50, 75, 100, 150, 200, 250, 300, 365, 465, 565]) {
    expect((await chooseStreakGoal(page.request, target)).target, `${target} days`).toBe(target);
  }
  for (const target of [0, -10, 5, 15, 40, 364, 366, 400, 1000]) {
    await expectRefused(page.request, { target }, 'invalid_streak_goal');
  }
  await expectRefused(page.request, {}, 'validation_failed');
  await expectRefused(page.request, { target: null }, 'validation_failed');
  expect((await fetchStreak(page.request)).goal, 'the last goal chosen').toEqual({
    target: 565,
    progress: 0,
    reached: false,
    options: [10, 20, 30],
  });
});

test('the lesson that extends the streak to its goal reports the streak before it and the reached goal; then only its options can be chosen', async ({
  page,
}) => {
  test.setTimeout(2 * 60_000);
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  await newLearnerViaApi(page.request, 'streak-reach');
  // 19 days with the goal met and a freeze in between, up to yesterday; the goal is 20 days.
  await seedStreakHistory(page.request, {
    timeZone: zone,
    days: [...run(addDays(today, -11), 10), { day: addDays(today, -10), kind: 'freeze' }, ...run(addDays(today, -1), 9)],
    practisedTodayMs: PRACTISED_TODAY_MS,
    goal: { target: 20, reachedOn: null },
  });
  expect((await fetchStreak(page.request)).goal).toEqual({ target: 20, progress: 19, reached: false, options: [30, 50, 75] });

  const first = await lessonTaking(page.request, LESSON_MS);
  expect(first.result.dailyGoal).toMatchObject({ goalMet: true, justMet: true });
  expect(first.result.streak).toEqual({
    current: 20,
    previous: 19,
    extendedToday: true,
    freezeUsed: false,
    goalReached: { target: 20, options: [30, 50, 75] },
  });

  const second = await lessonTaking(page.request, 0);
  expect(second.result.dailyGoal.justMet).toBe(false);
  expect(second.result.streak, 'a later lesson of the day neither extends nor reaches anything').toEqual({
    current: 20,
    previous: 20,
    extendedToday: true,
    freezeUsed: false,
  });

  expect((await fetchStreak(page.request)).goal).toEqual({ target: 20, progress: 20, reached: true, options: [30, 50, 75] });
  for (const target of [20, 100, 150, 365]) await expectRefused(page.request, { target }, 'invalid_streak_goal');
  expect(await chooseStreakGoal(page.request, 75)).toEqual({ target: 75, progress: 20, reached: false, options: [30, 50, 100] });
  await expectRefused(page.request, { target: 20 }, 'invalid_streak_goal');

  const backup = await fetchExport(page.request);
  expect(backup.manifest()).toMatchObject({ schemaVersion: 5, counts: expect.objectContaining({ streakGoals: 1 }) });
  expect(backup.rows<StreakGoalRow>('streak_goals')).toEqual([
    expect.objectContaining({ target: 75, reachedOn: null, reachedAt: null }),
  ]);
  expect(backup.rows<StreakDayRow>('streak_days')).toContainEqual(
    expect.objectContaining({ day: today, kind: 'goal_met', sessionId: first.lesson.sessionId }),
  );

  // Format 4 knew no streak goal: the learner starts with the first one again, reached by the streak.
  const result = await importViaApi(page.request, asFormat4(backup));
  expect(result).toMatchObject({ schemaVersion: 4, imported: expect.objectContaining({ streakGoals: 0 }) });
  const restored = await fetchStreak(page.request);
  expect(restored).toMatchObject({ current: 20, extendedToday: true });
  expect(restored.goal).toEqual({ target: FIRST_GOAL, progress: FIRST_GOAL, reached: true, options: [30, 50, 75] });
});

test('a streak that has run past further rungs only offers goals still ahead of it', async ({ page }) => {
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  await newLearnerViaApi(page.request, 'streak-past');
  await seedStreakHistory(page.request, { timeZone: zone, days: run(addDays(today, -1), 34), practisedTodayMs: 0 });
  const overview = await fetchStreak(page.request);
  expect(overview).toMatchObject({ current: 34, longest: 34 });
  expect(overview.goal).toEqual({ target: FIRST_GOAL, progress: FIRST_GOAL, reached: true, options: [50, 75, 100] });
  for (const target of [20, 30, 150]) await expectRefused(page.request, { target }, 'invalid_streak_goal');
  expect(await chooseStreakGoal(page.request, 50)).toEqual({ target: 50, progress: 34, reached: false, options: [75, 100, 150] });
});

test('a reached goal stays complete after the streak broke: full progress, the next goals above it', async ({
  page,
}) => {
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  await newLearnerViaApi(page.request, 'streak-broken');
  // Twelve days up to three days ago, the goal of 10 days reached on the tenth; then two days missed,
  // one more than the freeze bridges.
  await seedStreakHistory(page.request, {
    timeZone: zone,
    days: run(addDays(today, -3), 12),
    practisedTodayMs: 0,
    goal: { target: FIRST_GOAL, reachedOn: addDays(today, -5) },
  });
  const overview = await fetchStreak(page.request);
  expect(overview).toMatchObject({ current: 0, longest: 12, extendedToday: false });
  expect(overview.goal).toEqual({ target: FIRST_GOAL, progress: FIRST_GOAL, reached: true, options: [20, 30, 50] });
  await expectRefused(page.request, { target: 75 }, 'invalid_streak_goal');
  expect(await chooseStreakGoal(page.request, 20), 'a new goal starts from the broken streak').toEqual({
    target: 20,
    progress: 0,
    reached: false,
    options: [10, 30, 50],
  });
});

test('the streak, its calendar and its goal belong to their learner', async ({ page, playwright }) => {
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  await newLearnerViaApi(page.request, 'streak-owner-a', 'Arben');
  await seedStreakHistory(page.request, { timeZone: zone, days: run(addDays(today, -1), 3), practisedTodayMs: 0 });
  await chooseStreakGoal(page.request, 20);
  const ownerBefore = await fetchStreak(page.request);

  const other = await newApiContext(playwright);
  try {
    await newLearnerViaApi(other, 'streak-owner-b', 'Blerim');
    await moveLearnerTo(other, zone);
    const overview = await fetchStreak(other);
    expect(overview).toMatchObject({ current: 0, longest: 0 });
    expect(overview.calendar.days).toEqual([]);
    expect((await fetchStreak(other, monthOf(addDays(today, -3)))).calendar.days).toEqual([]);
    expect(overview.goal).toEqual({ target: FIRST_GOAL, progress: 0, reached: false, options: [20, 30, 50] });
    await chooseStreakGoal(other, 30);
  } finally {
    await other.dispose();
  }
  expect(await fetchStreak(page.request), "the other learner's goal changes nothing here").toEqual(ownerBefore);
});
