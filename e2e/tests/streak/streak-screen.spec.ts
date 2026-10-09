import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { CatalogPage } from '../../pages/CatalogPage.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { StreakCelebration } from '../../pages/StreakCelebration.ts';
import { days, StreakPage } from '../../pages/StreakPage.ts';
import { newLearnerViaApi } from '../../support/auth.ts';
import type { StreakDayRow, StreakGoalRow } from '../../support/backup.ts';
import { fetchExport } from '../../support/profileApi.ts';
import { fetchSettings, fetchTodayProgress } from '../../support/progressApi.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';
import {
  addDays,
  fetchStreak,
  FIRST_GOAL,
  isGoalUpdate,
  monthOf,
  putStreakGoal,
  recordGoalUpdates,
  shiftMonth,
  todayIn,
  type StreakCalendarDay,
} from '../../support/streakApi.ts';
import { HISTORY_GOAL_MINUTES, run, seedStreakHistory, setDailyGoalViaApi } from '../../support/streakHistory.ts';
import { zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * The streak screen of M10 behind the flame of the top bar: the shared learner's own streak (read
 * only), the month navigation, and learners of their own with a history from an imported backup:
 * bands across weeks, a gap, a frozen day, maybe two months, a streak that reaches its first goal
 * (the goal card with the mouse and the keyboard), and a reached goal after the streak broke.
 */

test('the flame of the top bar opens the streak screen with the streak, the month, the goal and the freeze', async ({
  page,
}) => {
  const shell = new AppShell(page);
  const streakPage = new StreakPage(page);
  await new LearningPathPage(page).goto();
  await shell.openStreak();

  const overview = await fetchStreak(page.request);
  const progress = await fetchTodayProgress(page.request);
  const { timeZone } = await fetchSettings(page.request);
  expect(overview.today, "today in the learner's time zone").toBe(todayIn(timeZone));
  expect(overview, 'the same streak as the top bar').toMatchObject({
    current: progress.streak.current,
    longest: progress.streak.longest,
    extendedToday: progress.streak.extendedToday,
    minutesToday: progress.minutesToday,
    goalMinutes: progress.goalMinutes,
  });
  expect(overview.freezes.available).toBe(progress.streak.freezesLeft);
  expect(overview.calendar).toMatchObject({ month: monthOf(overview.today), firstDay: `${monthOf(overview.today)}-01` });
  expect(overview.goal, 'the first goal of every learner').toMatchObject({
    target: FIRST_GOAL,
    progress: Math.min(overview.current, FIRST_GOAL),
  });

  await streakPage.expectOverview(overview);
  await expect(shell.bottomNav, 'a full screen without the app navigation').toHaveCount(0);
  const todayCell = streakPage.dayCells.and(page.locator('[data-today]'));
  await expect(todayCell, 'today is marked').toHaveCount(1);
  await expect(todayCell).toHaveAttribute('aria-label', new RegExp(', heute: '));
  await snap(page, 'streak-screen', { fullPage: false });
  await snap(page, 'streak-screen-calendar', { element: streakPage.calendar });
  await scrollToTop(streakPage.goalCard);
  await snap(page, 'streak-screen-bottom', { fullPage: false });

  await streakPage.backButton.click();
  await shell.expectHome();
});

