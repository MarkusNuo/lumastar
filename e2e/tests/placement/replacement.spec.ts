import { expect, test } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LevelRevealPage } from '../../pages/LevelRevealPage.ts';
import { PlacementIntroPage } from '../../pages/PlacementIntroPage.ts';
import { PlacementTestScreen } from '../../pages/PlacementTestScreen.ts';
import { PlanPage } from '../../pages/PlanPage.ts';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import type { PlacementAnswerRow, PlacementTestRow } from '../../support/backup.ts';
import { START_LEVEL } from '../../support/learner.ts';
import {
  isPlacementAnswer,
  isPlacementResult,
  isPlacementStart,
  readPlacementBank,
  wrongAnswer,
  type PlacementAnswerResponse,
  type PlacementItem,
  type PlacementResult,
  type StartPlacementResponse,
} from '../../support/placementApi.ts';
import {
  currentUnit,
  fetchPath,
  fetchPlan,
  fetchPlanChanges,
  type LearningPath,
} from '../../support/planApi.ts';
import { fetchExport } from '../../support/profileApi.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * "Neu einstufen" (PRD F2): a full placement test through the UI. The API sends no solutions, so the
 * test answers every item wrong for sure (content/placement.json knows the solutions): the staircase
 * then walks down to A0 and ends there, so the level stays the same in every run, whichever items
 * the (seeded) engine picks. The plan is revised with the mastery proven in the lessons so far,
 * never by the placement alone, and the change shows up in the "Plan-Verlauf" (PRD F3).
 */

/** PRD F2: a beginner lands on A0/A1.1 after 6 items at the latest. */
const BEGINNER_ITEMS = 6;

