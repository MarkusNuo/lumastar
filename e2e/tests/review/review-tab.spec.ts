import { expect, test, type Page } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { ReviewTab } from '../../pages/ReviewTab.ts';
import type { SrsCardRow } from '../../support/backup.ts';
import { canAnswerWrong } from '../../support/lessonAnswers.ts';
import {
  finishViaApi,
  isCompletion,
  playViaApi,
  startViaApi,
  type LessonResponse,
} from '../../support/lessonApi.ts';
import { playOpenedLesson } from '../../support/lessonFlow.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchExport } from '../../support/profileApi.ts';
import {
  fetchReviewSummary,
  isReviewStart,
  isReviewSummary,
  type ReviewSummary,
} from '../../support/reviewApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The tab "Wiederholen": the due count on the tab and in the summary card, the due
 * items as a review lesson of their own, and "Alles wiederholt!" with the way to new content once
 * nothing is due. The backend has no test clock, so the test relies on the FSRS learning steps: a
 * wrong answer on an item still being learned is rated Again and its card comes due a minute later
 * (a known item would lapse into relearning, due only after ten minutes). Earlier tests of the run
 * leave such cards behind; when nothing is due the test waits for one (marked "slow").
 */

/** The first FSRS learning step is one minute; this leaves room for a slow machine. */
const DUE_WAIT_MS = 2 * 60_000;

/** Review lessons of up to 12 items; more rounds than this means the cards cannot be cleared. */
const MAX_REVIEW_ROUNDS = 6;

/** At most this many deliberate mistakes, so the trigger lesson stays an ordinary one. */
const TRIGGER_MISTAKES = 2;

/** Items whose card is in review or relearning: a wrong answer leaves them due only in ten minutes. */
async function knownItems(page: Page): Promise<Set<string>> {
  const cards = (await fetchExport(page.request)).rows<SrsCardRow>('srs_cards');
  return new Set(
    cards.filter((card) => card.state === 'review' || card.state === 'relearning').map((card) => card.itemId),
  );
}

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
 * the next learning step (10 minutes). The summary counts only cards a review lesson can practise,
 * so a review starts whenever something is due.
 */
async function reviewAllDueViaApi(page: Page): Promise<void> {
  for (let round = 0; round < MAX_REVIEW_ROUNDS; round += 1) {
    const { dueNow } = await fetchReviewSummary(page.request);
    if (dueNow === 0) return;
    const started = await startViaApi(page.request, { review: true });
    expect(started.status(), `${dueNow} due: ${await started.text()}`).toBe(201);
    await finishViaApi(page.request, (await started.json()) as LessonResponse);
  }
  expect((await fetchReviewSummary(page.request)).dueNow, 'every due card is reviewed').toBe(0);
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
    // Wrong answers on items still being learned are rated Again: due after the first learning step.
    const known = await knownItems(page);
    const { result } = await playViaApi(
      page.request,
      { unitId: currentUnit(await fetchPath(page.request)).unitId },
      (exercise, played) =>
        played.exercises
          .filter((candidate) => canAnswerWrong(candidate) && candidate.itemIds.every((id) => !known.has(id)))
          .slice(0, TRIGGER_MISTAKES)
          .includes(exercise)
          ? 'wrong'
          : 'correct',
    );
    expect(result.correctCount, 'mistakes on items of the unit in progress still being learned').toBeLessThan(
      result.exerciseCount,
    );
    await expect
      .poll(async () => (await fetchReviewSummary(page.request)).dueNow, {
        message: 'a card comes due after the first FSRS learning step',
        timeout: DUE_WAIT_MS,
        intervals: [5_000],
      })
      .toBeGreaterThan(0);
  });

  await test.step('the tab and its navigation badge show the due cards', async () => {
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
    expect(started.status(), `the due cards can be practised: ${await started.text()}`).toBe(201);
    const review = { lesson: (await started.json()) as LessonResponse, completion };
    expect(review.lesson).toMatchObject({ kind: 'review', unitId: 'review' });
    expect(review.lesson.exercises.length).toBeGreaterThan(0);
    expect(review.lesson.exercises.length, 'up to 12 items').toBeLessThanOrEqual(12);
    await expect(page).toHaveURL(/\/wiederholen\/lektion$/);
    await expect(player.exercise).toBeVisible();
    await snap(page, 'review-lesson-exercise', { fullPage: false });

    const result = await playOpenedLesson(page, review, { end: resultScreen.heading });
    expect(result.kind).toBe('review');
    await resultScreen.expectDailyGoal(result.dailyGoal);
    await snap(page, 'review-result', { fullPage: false });
    await resultScreen.leave(result);
    await expect(page, 'back to the tab').toHaveURL(/\/wiederholen$/);
    await expect(tab.heading).toBeVisible();
  });

  await test.step('nothing due: "Alles wiederholt!" leads to a new lesson', async () => {
    let summary: ReviewSummary | undefined;
    // A card of an earlier test may come due in between; then it is reviewed as well.
    for (let attempt = 0; attempt < 3 && summary?.dueNow !== 0; attempt += 1) {
      await reviewAllDueViaApi(page);
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
