import { expect, test, type Page } from '@playwright/test';
import { AppShell, streakText } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { StreakCelebration, watchForPathFlash, type PathFlashRecord } from '../../pages/StreakCelebration.ts';
import { StreakPage } from '../../pages/StreakPage.ts';
import { newLearnerViaApi } from '../../support/auth.ts';
import { mostWrongableTag } from '../../support/lessonAnswers.ts';
import { isLessonStart } from '../../support/lessonApi.ts';
import { openLesson, playLessonToResult, playOpenedLesson } from '../../support/lessonFlow.ts';
import { fetchTodayProgress } from '../../support/progressApi.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { snap } from '../../support/screenshots.ts';
import {
  addDays,
  fetchStreak,
  isGoalUpdate,
  mondayOf,
  monthOf,
  recordGoalUpdates,
  todayIn,
} from '../../support/streakApi.ts';
import { HISTORY_GOAL_MINUTES, run, seedStreakHistory } from '../../support/streakHistory.ts';
import { zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * The streak celebration of M10 on learners of their own, with days of streak before today from an
 * imported backup (support/streakHistory.ts) and the daily goal all but met: one lesson through the UI
 * meets it. The show plays with motion (the other tests reduce it) on the page's own clock, which the
 * test stops right before the celebration and moves on step by step, so the frames are the same in
 * every run. The learner lives where it is about midday, so no day ends during the test. The keyboard
 * and the focus lesson after the celebration need no show: those tests reduce motion.
 */
test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: 'no-preference' });

/** Today's goal (5 min.) lacks 20 seconds after the import; the lesson takes them, with a margin. */
const PRACTISED_TODAY_MS = HISTORY_GOAL_MINUTES * 60_000 - 20_000;
const LESSON_MS = 25_000;

/** PRD F7: a skill tag with at least three mistakes in one lesson suggests a focus lesson. */
const FOCUS_MISTAKES = 3;

/** Stops the page's clock: the celebration that opens next waits in its first frame. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.pauseAt(new Date(Date.now() + 50));
}

/** One step of the stopped clock: about one frame. */
const STEP_MS = 20;

/**
 * Moves the stopped clock on, a frame at a time and no faster than real time, until `read` returns
 * `expected`. Motion runs some animations (e.g. opacity) natively in the browser, on its own clock,
 * and starts them at the page's time: running the page's clock ahead would hold them back.
 */
async function advanceUntil<T>(page: Page, read: () => Promise<T>, expected: T, message: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const value = await read();
        if (value !== expected) await page.clock.runFor(STEP_MS);
        return value;
      },
      { message, intervals: [STEP_MS], timeout: 15_000 },
    )
    .toBe(expected);
}

/** The URL stayed on the given lesson pages, and neither the app frame nor the learning path showed. */
function expectNoPathOnTheWay(record: PathFlashRecord, ...lessonPaths: string[]): void {
  expect(
    record.paths.filter((path) => !lessonPaths.includes(path)),
    'the URL never left the lesson',
  ).toEqual([]);
  expect(record.navigation, 'the app navigation never showed').toBe(false);
  expect(record.learningPath, 'the learning path never showed').toBe(false);
}

