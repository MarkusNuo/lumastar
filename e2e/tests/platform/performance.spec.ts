import { expect, test, type Page } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import { finishOpenFocusUnits } from '../../support/progression.ts';

/*
 * PRD 13: app start under 2 s and an exercise switch under 100 ms (the whole lesson is loaded at the
 * start and answers are saved in the background). The browser itself takes the times: an init script
 * notes when the path's next node and every new exercise first appear, and when "Weiter" is tapped.
 * Service workers are blocked in these tests, so every start is a cold one without the precache.
 */

const APP_START_LIMIT_MS = 2_000;
const EXERCISE_SWITCH_LIMIT_MS = 100;

interface Timings {
  /** performance.now() when the next node of the path was first painted. */
  pathShownAt?: number;
  /** "Weiter" taps on a feedback sheet. */
  continues: number[];
  /** A new exercise on screen: when its frame was painted. */
  exercises: { id: string; paintedAt: number }[];
}

declare global {
  interface Window {
    lingoraTimings: Timings;
  }
}

/** Notes the moments in the page, before any app code runs. */
async function recordTimings(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const timings: Timings = { continues: [], exercises: [] };
    window.lingoraTimings = timings;
    let shownExercise: string | null = null;
    const painted = (note: (at: number) => void) => requestAnimationFrame(() => note(performance.now()));
    new MutationObserver(() => {
      if (timings.pathShownAt === undefined && document.querySelector('main button[aria-current="step"]')) {
        timings.pathShownAt = -1;
        painted((at) => (timings.pathShownAt = at));
      }
      const id = document.querySelector('[data-exercise-id]')?.getAttribute('data-exercise-id') ?? null;
      if (id && id !== shownExercise) painted((at) => timings.exercises.push({ id, paintedAt: at }));
      shownExercise = id;
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-exercise-id'] });
    document.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element | null)?.closest('button');
        if (button?.textContent?.trim() === 'Weiter' && button.closest('[role="dialog"][data-tone]')) {
          timings.continues.push(performance.now());
        }
      },
      true,
    );
  });
}

const timingsOf = (page: Page) => page.evaluate(() => window.lingoraTimings);

test('the app starts in under 2 s: from the address bar to the painted learning path', async ({ page }) => {
  await recordTimings(page);
  const path = new LearningPathPage(page);

  const starts: number[] = [];
  for (const load of ['cold', 'reload'] as const) {
    await (load === 'cold' ? page.goto('/') : page.reload());
    await expect(path.currentNode).toBeVisible();
    await expect.poll(async () => (await timingsOf(page)).pathShownAt ?? -1).toBeGreaterThan(0);
    const shownAt = (await timingsOf(page)).pathShownAt ?? Infinity;
    starts.push(shownAt);
    test.info().annotations.push({ type: `app start (${load})`, description: `${Math.round(shownAt)} ms` });
  }
  expect(Math.max(...starts), 'PRD 13: app start < 2 s').toBeLessThan(APP_START_LIMIT_MS);
});

test('an exercise follows the previous one in under 100 ms', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  await recordTimings(page);
  await finishOpenFocusUnits(page.request);
  const path = new LearningPathPage(page);
  const resultScreen = new LessonResultScreen(page);
  await path.goto();
  const opened = await openLesson(page, () => path.startCurrentLesson());
  const result = await playOpenedLesson(page, opened, { end: resultScreen.heading });

  const { continues, exercises } = await timingsOf(page);
  // Every "Weiter" but the last one brings the next exercise.
  const switches = continues.flatMap((tappedAt) => {
    const next = exercises.find((exercise) => exercise.paintedAt > tappedAt);
    return next ? [next.paintedAt - tappedAt] : [];
  });
  expect(switches, 'one switch per exercise after the first').toHaveLength(opened.lesson.exercises.length - 1);
  const slowest = Math.max(...switches);
  const median = [...switches].sort((a, b) => a - b)[Math.floor(switches.length / 2)] ?? 0;
  test.info().annotations.push({
    type: 'exercise switch',
    description: `median ${Math.round(median)} ms, slowest ${Math.round(slowest)} ms over ${switches.length}`,
  });
  expect(slowest, 'PRD 13: exercise switch < 100 ms').toBeLessThan(EXERCISE_SWITCH_LIMIT_MS);
  await resultScreen.leave(result);
});
