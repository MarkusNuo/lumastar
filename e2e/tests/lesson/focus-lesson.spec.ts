import { expect, test, type Locator } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { canAnswerWrong } from '../../support/lessonAnswers.ts';
import type { LessonExercise } from '../../support/lessonApi.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import {
  currentUnit,
  fetchPath,
  fetchPlanChanges,
  type LearningPath,
} from '../../support/planApi.ts';
import { finishOpenFocusUnits } from '../../support/progression.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';

/*
 * Focus lessons (PRD F7, F3, 12.3): a skill tag answered wrong three times in one lesson suggests a
 * focus lesson on the result screen; it plays in the lesson player with exercises of that tag only,
 * and the path shows the inserted focus unit with its target symbol and the reason.
 */

/** PRD F7: a skill tag with at least three mistakes in one lesson. */
const FOCUS_MISTAKES = 3;

/** Room for the sticky top bar above an element scrolled to the top. */
const TOP_BAR_GAP = 88;

/**
 * The skill tag with the most exercises the test can answer wrong for sure; a focus lesson is only
 * made of exercises up to the learner's level, so the lesson must be one of the learner's stage.
 */
function weakTagPlan(exercises: readonly LessonExercise[]): { tag: string; wrong: Set<string> } {
  const byTag = new Map<string, LessonExercise[]>();
  for (const exercise of exercises.filter(canAnswerWrong)) {
    for (const tag of exercise.skillTags) byTag.set(tag, [...(byTag.get(tag) ?? []), exercise]);
  }
  const [tag, candidates = []] =
    [...byTag.entries()].sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))[0] ?? [];
  if (!tag || candidates.length < FOCUS_MISTAKES) {
    throw new Error(`No skill tag has ${FOCUS_MISTAKES} exercises with choices or a typed answer`);
  }
  return { tag, wrong: new Set(candidates.slice(0, FOCUS_MISTAKES).map((exercise) => exercise.id)) };
}

/**
 * The node to play: the next lesson of the unit in progress if it belongs to the learner's stage,
 * otherwise a lesson of a done unit of that stage (done units stay repeatable, PRD F3).
 */
function lessonOfLearnerStage(path: LearningPath, page: LearningPathPage): Locator {
  const [stage] = path.stages;
  if (!stage) throw new Error('The learning path has no stage');
  const unit = currentUnit(path);
  if (stage.units.includes(unit)) return page.nextLessonNode(unit);
  const done = stage.units.find(
    (candidate) => !candidate.focus && candidate.hasContent && candidate.status !== 'planned',
  );
  if (!done) throw new Error(`Stage ${stage.level} has no lesson to play`);
  return page
    .unit(done.title)
    .getByRole('button', { name: /^Lektion \d+, (abgeschlossen|verfügbar)$/ })
    .first();
}

