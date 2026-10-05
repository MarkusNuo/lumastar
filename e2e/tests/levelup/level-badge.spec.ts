import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  BadgeRevealScreen,
  CheckpointIntroSheet,
  CheckpointResultScreen,
} from '../../pages/CheckpointScreens.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { isCheckpointStart, type CheckpointResult } from '../../support/lessonApi.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import { fetchPath, type PathStage } from '../../support/planApi.ts';
import { completeStageViaApi, passCheckpointViaApi } from '../../support/progression.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * Level badges (PRD F9): the checkpoint of the last stage of a CEFR band (e.g. A1.3) awards the badge
 * of the band, revealed right after the level-up, and the profile lists it among A1 … C2. Every
 * stage up to there is played and passed through the API, all answers right (units the learner
 * masters on the way are skipped or shortened), so it plays more lessons than any other test;
 * `--grep-invert @slow` leaves it out.
 */

/** A0 has no badge; the bands with one, in order. */
const BADGE_BANDS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/** Its checkpoint completes a band: A1.3, A2.3, … */
const completesBand = (level: string) => level.endsWith('.3');

/**
 * Plays and passes the stages through the API until the learner stands on the last stage of a band;
 * returns that stage and the one after it.
 */
async function reachLastStageOfBand(request: APIRequestContext): Promise<[PathStage, PathStage]> {
  for (let passed = 0; passed <= 3; passed += 1) {
    const [stage, next] = (await fetchPath(request)).stages;
    if (!stage || !next) throw new Error('The path has fewer than two stages');
    test.skip(!stage.units.some((unit) => unit.hasContent), `${stage.level} has no exercises yet`);
    if (completesBand(stage.level)) return [stage, next];
    await test.step(`${stage.level} through the API`, async () => {
      await completeStageViaApi(request, stage.level);
      await passCheckpointViaApi(request, stage.level);
    });
  }
  throw new Error('No band ends within three stages');
}

test('@slow the checkpoint that completes a band reveals its level badge, and the profile lists it', async ({
  page,
}) => {
  test.setTimeout(15 * 60_000);
  const [stage, next] = await reachLastStageOfBand(page.request);
  const band = stage.level.slice(0, 2);
  await test.step(`the lessons of ${stage.level} through the API`, () =>
    completeStageViaApi(page.request, stage.level),
  );

  const path = new LearningPathPage(page);
  const intro = new CheckpointIntroSheet(page, stage.level);
  const results = new CheckpointResultScreen(page);
  const reveal = new BadgeRevealScreen(page);

  const checkpoint = await test.step(`checkpoint ${stage.level} in the UI`, async () => {
    await path.goto();
    await path.checkpoint(stage.level).tap();
    await intro.expectOpen(next.level);
    const opened = await openLesson(page, () => intro.startButton.click(), isCheckpointStart);
    const result = await playOpenedLesson(page, opened, { end: results.anyHeading() });
    return result.checkpoint as CheckpointResult;
  });
  expect(checkpoint).toMatchObject({ level: stage.level, passed: true, newLevel: next.level, badges: [band] });

  await test.step('the level-up first, then the badge of the band', async () => {
    await expect(results.passedHeading(next.level)).toBeVisible();
    await results.continueButton.click();
    await expect(reveal.heading([band])).toBeVisible();
    await expect(page.getByText('Neues Abzeichen!', { exact: true })).toBeVisible();
    await expect(reveal.badge(band)).toBeVisible();
    await expect(reveal.continueButton).toBeEnabled();
    await snap(page, 'badge-reveal', { fullPage: false });
    await reveal.continueButton.click();
    await path.expectVisible();
  });

  await test.step('the profile lists the badges A1 … C2, the new one earned', async () => {
    const response = await page.request.get('/api/badges');
    expect(response.status()).toBe(200);
    const earned = (await response.json()) as { code: string; awardedAt: string }[];
    expect(earned.map((badge) => badge.code)).toContain(band);
    const awardedAt = earned.find((badge) => badge.code === band)?.awardedAt ?? '';

    const profile = new ProfilePage(page);
    await profile.goto();
    const rows = profile.badges();
    await expect(rows).toHaveCount(BADGE_BANDS.length);
    const day = await page.evaluate(
      (instant) => new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(instant)),
      awardedAt,
    );
    for (const [index, code] of BADGE_BANDS.entries()) {
      const isEarned = earned.some((badge) => badge.code === code);
      await expect(rows.nth(index).getByRole('img')).toHaveAccessibleName(
        isEarned ? `Abzeichen ${code}` : `Abzeichen ${code}, noch nicht verdient`,
      );
      if (code === band) await expect(rows.nth(index)).toContainText(`seit ${day}`);
      if (!isEarned) await expect(rows.nth(index)).toContainText('noch offen');
    }
    await profile.badge(band, true).scrollIntoViewIfNeeded();
    await snap(page, 'profile-badges', { fullPage: false });
  });
});
