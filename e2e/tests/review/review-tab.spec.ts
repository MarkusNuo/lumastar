import { expect, test, type Page } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { ReviewTab } from '../../pages/ReviewTab.ts';
import {
  finishViaApi,
  isCompletion,
  playLessonViaApi,
  startViaApi,
  type LessonResponse,
} from '../../support/lessonApi.ts';
import { playOpenedLesson } from '../../support/lessonFlow.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import {
  fetchReviewSummary,
  isReviewStart,
  isReviewSummary,
  type ReviewSummary,
} from '../../support/reviewApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The tab "Wiederholen" (PRD F8, 12.3): the due count on the tab and in the summary card, the due
 * items as a review lesson of their own, and "Alles wiederholt!" with the way to new content once
 * nothing is due. The backend has no test clock, so the test relies on the FSRS learning steps: a
 * wrong answer is rated Again and its card comes due a minute later. Earlier tests of the run leave
 * such cards behind; only a run that starts with this test waits for one (marked "slow").
 */

/** The first FSRS learning step is one minute; this leaves room for a slow machine. */
const DUE_WAIT_MS = 2 * 60_000;

/** Review lessons of up to 12 items; more rounds than this means the cards cannot be cleared. */
const MAX_REVIEW_ROUNDS = 6;

/** Known issue, see the M4 review: due cards of items above the learner's level have no review lesson. */
const UNREVIEWABLE =
  'cards of items above the learner level count as due, but POST /api/review/lessons finds nothing to practise';

/** Opens the tab and returns the counts it shows: those of its own summary request. */
async function openTab(page: Page, tab: ReviewTab): Promise<ReviewSummary> {
  const loaded = page.waitForResponse(isReviewSummary);
  await page.goto('/wiederholen');
  await expect(tab.heading).toBeVisible();
  const response = await loaded;
  expect(response.status()).toBe(200);
  await expect(tab.shell.navLink('Wiederholen')).toHaveAttribute('aria-current', 'page');
  return (await response.json()) as ReviewSummary;
}

/**
 * Reviews everything due through the API, every answer right, so the next cards come due only after
 * the next learning step (10 minutes). Returns false if due cards are left that no lesson practises.
 */
async function reviewAllDueViaApi(page: Page): Promise<boolean> {
  for (let round = 0; round < MAX_REVIEW_ROUNDS; round += 1) {
    if ((await fetchReviewSummary(page.request)).dueNow === 0) return true;
    const started = await startViaApi(page.request, { review: true });
    if (started.status() === 409) return false;
    expect(started.status(), await started.text()).toBe(201);
    await finishViaApi(page.request, (await started.json()) as LessonResponse);
  }
  return (await fetchReviewSummary(page.request)).dueNow === 0;
}

test('the review tab shows what is due, plays it as a review lesson and ends with "Alles wiederholt!"', async ({
  page,
}) => {
  test.setTimeout(5 * 60_000);
  const tab = new ReviewTab(page);
  const player = new LessonPlayer(page);
  const resultScreen = new LessonResultScreen(page);

  await test.step('something is due', async () => {
    if ((await fetchReviewSummary(page.request)).dueNow > 0) return;
    test.info().annotations.push({ type: 'slow', description: 'waited for the first FSRS learning step' });
    // One wrong answer is rated Again: its card comes due after the first learning step.
    await playLessonViaApi(page.request, currentUnit(await fetchPath(page.request)).unitId);
    await expect
      .poll(async () => (await fetchReviewSummary(page.request)).dueNow, {
        message: 'a card comes due after the first FSRS learning step',
        timeout: DUE_WAIT_MS,
        intervals: [5_000],
      })
      .toBeGreaterThan(0);
  });

  await test.step('the tab and its navigation badge show the due words', async () => {
    const summary = await openTab(page, tab);
    expect(summary.dueNow).toBeGreaterThan(0);
    expect(summary.totalCards).toBeGreaterThanOrEqual(summary.dueNow);
    await tab.expectDue(summary);
    await tab.expectNavBadge(summary.dueNow);
    await snap(page, 'review-due', { fullPage: false });
  });

  await test.step('"Wiederholung starten" plays the due items as a lesson of their own', async () => {
    const completion = page.waitForResponse(isCompletion, { timeout: 0 });
    const starting = page.waitForResponse(isReviewStart);
    await tab.startButton.click();
    const started = await starting;
    if (started.status() === 409) {
      // The tab promised due words; the player says there is nothing to practise.
      test.fail(true, UNREVIEWABLE);
      await expect(page.getByRole('heading', { name: 'Die Wiederholung konnte nicht starten' })).toBeVisible();
      await snap(page, 'review-nothing-to-practise', { fullPage: false });
      throw new Error(UNREVIEWABLE);
    }
    expect(started.status(), await started.text()).toBe(201);
    const review = { lesson: (await started.json()) as LessonResponse, completion };
    expect(review.lesson).toMatchObject({ kind: 'review', unitId: 'review' });
    expect(review.lesson.exercises.length).toBeGreaterThan(0);
    expect(review.lesson.exercises.length, 'up to 12 items').toBeLessThanOrEqual(12);
    await expect(page).toHaveURL(/\/wiederholen\/lektion$/);
    await expect(player.exercise).toBeVisible();
    await snap(page, 'review-lesson-exercise', { fullPage: false });

    const result = await playOpenedLesson(page, review, { end: resultScreen.heading });
    expect(result.kind).toBe('review');
    await snap(page, 'review-result', { fullPage: false });
    await resultScreen.continueButton.click();
    await expect(page, 'back to the tab').toHaveURL(/\/wiederholen$/);
    await expect(tab.heading).toBeVisible();
  });

  await test.step('nothing due: "Alles wiederholt!" leads to a new lesson', async () => {
    let summary: ReviewSummary | undefined;
    // A card of an earlier test may come due in between; then it is reviewed as well.
    for (let attempt = 0; attempt < 3 && summary?.dueNow !== 0; attempt += 1) {
      if (!(await reviewAllDueViaApi(page))) {
        test.fail(true, UNREVIEWABLE);
        throw new Error(UNREVIEWABLE);
      }
      summary = await openTab(page, tab);
    }
    expect(summary?.dueNow, 'everything due is reviewed').toBe(0);
    if (!summary) throw new Error('The tab was not opened');
    await tab.expectAllDone(summary);
    await tab.expectNavBadge(0);
    await snap(page, 'review-all-done', { fullPage: false });

    await tab.learnButton.click();
    await new LearningPathPage(page).expectVisible();
  });
});