test('the lesson that meets the daily goal and the streak goal: the flame ignites in place of the result, counts 9 → 10, then the trophy with the next goals', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  const frozenDay = addDays(today, -5);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const resultScreen = new LessonResultScreen(page);
  const celebration = new StreakCelebration(page);
  const streakPage = new StreakPage(page);

  await test.step('a learner with nine days of streak up to yesterday, one day bridged by the freeze', async () => {
    await newLearnerViaApi(page.request, 'streak-goal', 'Drita');
    await seedStreakHistory(page.request, {
      timeZone: zone,
      // An earlier streak of four days ended with two missed days; the streak since has nine days
      // with the goal met and a freeze in between.
      days: [
        ...run(addDays(today, -13), 4),
        ...run(addDays(today, -6), 5),
        { day: frozenDay, kind: 'freeze' },
        ...run(addDays(today, -1), 4),
      ],
      practisedTodayMs: PRACTISED_TODAY_MS,
    });
    const before = await fetchStreak(page.request);
    expect(before).toMatchObject({ current: 9, longest: 9, extendedToday: false, today, goalMinutes: 5 });
    expect(before.goal).toEqual({ target: 10, progress: 9, reached: false, options: [20, 30, 50] });
  });

  await page.clock.install();
  await path.goto();
  await shell.expectProgress(await fetchTodayProgress(page.request));

  const { result } = await test.step('one lesson meets the goal of five minutes', () =>
    playLessonToResult(page, LESSON_MS),
  );
  expect(result.dailyGoal).toMatchObject({ goalMinutes: 5, goalMet: true, justMet: true });
  expect(result.streak).toEqual({
    current: 10,
    previous: 9,
    extendedToday: true,
    freezeUsed: false,
    goalReached: { target: 10, options: [20, 30, 50] },
  });
  await resultScreen.expectDailyGoal(result.dailyGoal);
  const lessonPath = new URL(page.url()).pathname;
  expect(lessonPath).toMatch(/^\/lesson\//);
  const pathFlash = await watchForPathFlash(page);

  await test.step('"Weiter": the celebration replaces the result in place, the cold flame shivers with the 9', async () => {
    await stopClock(page);
    await resultScreen.continueButton.click();
    await celebration.expectPhase('intro');
    await expect(page).toHaveURL(new RegExp(`${lessonPath}$`));
    await expect(celebration.flame).toHaveAttribute('data-lit', 'false');
    await celebration.expectNumber(9);
    await expect(celebration.heading(10), 'read aloud: the new streak').toBeAttached();
    await expect(celebration.continueButton, 'there from the start').toBeEnabled();
    await expect(shell.bottomNav).toHaveCount(0);
    await snap(page, 'streak-celebration-intro', { fullPage: false });
  });

  await test.step('the flame catches, throws embers and the number counts up to 10', async () => {
    await advanceUntil(page, () => celebration.phase(), 'show', 'the flame catches');
    await expect(celebration.flame).toHaveAttribute('data-lit', 'true');
    expect(await celebration.embers.count(), 'embers fly').toBeGreaterThan(0);
    await advanceUntil(page, () => celebration.shownNumber(), '10', 'the number counts up');
    await advanceUntil(page, () => celebration.numbersOnScreen(), 1, 'the 9 has shrunk away');
    expect(await celebration.phase(), 'still in the show').toBe('show');
    await snap(page, 'streak-celebration-ignite', { fullPage: false });
  });

  await test.step('everything settles: kicker, text and the mascot\'s cheer; no path on the way', async () => {
    await advanceUntil(page, () => celebration.phase(), 'settled', 'the show settles');
    await celebration.expectSettled(result.streak);
    await expect(celebration.freezeNote, 'today needed no freeze').toHaveCount(0);
    await advanceUntil(page, () => celebration.numbersOnScreen(), 1, 'the 9 has gone');
    await snap(page, 'streak-celebration-settled', { fullPage: false });
    expectNoPathOnTheWay(await pathFlash(), lessonPath);
  });

  await test.step('"Weiter": the trophy of the reached goal with 20, 30 and 50 days to choose from', async () => {
    await celebration.continueButton.click();
    await expect(celebration.goalBeat).toHaveAttribute('data-phase', 'intro');
    await advanceUntil(
      page,
      () => celebration.goalBeat.getAttribute('data-phase'),
      'settled',
      'the trophy settles',
    );
    await celebration.expectGoalBeat({ target: 10, options: [20, 30, 50] });
    await expect(celebration.laterNote).toBeVisible();
    await snap(page, 'streak-goal-reached', { fullPage: false });
    expectNoPathOnTheWay(await pathFlash(), lessonPath);
  });

  await test.step('a chip saves the next goal at once', async () => {
    // Saving needs the page's timers again (the query client schedules its updates with them).
    await page.clock.resume();
    await celebration.chooseGoal(30);
    await expect(celebration.laterNote).toHaveCount(0);
    await snap(page, 'streak-goal-chosen', { fullPage: false });
    expect((await fetchStreak(page.request)).goal).toEqual({
      target: 30,
      progress: 10,
      reached: false,
      options: [20, 50, 75],
    });
  });

  await test.step('"Weiter": the path with the burning flame', async () => {
    await celebration.continueButton.click();
    await shell.expectHome();
    const progress = await fetchTodayProgress(page.request);
    expect(progress.streak).toMatchObject({ current: 10, longest: 10, extendedToday: true });
    await shell.expectProgress(progress);
    await expect(shell.streakLink).toHaveAccessibleName(streakText(10, true, progress.streak.freezesLeft));
  });

  await test.step('the flame opens the streak screen: 10 days, lit, the new goal of 30 days', async () => {
    await shell.openStreak();
    const overview = await fetchStreak(page.request);
    expect(overview).toMatchObject({ current: 10, longest: 10, extendedToday: true, today });
    expect(overview.freezes).toMatchObject({
      available: mondayOf(frozenDay) === mondayOf(today) ? 0 : 1,
      lastUsedOn: frozenDay,
    });
    await streakPage.expectOverview(overview);
  });
});

