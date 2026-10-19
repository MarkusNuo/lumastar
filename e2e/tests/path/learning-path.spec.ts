import { expect, test } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { shownDay } from '../../support/dates.ts';
import {
  checkpointAsNextStep,
  fetchPath,
  nextBandGoal,
  type CheckpointStatus,
  type PathStage,
  type PathUnit,
} from '../../support/planApi.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';

/*
 * The learning path on the home tab: every stage from the current level up to C2 with
 * its unit banners, one node per planned lesson, the next lesson as the only current node and the
 * checkpoint at the end of each stage with its live status.
 */

type NodeStatus = 'abgeschlossen' | 'als Nächstes' | 'verfügbar' | 'gesperrt';

const CHECKPOINT_NODE: Record<CheckpointStatus, NodeStatus> = {
  locked: 'gesperrt',
  available: 'verfügbar',
  passed: 'abgeschlossen',
};

/** Room for the sticky top bar above an element scrolled to the top. */
const TOP_BAR_GAP = 88;

/**
 * A checkpoint not passed yet opens once every unit of its stage that has exercises is done
 * (completed or skipped); focus units are extra practice and do not count.
 */
function openCheckpointStatus(stage: PathStage): Exclude<CheckpointStatus, 'passed'> {
  const units = stage.units.filter((unit) => !unit.focus && unit.hasContent);
  const done = units.every((unit) => unit.status === 'completed' || unit.status === 'skipped');
  return units.length > 0 && done ? 'available' : 'locked';
}

/**
 * The status a node of the unit must show: skipped and done units stay repeatable, a
 * focus unit is open as soon as the plan inserts it, and while an open checkpoint is the next
 * step the next lesson stays playable without being the current node.
 */
function expectedStatuses(unit: PathUnit, checkpointIsNext: boolean): NodeStatus[] {
  return Array.from({ length: Math.max(1, unit.estimatedLessons) }, (_, lesson): NodeStatus => {
    if (!unit.hasContent) return 'gesperrt';
    if (lesson < unit.lessonsCompleted) return 'abgeschlossen';
    switch (unit.status) {
      case 'in_progress':
        if (lesson !== unit.lessonsCompleted) return 'gesperrt';
        return checkpointIsNext ? 'verfügbar' : 'als Nächstes';
      case 'completed':
      case 'skipped':
        return 'verfügbar';
      case 'planned':
        return unit.focus ? 'verfügbar' : 'gesperrt';
    }
  });
}

test('the path shows the plan up to C2: stages, unit banners, lesson nodes, the next lesson and the checkpoints', async ({
  page,
}) => {
  test.setTimeout(2 * 60_000);
  const data = await fetchPath(page.request);
  const nextCheckpoint = checkpointAsNextStep(data);
  const path = new LearningPathPage(page);
  await path.goto();

  await test.step('it opens at the next step', async () => {
    await expect(path.currentNode).toHaveCount(1);
    await expect(path.currentNode).toBeInViewport();
    const bubble = nextCheckpoint ? 'Checkpoint' : 'Start';
    await expect(page.getByText(bubble, { exact: true }), 'the bubble of the current node').toBeVisible();
    await snap(page, 'path-current', { fullPage: false });
  });

  await test.step('the plan teaser names the next goal', async () => {
    const goal = nextBandGoal(data);
    if (!goal) throw new Error('The plan has no estimate after the current level');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(path.planTeaser).toBeInViewport();
    await expect(path.planTeaser).toContainText(
      `${goal.band} geschafft ca. am ${await shownDay(page, goal.day)}`,
    );
    await expect(path.planTeaser.getByRole('img', { name: `Niveau ${data.currentLevel}` })).toBeVisible();
    await snap(page, 'path-top', { fullPage: false });
  });

  expect(data.stages.at(-1)?.level, 'the path reaches C2').toBe('C2.3');
  for (const stage of data.stages) {
    await test.step(`${stage.level} · ${stage.title}`, async () => {
      const section = path.stage(stage.level, stage.title);
      await expect(section).toBeAttached();
      for (const unit of stage.units) {
        const unitSection = path.unit(unit.title);
        await expect(unitSection.getByRole('heading', { name: unit.title, level: 3 })).toBeAttached();
        const names = await path
          .lessonNodes(unitSection)
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
        const kind = unit.focus ? 'Fokus-Lektion' : 'Lektion';
        expect(names, `${unit.title}: one node per planned lesson`).toEqual(
          expectedStatuses(unit, nextCheckpoint !== undefined).map(
            (status, index) => `${kind} ${index + 1}, ${status}`,
          ),
        );
        if (!unit.hasContent) await expect(unitSection.getByText('Bald verfügbar')).toBeAttached();
        if (unit.status === 'skipped') await expect(unitSection.getByText('Übersprungen')).toBeAttached();
      }
      const { status } = stage.checkpoint;
      if (status !== 'passed') {
        expect(status, `checkpoint ${stage.level}: open once the units are done`).toBe(
          openCheckpointStatus(stage),
        );
      }
      const shown = stage === nextCheckpoint ? 'als Nächstes' : CHECKPOINT_NODE[status];
      await expect(path.checkpoint(stage.level)).toHaveAccessibleName(`Checkpoint ${stage.level}, ${shown}`);
    });
  }

  await test.step('a locked lesson cannot be started', async () => {
    const locked = page.getByRole('main').getByRole('button', { name: /^Lektion \d+, gesperrt$/ }).first();
    await locked.scrollIntoViewIfNeeded();
    await locked.tap();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step('scrolled down: the first checkpoint and the next stage', async () => {
    const [first, second] = data.stages;
    if (!first || !second) throw new Error('The path has fewer than two stages');
    await scrollToTop(path.checkpoint(first.level), TOP_BAR_GAP);
    await expect(path.stage(second.level, second.title).getByRole('heading', { level: 2 })).toBeInViewport();
    await snap(page, 'path-scrolled', { fullPage: false });
  });

  await test.step('stages without exercises yet', async () => {
    const waiting = data.stages.find((stage) => stage.units.every((unit) => !unit.hasContent));
    if (!waiting) return;
    await scrollToTop(path.stage(waiting.level, waiting.title), TOP_BAR_GAP);
    await expect(path.unit(waiting.units[0]?.title ?? '').getByText('Bald verfügbar')).toBeInViewport();
    await snap(page, 'path-coming-soon', { fullPage: false });
  });
});