test('the calendar steps back month by month for a year, the month stays in the URL', async ({ page }) => {
  const streakPage = new StreakPage(page);
  const { today } = await fetchStreak(page.request);
  const month = monthOf(today);
  const previous = shiftMonth(month, -1);
  const daysOf = async (shown: string): Promise<StreakCalendarDay[]> =>
    (await fetchStreak(page.request, shown)).calendar.days;

  await streakPage.goto();
  await expect(streakPage.nextMonth, 'no months to come').toBeDisabled();

  await streakPage.previousMonth.click();
  await expect(page).toHaveURL(new RegExp(`/streak\\?month=${previous}$`));
  await streakPage.expectMonth(previous, await daysOf(previous), today);
  await expect(streakPage.nextMonth).toBeEnabled();

  await page.reload();
  await streakPage.expectMonth(previous, await daysOf(previous), today);

  await streakPage.nextMonth.click();
  await expect(page, 'the current month needs no parameter').toHaveURL(/\/streak$/);
  await streakPage.expectMonth(month, await daysOf(month), today);

  await page.goto('/streak?month=2026-13');
  await expect(streakPage.monthTitle, 'a malformed month shows the current one').toHaveText(
    await streakPage.monthName(month),
  );
  await expect(page, 'and leaves the URL').toHaveURL(/\/streak$/);

  const earliest = shiftMonth(month, -12);
  await streakPage.goto(earliest);
  await streakPage.expectMonth(earliest, await daysOf(earliest), today);
  await expect(streakPage.previousMonth, 'a year back at most').toBeDisabled();

  await streakPage.backButton.click();
  await expect(page, 'opened directly: "Zurück" leads into the app').toHaveURL(/\/$/);
  await new LearningPathPage(page).expectVisible();
});

test('"Zurück" on a month out of reach opened directly leads to the path, as on any screen opened directly', async ({
  page,
}) => {
  // The correction replaces the URL; the screen still counts as opened directly (no app screen before it).
  const streakPage = new StreakPage(page);
  const { today } = await fetchStreak(page.request);
  await page.goto(`/streak?month=${shiftMonth(monthOf(today), 2)}`);
  await expect(page, 'corrected to the current month').toHaveURL(/\/streak$/);
  await streakPage.backButton.click();
  await expect(page, 'not out of the app').toHaveURL(/\/$/);
  await new LearningPathPage(page).expectVisible();
});