test('a streak saved by the freeze: the grey streak screen before, then the celebration 12 → 13 with the freeze note, skipped with a tap', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  const yesterday = addDays(today, -1);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const resultScreen = new LessonResultScreen(page);
  const celebration = new StreakCelebration(page);
  const streakPage = new StreakPage(page);
  const freezeLeftThisWeek = mondayOf(yesterday) === mondayOf(today) ? 0 : 1;

  await test.step('a learner with twelve days of streak up to the day before yesterday and a goal of 20', async () => {
    await newLearnerViaApi(page.request, 'streak-freeze', 'Besa');
    await seedStreakHistory(page.request, {
      timeZone: zone,
      days: run(addDays(today, -2), 12),
      practisedTodayMs: PRACTISED_TODAY_MS,
      goal: { target: 20, reachedOn: null },
    });
  });

  await page.clock.install();
  await path.goto();

  await test.step('the grey flame of the top bar opens the streak screen: yesterday bridged, today still open', async () => {
    const progress = await fetchTodayProgress(page.request);
    expect(progress.streak).toMatchObject({ current: 12, extendedToday: false, freezesLeft: freezeLeftThisWeek });
    await shell.expectProgress(progress);
    await shell.openStreak();
    const overview = await fetchStreak(page.request);
    expect(overview).toMatchObject({ current: 12, longest: 12, extendedToday: false, minutesToday: 4 });
    expect(overview.freezes).toMatchObject({ available: freezeLeftThisWeek, lastUsedOn: yesterday });
    if (monthOf(yesterday) === monthOf(today)) {
      expect(overview.calendar.days, 'the bridged day shows while it bridges').toContainEqual({
        date: yesterday,
        status: 'frozen',
      });
    }
    expect(overview.goal).toEqual({ target: 20, progress: 12, reached: false, options: [30, 50, 75] });
    await streakPage.expectOverview(overview);
    await snap(page, 'streak-screen-cold', { fullPage: false });
    await streakPage.backButton.click();
    await path.expectVisible();
  });

  const { result } = await test.step('one lesson meets the goal', () => playLessonToResult(page, LESSON_MS));
  expect(result.streak, 'the freeze carried the streak over yesterday').toEqual({
    current: 13,
    previous: 12,
    extendedToday: true,
    freezeUsed: true,
  });
  const lessonPath = new URL(page.url()).pathname;
  const pathFlash = await watchForPathFlash(page);

  await test.step('a tap skips the show: the lit flame, the 13 and the freeze note at once', async () => {
    await stopClock(page);
    await resultScreen.continueButton.click();
    await celebration.expectPhase('intro');
    await celebration.expectNumber(12);
    await celebration.screen.tap();
    // Settled without the clock moving on: nothing waits for a timer after a tap.
    await celebration.expectSettled(result.streak);
    await expect(celebration.freezeNote).toBeVisible();
    await expect(celebration.embers, 'no show after a skip').toHaveCount(0);
    await advanceUntil(page, () => celebration.numbersOnScreen(), 1, 'the 12 has gone');
    await snap(page, 'streak-celebration-freeze', { fullPage: false });
    expectNoPathOnTheWay(await pathFlash(), lessonPath);
  });

  await test.step('"Weiter": no trophy (the goal of 20 is ahead), straight to the path', async () => {
    await page.clock.resume();
    await celebration.continueButton.click();
    await shell.expectHome();
    await expect(celebration.goalBeat).toHaveCount(0);
    await shell.expectProgress(await fetchTodayProgress(page.request));
  });

  await test.step('the streak screen after: 13 days, the frozen day stays, today is a streak day', async () => {
    await shell.openStreak();
    const overview = await fetchStreak(page.request);
    expect(overview).toMatchObject({ current: 13, longest: 13, extendedToday: true });
    expect(overview.freezes).toMatchObject({ available: freezeLeftThisWeek, lastUsedOn: yesterday });
    expect(overview.goal).toEqual({ target: 20, progress: 13, reached: false, options: [30, 50, 75] });
    await streakPage.expectOverview(overview);
  });
});

