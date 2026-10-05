import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import {
  CheckpointIntroSheet,
  CheckpointResultScreen,
  share,
} from '../../pages/CheckpointScreens.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { canAnswerWrong } from '../../support/lessonAnswers.ts';
import {
  fetchMe,
  isCheckpointStart,
  type CheckpointResult,
  type LessonExercise,
} from '../../support/lessonApi.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import {
  checkpointAsNextStep,
  fetchPath,
  fetchPlanChanges,
  stageOf,
  type PlanChange,
} from '../../support/planApi.ts';
import { completeStageViaApi } from '../../support/progression.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';

/*
 * The checkpoint at the end of the learner's stage (PRD 5, F3, F9, 12.3). The lessons of the stage
 * are played through the API (the lesson player has its own tests); the checkpoint itself through
 * the UI: the node becomes the next step, its sheet says what it takes, a failed try encourages and
 * shows how close it came, a pass celebrates the new level, which the top bar, the path and the plan
 * history then show. It moves the learner up for good, so it runs in the level-up projects, after
 * every other test (see playwright.config.ts).
 */

const PASS_ACCURACY = 0.8;
const CHECKPOINT_EXERCISES = 15;
const TOP_BAR_GAP = 88;

/** The fewest mistakes that fail: below 80 % of the first answers right. */
function failingMistakes(exercises: readonly LessonExercise[]): Set<string> {
  const needed = Math.floor(exercises.length / 5) + 1;
  const candidates = exercises.filter(canAnswerWrong).slice(0, needed);
  expect(candidates.length, 'enough exercises to answer wrong for sure').toBe(needed);
  return new Set(candidates.map((exercise) => exercise.id));
}

/** The plan history entries of the newest plan version. */
async function latestChanges(changes: Promise<PlanChange[]>): Promise<PlanChange[]> {
  const all = await changes;
  return all.filter((change) => change.planVersion === all[0]?.planVersion);
}