test('"Neu einstufen" runs a placement test without feedback, reveals the level and revises the plan', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  const bank = readPlacementBank();
  const planBefore = await fetchPlan(page.request);
  const changesBefore = await fetchPlanChanges(page.request);
  const pathBefore = await fetchPath(page.request);
  const unitBefore = currentUnit(pathBefore);
  expect(planBefore.startLevel, 'the setup placed the learner at A0').toBe(START_LEVEL);

  await test.step('profile → "Neu einstufen"', async () => {
    const profile = new ProfilePage(page);
    await profile.goto();
    await page.getByRole('region', { name: 'Lernen' }).getByRole('button', { name: 'Neu einstufen' }).click();
    const intro = new PlacementIntroPage(page);
    await intro.expectVisible('replacement');
    await expect(intro.skipButton, 'only the first placement can be skipped').toHaveCount(0);
    await snap(page, 'replacement-intro', { fullPage: false });
  });

  const screen = new PlacementTestScreen(page);
  const answers: string[] = [];
  let testId = '';

  // The reveal loads the result right after the last answer; no timeout of its own.
  const resultLoaded = page.waitForResponse(isPlacementResult, { timeout: 0 });

  await test.step('every item answered wrong, no verdict on any of them', async () => {
    const started = page.waitForResponse(isPlacementStart);
    await new PlacementIntroPage(page).startButton.click();
    const startResponse = await started;
    expect(startResponse.status()).toBe(201);
    const start = (await startResponse.json()) as StartPlacementResponse;
    expect(start, 'a re-placement starts at the current level').toMatchObject({
      startLevel: START_LEVEL,
      position: 1,
      maxItems: 20,
    });
    testId = start.testId;

    let item: PlacementItem | undefined = start.item;
    let position = start.position;
    while (item) {
      await screen.expectItem(item.id, position, start.maxItems);
      await expect(screen.player.checkButton, 'no "Prüfen": the test does not judge').toHaveCount(0);
      if (position === 1) await snap(page, 'placement-item', { fullPage: false });
      await screen.enter(wrongAnswer(item, bank));
      if (position === 1) await snap(page, 'placement-item-answered', { fullPage: false });

      const answered = page.waitForResponse(isPlacementAnswer);
      await screen.nextButton.click();
      const response = await answered;
      expect(response.status(), await response.text()).toBe(200);
      const progress = (await response.json()) as PlacementAnswerResponse;
      expect(progress, 'no verdict').not.toHaveProperty('outcome');
      expect(progress.nextItem ?? {}, 'no solution').not.toHaveProperty('solutions');
      await expect(screen.feedback, 'no feedback sheet').toHaveCount(0);
      answers.push(item.id);
      expect(answers.length).toBeLessThanOrEqual(start.maxItems);
      item = progress.nextItem;
      position = progress.position;
      if (progress.finished) expect(position, 'answered items').toBe(answers.length);
    }
    expect(answers.length, 'a beginner is placed within 6 items (PRD F2)').toBeLessThanOrEqual(
      BEGINNER_ITEMS,
    );
  });

  const reveal = new LevelRevealPage(page);
  await test.step('level reveal with the weaknesses', async () => {
    const loaded = await resultLoaded;
    expect(loaded.status()).toBe(200);
    const result = (await loaded.json()) as PlacementResult;
    expect(result).toMatchObject({
      testId,
      skipped: false,
      level: START_LEVEL,
      startLevel: START_LEVEL,
      answeredCount: answers.length,
      strengths: [],
    });
    expect(result.weaknesses.length, 'top 3 weaknesses').toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeLessThanOrEqual(3);
    expect(result.competences.map((score) => score.competence)).toEqual([
      'vocabulary',
      'grammar',
      'reading',
      'translation',
    ]);
    expect(result.competences.reduce((sum, score) => sum + score.answered, 0)).toBe(answers.length);
    await reveal.expectResult(result);
    await snap(page, 'reveal-replacement', { fullPage: false });

    // The pinned button must not hide the end of the list once it is scrolled to.
    const lastWeakness = reveal.weaknesses.getByRole('listitem').last();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(lastWeakness).toBeInViewport({ ratio: 1 });
    const [rowBox, buttonBox] = await Promise.all([
      lastWeakness.boundingBox(),
      reveal.continueButton.boundingBox(),
    ]);
    expect((rowBox?.y ?? 0) + (rowBox?.height ?? 0), 'the last weakness stays above the button').toBeLessThanOrEqual(
      buttonBox?.y ?? 0,
    );
    await snap(page, 'reveal-replacement-scrolled', { fullPage: false });
  });

  await test.step('the revised plan and its new history entry', async () => {
    await reveal.continueButton.click();
    const plan = new PlanPage(page);
    await plan.expectVisible();
    expect((await fetchPlan(page.request)).version, 'a new plan version').toBe(planBefore.version + 1);
    const changes = await fetchPlanChanges(page.request);
    const added = changes.slice(0, changes.length - changesBefore.length);
    expect(added[0], 'the re-placement is the cause of the new version').toMatchObject({
      planVersion: planBefore.version + 1,
      type: 'replanned',
      trigger: 'placement',
      reason: `Neueinstufung: ${START_LEVEL} bestätigt`,
    });
    expect(changes.slice(added.length), 'the older history stays').toEqual(changesBefore);
    await plan.expectHistory(changes);
    await plan.history.scrollIntoViewIfNeeded();
    await snap(page, 'replacement-plan-history', { fullPage: false });
  });

  await test.step('the placement is stored completely (placement_*, PRD F2)', async () => {
    const backup = await fetchExport(page.request);
    const stored = backup.rows<PlacementTestRow>('placement_tests').find((row) => row.id === testId);
    expect(stored).toMatchObject({ status: 'completed', startLevel: START_LEVEL, resultLevel: START_LEVEL });
    expect(Object.keys(stored?.result?.initialMastery ?? {}).length, 'initial mastery').toBeGreaterThan(0);
    const rows = backup
      .rows<PlacementAnswerRow>('placement_answers')
      .filter((row) => row.placementTestId === testId);
    expect(rows.map((row) => [row.position, row.exerciseId, row.outcome])).toEqual(
      answers.map((id, index) => [index + 1, id, 'wrong']),
    );
  });

  await test.step('back on the path: the unit in progress is never skipped', async () => {
    await new PlanPage(page).toPathButton.click();
    const path = new LearningPathPage(page);
    await path.expectVisible();
    const pathAfter = await fetchPath(page.request);
    const unitAfter = currentUnit(pathAfter);
    await expect(path.unit(unitAfter.title).locator('button[aria-current="step"]')).toBeVisible();

    const before = unitsById(pathBefore);
    const after = unitsById(pathAfter);
    const reasons = (await fetchPlanChanges(page.request))
      .filter((change) => change.planVersion === planBefore.version + 1)
      .map((change) => change.reason);
    if (unitAfter.unitId !== unitBefore.unitId) {
      // Only mastery proven in lessons shortens a unit (PRD F3), and that may finish the one in progress.
      expect(after.get(unitBefore.unitId)?.status, `"${unitBefore.title}" is done, not skipped`).toBe(
        'completed',
      );
      expect(reasons).toContainEqual(
        expect.stringMatching(new RegExp(`^Einheit ‚${escapeRegExp(unitBefore.title)}‘ verkürzt: `)),
      );
    }
    for (const unit of after.values()) {
      if (unit.status !== 'skipped' || before.get(unit.unitId)?.status === 'skipped') continue;
      expect(unit.unitId, 'the unit in progress stays').not.toBe(unitBefore.unitId);
      expect(reasons, `the history explains why "${unit.title}" is skipped`).toContain(
        `Einheit ‚${unit.title}‘ übersprungen: bereits beherrscht`,
      );
    }
  });
});

const unitsById = (path: LearningPath) =>
  new Map(path.stages.flatMap((stage) => stage.units).map((unit) => [unit.unitId, unit]));