test('an imported streak of six days without its recorded days: the celebration counts on from 6 to 7', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  const { zone } = zoneAroundMidday();
  const today = todayIn(zone);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const resultScreen = new LessonResultScreen(page);
  const celebration = new StreakCelebration(page);

  await test.step('a backup with the stored streak of six days up to yesterday, but none of its days', async () => {
    await newLearnerViaApi(page.request, 'streak-no-days', 'Mimoza');
    await seedStreakHistory(page.request, {
      timeZone: zone,
      days: run(addDays(today, -1), 6),
      practisedTodayMs: PRACTISED_TODAY_MS,
      withoutDayRows: true,
    });
    const before = await fetchStreak(page.request);
    expect(before).toMatchObject({ current: 6, longest: 6, extendedToday: false });
    expect(before.calendar.days, 'no day recorded').toEqual([]);
  });

  await page.clock.install();
  await path.goto();
  const { result } = await test.step('one lesson meets the goal', () => playLessonToResult(page, LESSON_MS));
  expect(result.streak, 'the streak before: the stored one').toEqual({
    current: 7,
    previous: 6,
    extendedToday: true,
    freezeUsed: false,
  });
  const lessonPath = new URL(page.url()).pathname;
  const pathFlash = await watchForPathFlash(page);

  await test.step('"Weiter": the cold flame with the 6, then the number counts up to 7', async () => {
    await stopClock(page);
    await resultScreen.continueButton.click();
    await celebration.expectPhase('intro');
    await celebration.expectNumber(6);
    await advanceUntil(page, () => celebration.phase(), 'show', 'the flame catches');
    await advanceUntil(page, () => celebration.shownNumber(), '7', 'the number counts up');
    await advanceUntil(page, () => celebration.phase(), 'settled', 'the show settles');
    await celebration.expectSettled(result.streak);
    expectNoPathOnTheWay(await pathFlash(), lessonPath);
  });

  await test.step('"Weiter": no trophy (the goal of 10 is ahead), the path with 7 days', async () => {
    await page.clock.resume();
    await celebration.continueButton.click();
    await shell.expectHome();
    await expect(celebration.goalBeat).toHaveCount(0);
    const progress = await fetchTodayProgress(page.request);
    expect(progress.streak).toMatchObject({ current: 7, longest: 7, extendedToday: true });
    await shell.expectProgress(progress);
  });
});

