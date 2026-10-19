import { expect, test, type Page } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { StreakCelebration, watchForPathFlash } from '../../pages/StreakCelebration.ts';
import { shownDay } from '../../support/dates.ts';
import { ONBOARDING } from '../../support/learner.ts';
import { feedbackTour } from '../../support/lessonAnswers.ts';
import { EXERCISE_TYPES } from '../../support/lessonApi.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import { fetchPath, fetchPlanChanges, nextBandGoal, type LearningPath } from '../../support/planApi.ts';
import {
  fetchSettings,
  fetchTodayProgress,
  type DailyGoalMinutes,
} from '../../support/progressApi.ts';
import { finishOpenFocusUnits } from '../../support/progression.ts';
import { exerciseScreenName, scrollToTop, snapOnAllPhones } from '../../support/screenshots.ts';

/*
 * The daily goal and the streak. The goal counts the minutes from the start to
 * the end of each lesson, and only the lesson that first meets it extends the streak, once a day. So
 * this runs in its own project right after the setup, before any lesson of the run (see
 * playwright.config.ts): the learner sets a 5-minute goal in the profile, one lesson takes five
 * minutes, and its end shows the full goal ring, then the streak celebration; the top bar then shows
 * the burning flame and the full ring. The goal goes back to the onboarding answer at the end, which
 * the backup test expects. Being the first lesson of a fresh instance, the lesson is composed the
 * same in every run, so it also gives the screenshots of every exercise type and feedback sheet at
 * both sizes (one wrong choice, one answer without special characters, one Standard form).
 */

const SHORT_GOAL: DailyGoalMinutes = 5;
/** The backend counts whole minutes, rounded down: a few seconds more make it five for sure. */
const MARGIN_MS = 5_000;
const TOP_BAR_GAP = 88;

/** The note under the goal: "Lernplan angepasst: A1 bis ca. 3. Dez. 2026 (vorher 9. Feb. 2027)". */
async function expectPlanNote(page: Page, profile: ProfilePage, before: LearningPath, after: LearningPath) {
  const [was, now] = [nextBandGoal(before), nextBandGoal(after)];
  let text = 'Lernplan angepasst';
  if (now) text += `: ${now.band} bis ca. ${await shownDay(page, now.day)}`;
  if (was && now && was.day !== now.day) text += ` (vorher ${await shownDay(page, was.day)})`;
  await expect(profile.planNote).toHaveText(text);
}

/** Sets the daily goal in the profile; the plan's estimates follow and the history names the change. */
async function changeDailyGoal(page: Page, profile: ProfilePage, minutes: DailyGoalMinutes) {
  const goalBefore = (await fetchSettings(page.request)).dailyGoalMinutes;
  const pathBefore = await fetchPath(page.request);
  const saved = await profile.chooseGoal(minutes);
  expect(saved.dailyGoalMinutes).toBe(minutes);
  const pathAfter = await fetchPath(page.request);
  expect(pathAfter.dailyGoalMinutes, 'the plan follows the goal').toBe(minutes);
  await expectPlanNote(page, profile, pathBefore, pathAfter);
  expect((await fetchPlanChanges(page.request))[0]).toMatchObject({
    type: 'replanned',
    reason: `Tagesziel geändert: ${goalBefore} → ${minutes} Min. pro Tag`,
  });
}