test('three mistakes on one skill tag suggest a focus lesson, which plays and shows on the path', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  const path = new LearningPathPage(page);
  const player = new LessonPlayer(page);
  const resultScreen = new LessonResultScreen(page);
  // Two open focus units would leave no room for the one this lesson asks for (PRD F3).
  await finishOpenFocusUnits(page.request);
  const changesBefore = await fetchPlanChanges(page.request);

  await path.goto();
  const node = lessonOfLearnerStage(await fetchPath(page.request), path);
  await node.scrollIntoViewIfNeeded();
  const lesson = await openLesson(page, () => node.tap());
  const { tag, wrong } = weakTagPlan(lesson.lesson.exercises);

  const result = await test.step(`${FOCUS_MISTAKES} mistakes on ${tag}`, () =>
    playOpenedLesson(page, lesson, {
      intentOf: (exercise) => (wrong.has(exercise.id) ? 'wrong' : 'correct'),
      end: resultScreen.heading,
    }),
  );

  const suggestion = result.focusSuggestion;
  if (!suggestion) throw new Error(`The lesson with ${FOCUS_MISTAKES} mistakes on ${tag} suggests no focus lesson`);
  const wrongTags = lesson.lesson.exercises
    .filter((exercise) => wrong.has(exercise.id))
    .flatMap((exercise) => exercise.skillTags);
  const mistakes = wrongTags.filter((wrongTag) => wrongTag === suggestion.skillTag).length;
  expect(mistakes, `the suggested ${suggestion.skillTag} got ${FOCUS_MISTAKES} mistakes or more`).toBeGreaterThanOrEqual(
    FOCUS_MISTAKES,
  );

  await test.step('the result screen suggests the focus lesson', async () => {
    const card = resultScreen.focusSuggestion(suggestion.label);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Hier hattest du mehrere Fehler.');
    await card.scrollIntoViewIfNeeded();
    await expect(resultScreen.focusStartButton(suggestion.label)).toBeInViewport();
    await snap(page, 'result-focus-suggestion', { fullPage: false });
  });

  await test.step('the plan history names the cause and the inserted focus unit (PRD F3)', async () => {
    const changes = await fetchPlanChanges(page.request);
    const added = changes.slice(0, changes.length - changesBefore.length);
    expect(added[0], 'the lesson is the cause of the new plan version').toMatchObject({
      type: 'replanned',
      trigger: 'lesson',
      reason: `Lektion mit ${mistakes} Fehlern bei ‚${suggestion.label}‘`,
    });
    expect(added.map((change) => change.reason)).toContainEqual(
      expect.stringMatching(new RegExp(`^Fokus-Lektion ‚${escapeRegExp(suggestion.label)}‘ eingefügt`)),
    );
  });

  await test.step('"Fokus-Lektion starten" plays it in the lesson player', async () => {
    const focus = await openLesson(page, () => resultScreen.focusStartButton(suggestion.label).click());
    expect(focus.lesson).toMatchObject({ kind: 'focus', unitId: suggestion.unitId });
    await expect(page).toHaveURL(new RegExp(`/lesson/${escapeRegExp(encodeURIComponent(suggestion.unitId))}$`));
    for (const exercise of focus.lesson.exercises) {
      expect(exercise.skillTags, `${exercise.id} practises ${suggestion.skillTag}`).toContain(suggestion.skillTag);
    }
    await expect(player.exercise).toBeVisible();
    await snap(page, 'focus-lesson-exercise', { fullPage: false });

    const focusResult = await playOpenedLesson(page, focus, { end: resultScreen.heading });
    expect(focusResult.kind).toBe('focus');
    await expect(resultScreen.heading).toHaveText(/^(Fokus-Lektion geschafft!|Fehlerfrei!)$/);
    await snap(page, 'focus-lesson-result', { fullPage: false });
    await resultScreen.continueButton.click();
    await new AppShell(page).expectHome();
  });

  await test.step('the path shows the focus unit with its target symbol and reason', async () => {
    const unit = (await fetchPath(page.request)).stages
      .flatMap((stage) => stage.units)
      .find((candidate) => candidate.unitId === suggestion.unitId);
    expect(unit, 'the focus unit stays on the path, played').toMatchObject({
      focus: true,
      status: 'completed',
      title: `Fokus: ${suggestion.label}`,
    });
    const section = path.unit(unit?.title ?? '');
    const banner = section.locator('[data-tone]').first();
    await expect(banner).toContainText('Fokus-Lektion');
    await expect(banner.getByText(unit?.reason ?? '', { exact: true }), 'the reason').toBeVisible();
    await expect(banner.locator(':scope > svg'), 'the target symbol of the banner').toHaveCount(1);
    await expect(path.lessonNodes(section)).toHaveCount(1);
    await expect(path.lessonNodes(section)).toHaveAccessibleName('Fokus-Lektion 1, abgeschlossen');
    await scrollToTop(banner, TOP_BAR_GAP);
    await snap(page, 'path-focus-unit', { fullPage: false });
  });
});