test('the checkpoint of the stage: intro sheet, a failed try with encouragement, then the level-up', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const player = new LessonPlayer(page);
  const results = new CheckpointResultScreen(page);
  const lessonResult = new LessonResultScreen(page);

  const before = await fetchPath(page.request);
  const [stage, next] = before.stages;
  if (!stage || !next) throw new Error('The path has fewer than two stages');
  test.skip(
    !stage.units.some((unit) => !unit.focus && unit.hasContent),
    `${stage.level} has no exercises yet, so its checkpoint stays locked`,
  );
  const { level } = stage;
  expect(level, 'the path starts at the learner level').toBe(before.currentLevel);
  const intro = new CheckpointIntroSheet(page, level);
  const node = path.checkpoint(level);

  await test.step(`the lessons of ${level} through the API`, async () => {
    const played = await completeStageViaApi(page.request, level);
    test.info().annotations.push({ type: 'lessons played through the API', description: String(played) });
    const open = await fetchPath(page.request);
    expect(stageOf(open, level).checkpoint.status).toBe('available');
    expect(checkpointAsNextStep(open)?.level, 'no lesson of the stage is left before it').toBe(level);
  });

  await test.step('the open checkpoint is the next step of the path', async () => {
    await path.goto();
    await expect(path.currentNode).toHaveAccessibleName(`Checkpoint ${level}, als Nächstes`);
    await expect(path.currentNode).toBeInViewport();
    await snap(page, 'path-checkpoint-open', { fullPage: false });
  });

  await test.step('the intro sheet: what it takes and what it brings; "Später" closes it', async () => {
    await node.tap();
    await intro.expectOpen(next.level);
    await expect(intro.sheet).toBeInViewport({ ratio: 1 });
    await snap(page, 'checkpoint-intro', { fullPage: false });
    await intro.laterButton.click();
    await expect(intro.sheet).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });

  const playCheckpoint = async (mistakes: (lesson: LessonExercise[]) => Set<string>) => {
    await node.tap();
    await intro.expectOpen(next.level);
    const opened = await openLesson(page, () => intro.startButton.click(), isCheckpointStart);
    expect(opened.lesson.kind).toBe('checkpoint');
    expect(opened.lesson.exercises.length).toBeGreaterThan(0);
    expect(opened.lesson.exercises.length).toBeLessThanOrEqual(CHECKPOINT_EXERCISES);
    await expect(page).toHaveURL(new RegExp(`/checkpoint/${escapeRegExp(level)}$`));
    await expect(player.exercise).toBeVisible();
    const wrong = mistakes(opened.lesson.exercises);
    const result = await playOpenedLesson(page, opened, {
      intentOf: (exercise) => (wrong.has(exercise.id) ? 'wrong' : 'correct'),
      end: results.anyHeading(),
    });
    expect(result.kind).toBe('checkpoint');
    return { result, checkpoint: result.checkpoint as CheckpointResult };
  };

  await test.step('failed: encouraging, with the accuracy against the pass mark', async () => {
    const { result, checkpoint } = await playCheckpoint(failingMistakes);
    expect(checkpoint).toMatchObject({ level, passed: false, requiredAccuracy: PASS_ACCURACY, badges: [] });
    expect(checkpoint.newLevel, 'no new level after a failure').toBeUndefined();
    expect(result.accuracy).toBeLessThan(PASS_ACCURACY);

    await expect(results.failedHeading).toBeVisible();
    await expect(page.getByText(`Checkpoint ${level}`, { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        `Du hattest ${share(result.accuracy)} richtig, zum Bestehen brauchst du ${share(PASS_ACCURACY)}.`,
        { exact: false },
      ),
    ).toBeVisible();
    await expect(results.accuracyMeter(result.accuracy, PASS_ACCURACY)).toBeVisible();
    if (result.focusSuggestion) {
      await expect(lessonResult.focusSuggestion(result.focusSuggestion.label)).toBeVisible();
    }
    await snap(page, 'checkpoint-failed', { fullPage: false });

    await results.retryLaterButton.click();
    await path.expectVisible();
    expect((await fetchMe(page.request)).currentLevel, 'the level stays').toBe(level);
    await expect(shell.topBar.getByRole('img', { name: `Niveau ${level}`, exact: true })).toBeVisible();
    await expect(node, 'it can be tried again').toHaveAccessibleName(`Checkpoint ${level}, als Nächstes`);
    expect((await latestChanges(fetchPlanChanges(page.request)))[0]).toMatchObject({
      type: 'replanned',
      trigger: 'checkpoint',
      reason: `Checkpoint ${level} nicht bestanden (${Math.round(result.accuracy * 100)} %)`,
    });
  });

  await test.step(`passed: the level-up to ${next.level}`, async () => {
    const { checkpoint } = await playCheckpoint(() => new Set());
    expect(checkpoint).toMatchObject({ level, passed: true, newLevel: next.level });

    await expect(results.passedHeading(next.level)).toBeVisible();
    await expect(page.getByText(`Checkpoint ${level} bestanden!`, { exact: true })).toBeVisible();
    await expect(results.levelBadge(next.level)).toBeVisible();
    await expect(results.continueButton).toBeEnabled();
    await snap(page, 'checkpoint-level-up', { fullPage: false });
    await results.continueButton.click();
    // A checkpoint that completes a CEFR band reveals its badge next (tests/levelup/level-badge).
    if (checkpoint.badges.length > 0) await results.continueButton.click();
    await path.expectVisible();
  });

  await test.step('the new level: top bar, path and plan history', async () => {
    expect((await fetchMe(page.request)).currentLevel).toBe(next.level);
    await expect(
      shell.topBar.getByRole('img', { name: `Niveau ${next.level}`, exact: true }),
      'the top bar shows the new level',
    ).toBeVisible();

    const after = await fetchPath(page.request);
    expect(after.currentLevel).toBe(next.level);
    // The plan runs from the current level up to C2 (PRD F3), so the passed stage leaves the path.
    expect(after.stages[0]?.level).toBe(next.level);
    expect(after.stages.map((candidate) => candidate.level)).not.toContain(level);
    await expect(path.stage(next.level, next.title)).toBeAttached();
    await expect(path.checkpoint(next.level)).toHaveAccessibleName(
      new RegExp(`^Checkpoint ${escapeRegExp(next.level)}, (gesperrt|verfügbar|als Nächstes)$`),
    );

    const changes = await latestChanges(fetchPlanChanges(page.request));
    expect(changes[0], 'the pass is the cause of the new plan version').toMatchObject({
      type: 'level_changed',
      trigger: 'checkpoint',
      reason: `Checkpoint ${level} bestanden → ${next.level}`,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollToTop(path.stage(next.level, next.title), TOP_BAR_GAP);
    await snap(page, 'path-after-level-up', { fullPage: false });
  });
});