test.describe('a learner of its own', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a long streak: bands across weeks, a gap and a frozen day; the first goal reached offers the next ones, "Ziel ändern" switches it', async ({
    page,
  }) => {
    test.setTimeout(3 * 60_000);
    const { zone } = zoneAroundMidday();
    const today = todayIn(zone);
    const shell = new AppShell(page);
    const streakPage = new StreakPage(page);

    await test.step('eleven days up to yesterday (a freeze among them), an earlier streak; today met by a lower goal', async () => {
      await newLearnerViaApi(page.request, 'streak-screen', 'Lirie');
      await seedStreakHistory(page.request, {
        timeZone: zone,
        days: [
          ...run(addDays(today, -15), 3),
          ...run(addDays(today, -7), 6),
          { day: addDays(today, -6), kind: 'freeze' },
          ...run(addDays(today, -1), 5),
        ],
        // Six minutes practised against a goal of ten; lowering the goal to five meets today's.
        practisedTodayMs: 6 * 60_000 + 5_000,
        dailyGoalMinutes: 10,
      });
      expect((await fetchStreak(page.request)).current).toBe(11);
      await setDailyGoalViaApi(page.request, HISTORY_GOAL_MINUTES);
    });

    const overview = await fetchStreak(page.request);
    expect(overview).toMatchObject({ current: 12, longest: 12, extendedToday: true, today });
    expect(overview.goal, 'the streak reached the first goal').toEqual({
      target: 10,
      progress: 10,
      reached: true,
      options: [20, 30, 50],
    });

    await test.step('the flame opens the screen: the lit hero, the bands of the month, the reached goal', async () => {
      await new LearningPathPage(page).goto();
      await shell.openStreak();
      await streakPage.expectOverview(overview);
      await expect(streakPage.goalCard.getByText('Wähle dein nächstes Ziel.', { exact: true })).toBeVisible();
      await snap(page, 'streak-screen-lit', { fullPage: false });
      await snap(page, 'streak-calendar-bands', { element: streakPage.calendar });
      await scrollToTop(streakPage.goalCard);
      await snap(page, 'streak-screen-goal-reached', { fullPage: false });
    });

    await test.step('the month before holds the rest of the history, if any', async () => {
      const previous = shiftMonth(monthOf(today), -1);
      await streakPage.previousMonth.click();
      await streakPage.expectMonth(previous, (await fetchStreak(page.request, previous)).calendar.days, today);
      await streakPage.nextMonth.click();
      await streakPage.expectMonth(monthOf(today), overview.calendar.days, today);
    });

    await test.step('a chip of the reached goal saves the next goal of 30 days; the focus moves to the card', async () => {
      await streakPage.chooseGoal(30);
      const chosen = await fetchStreak(page.request);
      expect(chosen.goal).toEqual({ target: 30, progress: 12, reached: false, options: [20, 50, 75] });
      await streakPage.expectGoal(chosen.goal);
      await snap(page, 'streak-goal-saved', { element: streakPage.goalCard });
    });

    const chooser = streakPage.goalChooser('Neues Ziel');

    await test.step('"Ziel ändern" offers the goals of the API with the focus on the first, "Abbrechen" keeps the goal', async () => {
      await streakPage.changeGoalButton.click();
      await expect(chooser.getByRole('radio')).toHaveCount(3);
      for (const [index, option] of [20, 50, 75].entries()) {
        await expect(chooser.getByRole('radio').nth(index)).toHaveAccessibleName(days(option));
      }
      await expect(streakPage.goalOption(20), 'the focus on the first chip').toBeFocused();
      await expect(streakPage.goalSaved, 'the last note goes').toBeHidden();
      await snap(page, 'streak-goal-chooser', { element: streakPage.goalCard });
      await streakPage.cancelGoalButton.click();
      await expect(chooser).toHaveCount(0);
      await expect(streakPage.goalHeading, 'the focus back on the card').toBeFocused();
      await expect(streakPage.changeGoalButton).toBeVisible();
    });

    await test.step('with the keyboard: the arrow keys walk the chips without saving, Space saves the goal of 20 days', async () => {
      const goalUpdates = recordGoalUpdates(page);
      await streakPage.changeGoalButton.focus();
      await page.keyboard.press('Enter');
      await expect(streakPage.goalOption(20)).toBeFocused();
      for (const [key, focused] of [
        ['ArrowRight', 50],
        ['ArrowRight', 75],
        ['ArrowRight', 20],
        ['ArrowLeft', 75],
        ['ArrowUp', 50],
        ['ArrowDown', 75],
        ['ArrowDown', 20],
      ] as const) {
        await page.keyboard.press(key);
        await expect(streakPage.goalOption(focused), `${key}: ${focused} days`).toBeFocused();
      }
      await expect(chooser.getByRole('radio', { checked: true })).toHaveCount(0);
      expect(goalUpdates(), 'no goal saved while walking the chips').toEqual([]);

      const saved = page.waitForResponse(isGoalUpdate);
      await page.keyboard.press('Space');
      expect((await saved).status()).toBe(200);
      await expect(streakPage.goalSaved).toHaveText(`Neues Ziel: ${days(20)}`);
      await expect(streakPage.goalHeading, 'the focus on the card').toBeFocused();
      expect(goalUpdates()).toEqual([{ target: 20 }]);
      const changed = await fetchStreak(page.request);
      expect(changed.goal).toEqual({ target: 20, progress: 12, reached: false, options: [30, 50, 75] });
      await streakPage.expectGoal(changed.goal);
    });

    await test.step('goals off the ladder or not above the streak are refused', async () => {
      for (const target of [15, 10, 12]) {
        const refused = await putStreakGoal(page.request, { target });
        expect(refused.status(), `${target} days`).toBe(400);
        expect(((await refused.json()) as { code: string }).code).toBe('invalid_streak_goal');
      }
      expect((await fetchStreak(page.request)).goal.target).toBe(20);
    });

    await test.step('the export holds the chosen goal and the day met by the lower goal', async () => {
      const backup = await fetchExport(page.request);
      expect(backup.rows<StreakGoalRow>('streak_goals')).toEqual([
        expect.objectContaining({ target: 20, reachedOn: null, reachedAt: null }),
      ]);
      expect(backup.rows<StreakDayRow>('streak_days')).toContainEqual(
        expect.objectContaining({ day: today, kind: 'goal_met', goalMinutes: 5, sessionId: null }),
      );
    });
  });

  test('a reached goal stays complete after the streak broke: the full trophy and the next goals', async ({ page }) => {
    const { zone } = zoneAroundMidday();
    const today = todayIn(zone);
    const streakPage = new StreakPage(page);
    await newLearnerViaApi(page.request, 'streak-goal-kept', 'Teuta');
    // The goal of 10 days reached on the tenth of twelve days up to three days ago; two days missed since.
    await seedStreakHistory(page.request, {
      timeZone: zone,
      days: run(addDays(today, -3), 12),
      practisedTodayMs: 0,
      goal: { target: FIRST_GOAL, reachedOn: addDays(today, -5) },
    });
    const overview = await fetchStreak(page.request);
    expect(overview).toMatchObject({ current: 0, longest: 12, extendedToday: false });
    expect(overview.goal).toEqual({ target: FIRST_GOAL, progress: FIRST_GOAL, reached: true, options: [20, 30, 50] });

    await streakPage.goto();
    await streakPage.expectOverview(overview);
    await scrollToTop(streakPage.goalCard);
    await snap(page, 'streak-screen-goal-kept', { fullPage: false });
  });

  test('a month in the URL beyond the last year or still to come turns into the nearest month the arrows reach, in the URL too', async ({
    page,
  }) => {
    await newLearnerViaApi(page.request, 'streak-month-url');
    const streakPage = new StreakPage(page);
    const { today } = await fetchStreak(page.request);
    const month = monthOf(today);
    const earliest = shiftMonth(month, -12);

    await streakPage.goto();
    await page.goto(`/streak?month=${shiftMonth(month, -24)}`);
    await expect(page, 'two years back: the earliest month').toHaveURL(new RegExp(`/streak\\?month=${earliest}$`));
    await streakPage.expectMonth(earliest, [], today);
    await expect(streakPage.previousMonth).toBeDisabled();
    await expect(streakPage.nextMonth).toBeEnabled();
    await page.goBack();
    await expect(page, 'replaced in the history: back leads to the screen before').toHaveURL(/\/streak$/);
    await expect(streakPage.monthTitle).toHaveText(await streakPage.monthName(month));

    await page.goto(`/streak?month=${shiftMonth(month, 2)}`);
    await expect(page, 'a month to come: the current one, which needs no parameter').toHaveURL(/\/streak$/);
    await expect(streakPage.monthTitle).toHaveText(await streakPage.monthName(month));
    await expect(streakPage.nextMonth).toBeDisabled();
  });
});

