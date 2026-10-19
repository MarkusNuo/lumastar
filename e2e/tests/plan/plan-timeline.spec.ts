import { expect, test, type Locator } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { PlanPage } from '../../pages/PlanPage.ts';
import {
  BANDS,
  bandOf,
  fetchPath,
  fetchPlanChanges,
  type Band,
  type LearningPath,
  type PathStage,
} from '../../support/planApi.ts';
import { shownDay } from '../../support/dates.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';

/*
 * The plan as a timeline up to C2: one entry per CEFR band with its expected day at
 * the daily goal, the stages and units of the current band, and the "Plan-Verlauf" with the reasons.
 */

/** The bands of the plan in order. */
function bandsOf(path: LearningPath): Band[] {
  return [...new Set(path.stages.map((stage) => bandOf(stage.level)))];
}

const stagesOf = (path: LearningPath, band: Band) =>
  path.stages.filter((stage) => bandOf(stage.level) === band);

/** An expanded band lists its stages with their units in plan order; the current stage is marked. */
async function expectStages(entry: Locator, stages: readonly PathStage[], currentLevel: string): Promise<void> {
  for (const stage of stages) {
    const block = entry.getByRole('region', { name: new RegExp(`^${escapeRegExp(stage.level)} · `) });
    await expect(block).toBeVisible();
    await expect(block.getByRole('listitem')).toHaveText(
      stage.units.map((unit) => new RegExp(`^${escapeRegExp(unit.title)}`)),
    );
    const here = block.getByText('Du bist hier');
    await (stage.level === currentLevel ? expect(here).toBeVisible() : expect(here).toHaveCount(0));
  }
}

test('the plan shows every band up to C2 with its expected day, the current stage and the plan history', async ({
  page,
}) => {
  const path = await fetchPath(page.request);
  const changes = await fetchPlanChanges(page.request);
  const plan = new PlanPage(page);

  const learningPath = new LearningPathPage(page);
  await learningPath.goto();
  await learningPath.planTeaser.click();
  await plan.expectVisible();
  await expect(page.getByText(`Von ${path.currentLevel} bis ${path.targetLevel}`)).toBeVisible();
  await expect(page.getByText(`bei ${path.dailyGoalMinutes} Min. pro Tag`)).toBeVisible();
  await snap(page, 'plan-timeline', { fullPage: false });

  const currentBand = bandOf(path.currentLevel);
  const bands = bandsOf(path);
  expect(bands, 'from the current level up to C2').toEqual(
    Object.keys(BANDS).slice(Object.keys(BANDS).indexOf(currentBand)),
  );

  for (const band of bands) {
    await test.step(`${band} · ${BANDS[band]}: current marker, expected day, units`, async () => {
      const entry = plan.band(band);
      await expect(entry).toBeVisible();
      if (band === currentBand) {
        await expect(entry).toHaveAttribute('aria-current', 'step');
      } else {
        await expect(entry).not.toHaveAttribute('aria-current');
      }
      const day = path.estimates[band];
      if (day) {
        await expect(entry.getByText(`ca. ${await shownDay(page, day)} · `)).toBeVisible();
      } else {
        expect(band, 'only A0 has no estimate (estimates start at A1)').toBe('A0');
      }
      const units = stagesOf(path, band).flatMap((stage) => stage.units).length;
      const toggle = plan.unitsToggle(band);
      if (band === currentBand) {
        await expect(toggle, 'the current band starts expanded').toHaveAttribute('aria-expanded', 'true');
        await expectStages(entry, stagesOf(path, band), path.currentLevel);
      } else {
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toHaveText(`${units} ${units === 1 ? 'Einheit' : 'Einheiten'} anzeigen`);
      }
    });
  }

  const nextBand = bands[1];
  if (nextBand) {
    await test.step(`expanding ${nextBand} shows its stages`, async () => {
      const toggle = plan.unitsToggle(nextBand);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveText('Einheiten ausblenden');
      await expectStages(plan.band(nextBand), stagesOf(path, nextBand), path.currentLevel);
      await scrollToTop(plan.band(nextBand), 16);
      await snap(page, 'plan-band-expanded', { fullPage: false });
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  }

  const goalDay = path.estimates[path.targetLevel];
  if (!goalDay) throw new Error(`The plan has no estimate for ${path.targetLevel}`);
  await expect(plan.goal(path.targetLevel)).toContainText(`ca. ${await shownDay(page, goalDay)}`);
  await plan.goal(path.targetLevel).scrollIntoViewIfNeeded();
  await snap(page, 'plan-timeline-goal', { fullPage: false });

  await plan.expectHistory(changes);
  await plan.history.scrollIntoViewIfNeeded();
  await snap(page, 'plan-history', { fullPage: false });

  await plan.toPathButton.click();
  await learningPath.expectVisible();
});