test('a 5-minute goal set in the profile: the lesson that meets it fills the ring, lights the flame and celebrates the streak', async ({
  page,
}) => {
  test.setTimeout(12 * 60_000);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const profile = new ProfilePage(page);
  const resultScreen = new LessonResultScreen(page);
  const celebration = new StreakCelebration(page);

  const before = await fetchTodayProgress(page.request);
  test.skip(
    before.streak.extendedToday || before.minutesToday >= SHORT_GOAL,
    'Today\'s goal is met already (reused backend); restart it for a fresh database.',
  );

  await test.step('the top bar before: a grey flame, the ring still empty', async () => {
    await path.goto();
    expect(before).toMatchObject({ goalMinutes: ONBOARDING.dailyGoal.minutes, goalMet: false });
    expect(before.streak).toMatchObject({ current: 0, extendedToday: false, freezesLeft: 1 });
    await shell.expectProgress(before);
    await snapOnAllPhones(page, 'home-goal-open', { fullPage: false });
  });

  await test.step(`Profil → Einstellungen: ${SHORT_GOAL} Min. re-estimates the plan`, async () => {
    await profile.goto();
    await expect(profile.goalOption(ONBOARDING.dailyGoal.minutes)).toBeChecked();
    await expect(profile.deviceSwitch('Töne')).toHaveAttribute('aria-checked', 'true');
    const settingsUnderTopBar = () => scrollToTop(profile.settings, TOP_BAR_GAP);
    await snapOnAllPhones(page, 'profile-settings', { fullPage: false }, settingsUnderTopBar);

    await changeDailyGoal(page, profile, SHORT_GOAL);
    await expect(shell.goalRing).toHaveAttribute('aria-valuetext', `0 von ${SHORT_GOAL} Min.`);
    await snapOnAllPhones(page, 'profile-settings-goal-changed', { fullPage: false }, settingsUnderTopBar);
  });

  await test.step('the target retention sits behind "Erweitert"', async () => {
    await expect(profile.retentionToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(profile.retentionSlider).toHaveCount(0);
    await profile.retentionToggle.click();
    await expect(profile.retentionToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(profile.retentionSlider).toHaveAttribute('aria-valuetext', /^90\s%$/u);
    await expect(profile.settings.getByRole('button', { name: 'Speichern' }), 'nothing changed yet').toBeDisabled();
    await snapOnAllPhones(page, 'profile-settings-retention', { fullPage: false }, () =>
      profile.retentionSlider.scrollIntoViewIfNeeded(),
    );
    await profile.retentionToggle.click();
    await expect(profile.retentionSlider).toHaveCount(0);
  });

  const result = await test.step('a lesson of five minutes meets the goal', async () => {
    await finishOpenFocusUnits(page.request);
    await path.goto();
    const opened = await openLesson(page, () => path.startCurrentLesson());
    const deadline = Date.now() + SHORT_GOAL * 60_000 + MARGIN_MS;
    expect(
      new Set(opened.lesson.exercises.map((exercise) => exercise.type)),
      'the first lesson of a unit mixes every exercise type',
    ).toEqual(new Set(EXERCISE_TYPES));
    // The first lesson of a fresh instance is composed the same in every run: its exercise types
    // and feedback sheets are captured here at both sizes.
    const intents = feedbackTour(opened.lesson.exercises);
    const retries = [...intents.values()].filter((intent) => intent === 'wrong').length;
    const captured = new Set<string>();
    const captureOnce = async (name: string) => {
      if (captured.has(name)) return;
      captured.add(name);
      await snapOnAllPhones(page, name, { fullPage: false });
    };
    return playOpenedLesson(page, opened, {
      end: resultScreen.heading,
      intentOf: (exercise) => intents.get(exercise.id) ?? 'correct',
      beforeAnswer: async (exercise, step) => {
        await captureOnce(exerciseScreenName(exercise));
        // The last answer completes the lesson; until then it is a lesson that took five minutes.
        if (step === opened.lesson.exercises.length + retries - 1) {
          await page.waitForTimeout(Math.max(0, deadline - Date.now()));
        }
      },
      onFeedback: (variant) => captureOnce(`feedback-${variant}`),
    });
  });

  await test.step('the result: "Tagesziel erreicht!" with the full ring', async () => {
    expect(result.dailyGoal).toMatchObject({ goalMinutes: SHORT_GOAL, goalMet: true, justMet: true });
    expect(result.dailyGoal.minutesToday).toBeGreaterThanOrEqual(SHORT_GOAL);
    expect(result.streak, 'the first day: no goal reached yet').toEqual({
      current: 1,
      previous: 0,
      extendedToday: true,
      freezeUsed: false,
    });
    await resultScreen.expectDailyGoal(result.dailyGoal);
    await snapOnAllPhones(page, 'result-goal-met', { fullPage: false });
    await resultScreen.dailyGoalCard.scrollIntoViewIfNeeded();
    await snapOnAllPhones(page, 'result-goal-met-card', { fullPage: false });
  });

  await test.step('"Weiter": the streak celebration right in place of the result, never the path in between', async () => {
    const lessonPath = new URL(page.url()).pathname;
    const pathFlash = await watchForPathFlash(page);
    await resultScreen.continueButton.click();
    await celebration.expectShown(result);
    // Motion is reduced in these tests: no show to wait for, the flame burns with the new streak at once.
    await celebration.expectSettled(result.streak);
    await expect(celebration.embers, 'no embers without motion').toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${lessonPath}$`));
    const record = await pathFlash();
    expect(record.paths, 'the URL never left the lesson').toEqual(record.paths.map(() => lessonPath));
    expect(record.navigation, 'the app navigation never showed').toBe(false);
    expect(record.learningPath, 'the learning path never showed').toBe(false);
    await snapOnAllPhones(page, 'streak-celebration', { fullPage: false });
    await celebration.continueButton.click();
    await expect(celebration.goalBeat, 'one day is no streak goal').toHaveCount(0);
    await shell.expectHome();
  });

  await test.step('the top bar: the flame burns, the ring is full, the freeze is ready', async () => {
    const today = await fetchTodayProgress(page.request);
    expect(today).toMatchObject({ goalMinutes: SHORT_GOAL, goalMet: true, lessonsToday: 1 });
    expect(today.streak).toMatchObject({ current: 1, longest: 1, extendedToday: true, freezesLeft: 1 });
    await shell.expectProgress(today);
    await snapOnAllPhones(page, 'home-goal-met', { fullPage: false });
  });

  await test.step(`back to ${ONBOARDING.dailyGoal.minutes} Min.: a new plan note, the streak stays`, async () => {
    await profile.goto();
    await changeDailyGoal(page, profile, ONBOARDING.dailyGoal.minutes);
    const today = await fetchTodayProgress(page.request);
    expect(today.goalMet, 'the higher goal is not met yet').toBe(false);
    expect(today.streak, 'but today has extended the streak').toMatchObject({ current: 1, extendedToday: true });
    await shell.expectProgress(today);
  });
});