test.describe('motion reduced', () => {
  // As everywhere but above: the screens settle at once.
  test.use({ reducedMotion: 'reduce' });

  test('with the keyboard: the focus moves into the celebration and on into the trophy beat; the arrow keys walk the chips without saving, Enter saves', async ({
    page,
  }) => {
    test.setTimeout(3 * 60_000);
    const { zone } = zoneAroundMidday();
    const today = todayIn(zone);
    const shell = new AppShell(page);
    const resultScreen = new LessonResultScreen(page);
    const celebration = new StreakCelebration(page);

    await newLearnerViaApi(page.request, 'streak-keyboard', 'Vjosa');
    await seedStreakHistory(page.request, {
      timeZone: zone,
      days: run(addDays(today, -1), 9),
      practisedTodayMs: PRACTISED_TODAY_MS,
    });
    await new LearningPathPage(page).goto();
    const { result } = await playLessonToResult(page, LESSON_MS);
    expect(result.streak.goalReached, 'the goal of 10 days').toEqual({ target: 10, options: [20, 30, 50] });
    const goalUpdates = recordGoalUpdates(page);

    await test.step('Enter on "Weiter": the heading of the celebration takes the focus, Tab leads to "Weiter"', async () => {
      await resultScreen.continueButton.focus();
      await page.keyboard.press('Enter');
      await celebration.expectSettled(result.streak);
      await expect(celebration.heading(10), 'the focus on the celebration').toBeFocused();
      await page.keyboard.press('Tab');
      await expect(celebration.continueButton).toBeFocused();
    });

    await test.step('Enter: the heading of the trophy beat takes the focus, Tab leads to the first chip', async () => {
      await page.keyboard.press('Enter');
      await celebration.expectGoalBeat({ target: 10, options: [20, 30, 50] });
      await expect(celebration.goalHeading(10), 'the focus on the trophy beat').toBeFocused();
      await page.keyboard.press('Tab');
      await expect(celebration.goalOption(20)).toBeFocused();
    });

    await test.step('the arrow keys only move the focus between the chips: nothing is chosen or saved', async () => {
      for (const [key, focused] of [
        ['ArrowRight', 30],
        ['ArrowRight', 50],
        ['ArrowRight', 20],
        ['ArrowLeft', 50],
        ['ArrowLeft', 30],
      ] as const) {
        await page.keyboard.press(key);
        await expect(celebration.goalOption(focused), `${key}: ${focused} days`).toBeFocused();
      }
      await expect(celebration.goalChooser().getByRole('radio', { checked: true })).toHaveCount(0);
      await expect(celebration.goalSaved).toHaveCount(0);
      expect(goalUpdates(), 'no goal saved while walking the chips').toEqual([]);
      await snap(page, 'streak-goal-keyboard', { fullPage: false });
    });

    await test.step('Enter saves the chip with the focus, once', async () => {
      const saved = page.waitForResponse(isGoalUpdate);
      await page.keyboard.press('Enter');
      expect((await saved).status()).toBe(200);
      await expect(celebration.goalOption(30)).toBeChecked();
      await expect(celebration.goalSaved).toHaveText('Neues Ziel: 30 Tage');
      expect(goalUpdates()).toEqual([{ target: 30 }]);
      expect((await fetchStreak(page.request)).goal.target).toBe(30);
    });

    await test.step('Tab and Enter: "Weiter" leads to the path', async () => {
      await page.keyboard.press('Tab');
      await expect(celebration.continueButton).toBeFocused();
      await page.keyboard.press('Enter');
      await shell.expectHome();
    });
  });

  test('"Fokus-Lektion starten" on the lesson that meets the goal: the celebration and the trophy first, then the focus lesson, never the path in between', async ({
    page,
  }) => {
    test.setTimeout(4 * 60_000);
    const { zone } = zoneAroundMidday();
    const today = todayIn(zone);
    const path = new LearningPathPage(page);
    const player = new LessonPlayer(page);
    const resultScreen = new LessonResultScreen(page);
    const celebration = new StreakCelebration(page);

    await newLearnerViaApi(page.request, 'streak-focus', 'Fjolla');
    await seedStreakHistory(page.request, {
      timeZone: zone,
      days: run(addDays(today, -1), 9),
      practisedTodayMs: PRACTISED_TODAY_MS,
    });
    await path.goto();

    const result = await test.step(`${FOCUS_MISTAKES} mistakes on one skill tag, in the lesson that meets the goal`, async () => {
      const opened = await openLesson(page, () => path.startCurrentLesson());
      const weak = mostWrongableTag(opened.lesson.exercises);
      if (!weak || weak.candidates.length < FOCUS_MISTAKES) {
        throw new Error(`No skill tag of the lesson has ${FOCUS_MISTAKES} exercises to answer wrong for sure`);
      }
      const wrong = new Set(weak.candidates.slice(0, FOCUS_MISTAKES).map((exercise) => exercise.id));
      const deadline = Date.now() + LESSON_MS;
      return playOpenedLesson(page, opened, {
        intentOf: (exercise) => (wrong.has(exercise.id) ? 'wrong' : 'correct'),
        end: resultScreen.heading,
        // The lesson's time runs from its start to its end, so one wait before the first answer will do.
        beforeAnswer: async (_exercise, step) => {
          if (step === 0) await page.waitForTimeout(Math.max(0, deadline - Date.now()));
        },
      });
    });
    expect(result.dailyGoal).toMatchObject({ goalMet: true, justMet: true });
    expect(result.streak.goalReached, 'the goal of 10 days').toEqual({ target: 10, options: [20, 30, 50] });
    const suggestion = result.focusSuggestion;
    if (!suggestion) throw new Error(`The lesson with ${FOCUS_MISTAKES} mistakes on one skill tag suggests no focus lesson`);
    const lessonPath = new URL(page.url()).pathname;
    const pathFlash = await watchForPathFlash(page);

    await test.step('"Fokus-Lektion starten": the celebration in place of the result, then the trophy', async () => {
      const start = resultScreen.focusStartButton(suggestion.label);
      await start.scrollIntoViewIfNeeded();
      await start.click();
      await celebration.expectSettled(result.streak);
      await expect(page, 'still the lesson that met the goal').toHaveURL(new RegExp(`${escapeRegExp(lessonPath)}$`));
      await celebration.continueButton.click();
      await celebration.expectGoalBeat({ target: 10, options: [20, 30, 50] });
    });

    await test.step('"Weiter": the focus lesson starts in the lesson player', async () => {
      // Not played to its end: only its start is awaited (openLesson would also wait for its completion).
      const started = page.waitForResponse(isLessonStart);
      await celebration.continueButton.click();
      const response = await started;
      expect(response.status(), 'the focus lesson starts').toBe(201);
      expect(await response.json()).toMatchObject({ kind: 'focus', unitId: suggestion.unitId });
      const focusPath = `/lesson/${encodeURIComponent(suggestion.unitId)}`;
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(focusPath)}$`));
      await expect(player.exercise).toBeVisible();
      expectNoPathOnTheWay(await pathFlash(), lessonPath, focusPath);
    });
  });
});