test('the catalog shows the streak celebration, the trophy and the streak screen with sample data', async ({ page }) => {
  const catalog = new CatalogPage(page);
  const celebration = new StreakCelebration(page);
  const streakPage = new StreakPage(page);
  await catalog.goto();
  const section = await catalog.jumpTo('Streak-Feier & Streak-Seite');

  await test.step('"Ziel erreicht 9 → 10": the flame, then the trophy (motion reduced: everything in place)', async () => {
    await section.getByRole('button', { name: 'Ziel erreicht 9 → 10', exact: true }).click();
    await celebration.expectSettled({ current: 10, freezeUsed: false });
    await snap(page, 'catalog-streak-celebration', { fullPage: false });
    await celebration.continueButton.click();
    await celebration.expectGoalBeat({ target: 10, options: [20, 30, 50] });
    await snap(page, 'catalog-streak-goal-reached', { fullPage: false });
    await celebration.continueButton.click();
    await expect(celebration.goalBeat).toHaveCount(0);
  });

  await test.step('"Mit Streak-Schutz 7 → 9": the freeze note', async () => {
    await section.getByRole('button', { name: 'Mit Streak-Schutz 7 → 9', exact: true }).click();
    await celebration.expectSettled({ current: 9, freezeUsed: true });
    await celebration.continueButton.click();
    await expect(celebration.screen).toHaveCount(0);
  });

  await test.step('the calendar sample: one band across two weeks over a frozen day', async () => {
    const calendar = section.getByTestId('streak-calendar');
    await calendar.scrollIntoViewIfNeeded();
    const sampleDays: StreakCalendarDay[] = [
      ...[1, 2, 4, 5, 6, 7, 8].map((day) => ({ date: `2026-10-0${day}`, status: 'met' as const })),
      { date: '2026-10-03', status: 'frozen' },
    ];
    await streakPage.expectMonth('2026-10', sampleDays, '2026-10-08');
  });
});
