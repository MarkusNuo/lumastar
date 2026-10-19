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
import { StreakCelebration } from '../../pages/StreakCelebration.ts';
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
 * The checkpoint at the end of the learner's stage. The lessons of the stage
 * are played through the API (the lesson player has its own tests); the checkpoint itself through
 * the UI: the node becomes the next step, its sheet says what it takes, a failed try encourages and
 * shows how close it came, a pass celebrates the new level, which the top bar, the path (with the
 * passed stage and its trophy above it) and the plan history then show. It moves the learner up for
 * good, so it runs in the level-up projects, after every other test (see playwright.config.ts).
 */

/** A checkpoint is passed with 80 % of the first answers right. */
const PASS_ACCURACY = 0.8;
const CHECKPOINT_EXERCISES = 15;
const TOP_BAR_GAP = 88;

/**
 * The fewest mistakes that fail: right first answers below the pass mark. In whole percent, so that
 * 0.8 × 15 is not 12.000000000000002.
 */
function failingMistakes(exercises: readonly LessonExercise[], required: number): Set<string> {
  const mostRightToFail = Math.ceil((exercises.length * Math.round(required * 100)) / 100) - 1;
  const needed = exercises.length - mostRightToFail;
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
  const celebration = new StreakCelebration(page);

  const before = await fetchPath(page.request);
  const [stage, next] = before.stages;
  if (!stage || !next) throw new Error('The path has fewer than two stages');
  test.skip(
    !stage.units.some((unit) => !unit.focus && unit.hasContent),
    `${stage.level} has no exercises yet, so its checkpoint stays locked`,
  );
  const { level } = stage;
  expect(level, 'the path starts at the learner level').toBe(before.currentLevel);
  expect(stage.checkpoint.requiredAccuracy, '80 % to pass').toBe(PASS_ACCURACY);
  expect(stage.checkpoint.exerciseCount, 'about 15 tasks').toBeGreaterThan(0);
  expect(stage.checkpoint.exerciseCount).toBeLessThanOrEqual(CHECKPOINT_EXERCISES);
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
    await intro.expectOpen(next.level, stage.checkpoint);
    await expect(intro.sheet).toBeInViewport({ ratio: 1 });
    await snap(page, 'checkpoint-intro', { fullPage: false });
    await intro.laterButton.click();
    await expect(intro.sheet).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });

  const playCheckpoint = async (mistakes: (lesson: LessonExercise[]) => Set<string>) => {
    await node.tap();
    await intro.expectOpen(next.level, stage.checkpoint);
    const opened = await openLesson(page, () => intro.startButton.click(), isCheckpointStart);
    expect(opened.lesson.kind).toBe('checkpoint');
    expect(opened.lesson.exercises, 'the size the intro promised').toHaveLength(
      stage.checkpoint.exerciseCount,
    );
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
    const { result, checkpoint } = await playCheckpoint((exercises) =>
      failingMistakes(exercises, PASS_ACCURACY),
    );
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
    await celebration.continueIfDue(result);
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

  const passed = await test.step(`passed: the level-up to ${next.level}`, async () => {
    const { result, checkpoint } = await playCheckpoint(() => new Set());
    expect(checkpoint).toMatchObject({ level, passed: true, newLevel: next.level });

    await expect(results.passedHeading(next.level)).toBeVisible();
    await expect(page.getByText(`Checkpoint ${level} bestanden!`, { exact: true })).toBeVisible();
    await expect(results.levelBadge(next.level)).toBeVisible();
    await expect(results.continueButton).toBeEnabled();
    await snap(page, 'checkpoint-level-up', { fullPage: false });
    await results.continueButton.click();
    // A checkpoint that completes a CEFR band reveals its badge next (tests/levelup/level-badge).
    if (checkpoint.badges.length > 0) await results.continueButton.click();
    await celebration.continueIfDue(result);
    await path.expectVisible();
    return result;
  });

  await test.step('the new level: top bar, path and plan history', async () => {
    expect((await fetchMe(page.request)).currentLevel).toBe(next.level);
    await expect(
      shell.topBar.getByRole('img', { name: `Niveau ${next.level}`, exact: true }),
      'the top bar shows the new level',
    ).toBeVisible();

    const after = await fetchPath(page.request);
    expect(after.currentLevel).toBe(next.level);
    // The plan runs from the current level up to C2, so the passed stage leaves the path.
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

  await test.step('the passed stage stays above the path with its trophy', async () => {
    const after = await fetchPath(page.request);
    expect(after.previousStage, 'GET /api/path names the stage passed last').toMatchObject({
      level,
      title: stage.title,
      accuracy: passed.accuracy,
    });
    const passedAt = after.previousStage?.passedAt ?? '';
    expect(Date.now() - Date.parse(passedAt), 'passed just now').toBeLessThan(10 * 60_000);

    await page.evaluate(() => window.scrollTo(0, 0));
    const card = path.passedStage(level, stage.title);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Bestanden');
    await expect(card).toContainText(`${level} · ${stage.title}`);
    const day = await page.evaluate(
      (instant) => new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(instant)),
      passedAt,
    );
    await expect(card).toContainText(`Checkpoint am ${day} mit ${share(passed.accuracy)}`);
    const [cardBox, stageBox] = await Promise.all([
      card.boundingBox(),
      path.stage(next.level, next.title).boundingBox(),
    ]);
    expect(cardBox?.y ?? Infinity, 'the trophy card comes before the current stage').toBeLessThan(
      stageBox?.y ?? -Infinity,
    );
    await snap(page, 'path-previous-stage', { fullPage: false });
  });
});
