import { expect, test, type Page, type Response } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import {
  FEEDBACK,
  LessonPlayer,
  VARIANT_OF,
  type FeedbackVariant,
} from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { isSpecialChar } from '../../support/answers.ts';
import { AttemptGate } from '../../support/attemptGate.ts';
import {
  almostAnswer,
  choiceFor,
  hasChoices,
  isTyped,
  textFor,
  type Intent,
} from '../../support/lessonAnswers.ts';
import {
  fetchXpTotal,
  isAttempt,
  isCompletion,
  isLessonStart,
  EXERCISE_TYPES,
  type AttemptRequest,
  type AttemptResponse,
  type LessonExercise,
  type LessonResponse,
  type LessonResultResponse,
  type Outcome,
} from '../../support/lessonApi.ts';
import { checkpointAsNextStep, currentUnit, fetchPath } from '../../support/planApi.ts';
import { finishOpenFocusUnits } from '../../support/progression.ts';
import { exerciseScreenName, snap } from '../../support/screenshots.ts';

/*
 * The next lesson of the learning path through the real UI. The backend composes
 * the lesson from the learner profile, so the start response tells the test each exercise's type and
 * solutions. One choice is answered wrong, one text without its diacritics, one with a Standard form;
 * the rest right. Every answer is held back from the backend until the instant feedback sheet of the
 * pre-check is on screen, so each verdict shows that the pre-check and the backend agree.
 * The result screen shows XP, accuracy, time and today's goal; the top bar then has the new XP.
 */
const BASE_XP = 10;
/** Every lesson of a unit shows at least this many of the six exercise types. */
const MIXED_TYPES = 4;
/** The result screen lists this many practised words until "Alle <n> anzeigen" is tapped. */
const COLLAPSED_WORDS = 6;

const OUTCOME_OF: Record<Intent, Outcome> = {
  correct: 'correct',
  almost: 'almost_correct',
  standard: 'correct_standard_form',
  wrong: 'wrong',
};

/** The deliberate deviations; every exercise not in the map is answered correctly. */
function planIntents(exercises: readonly LessonExercise[]): Map<string, Intent> {
  const intents = new Map<string, Intent>();
  /** The first exercise without an intent that fits, trying the conditions in order of preference. */
  const pick = (intent: Intent, ...conditions: ((exercise: LessonExercise) => boolean)[]) => {
    const free = exercises.filter((exercise) => !intents.has(exercise.id));
    for (const fits of conditions) {
      const exercise = free.find(fits);
      if (exercise) {
        intents.set(exercise.id, intent);
        return;
      }
    }
  };
  const almostFits = (exercise: LessonExercise) =>
    isTyped(exercise) && almostAnswer(exercise) !== undefined;
  const standardFits = (exercise: LessonExercise) =>
    isTyped(exercise) && (exercise.standardForms?.length ?? 0) > 0;
  // Deviations prefer exercises that leave a right Gheg answer typed through the bar.
  const leavesBarAnswer = (exercise: LessonExercise) =>
    exercises.some((other) => other !== exercise && !intents.has(other.id) && needsBar(other));

  pick('wrong', (exercise) => exercise.type === 'multiple_choice', hasChoices);
  // "almost" is required, a Standard form only shown when another typed exercise offers one.
  pick('almost', (exercise) => almostFits(exercise) && leavesBarAnswer(exercise), almostFits);
  pick('standard', (exercise) => standardFits(exercise) && leavesBarAnswer(exercise), standardFits);
  return intents;
}

/** A typed Gheg answer whose solution has ë, ç, â…, i.e. one typed through the special-character bar. */
function needsBar(exercise: LessonExercise): boolean {
  return usesBar(exercise, 'correct');
}

/** Whether answering with the intent types ë, ç, â… through the bar; "almost" leaves them out. */
function usesBar(exercise: LessonExercise, intent: Intent): boolean {
  if (!isTyped(exercise) || exercise.answerLang !== 'sq' || intent === 'almost') return false;
  return [...textFor(exercise, intent)].some(isSpecialChar);
}

/** Collects every lesson response of the page, to check their status codes at the end. */
function recordResponses(page: Page, matches: (response: Response) => boolean): Response[] {
  const responses: Response[] = [];
  page.on('response', (response) => {
    if (matches(response)) responses.push(response);
  });
  return responses;
}

const percent = (share: number) => new RegExp(`${Math.round(share * 100)}\\s?%`);

function clock(durationMs: number): string {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

test('a full lesson with every exercise type, all feedback states, the retry and the result', async ({
  page,
}) => {
  test.setTimeout(4 * 60_000);
  const shell = new AppShell(page);
  const path = new LearningPathPage(page);
  const player = new LessonPlayer(page);
  const resultScreen = new LessonResultScreen(page);
  const attemptResponses = recordResponses(page, isAttempt);
  const completions = recordResponses(page, isCompletion);
  const gate = await AttemptGate.install(page);
  // A focus lesson practises one skill tag; the lesson of a curriculum unit has every exercise type.
  await finishOpenFocusUnits(page.request);

  await path.goto();
  const xpBefore = await fetchXpTotal(page.request);
  await expect(shell.xpLabel).toHaveText(`${xpBefore} XP`);
  const nextUnit = currentUnit(await fetchPath(page.request));

  const started = page.waitForResponse(isLessonStart);
  await path.startCurrentLesson();
  const startResponse = await started;
  expect(startResponse.status()).toBe(201);
  const lesson = (await startResponse.json()) as LessonResponse;
  expect(lesson.unitId, 'the next node starts the unit in progress').toBe(nextUnit.unitId);
  await expect(page).toHaveURL(new RegExp(`/lesson/${lesson.unitId}$`));

  const total = lesson.exercises.length;
  // The composer mixes as many types as the unit's open exercises allow: later lessons
  // of a unit may lack one. The first lesson of the run has all of them (tests/daily-goal).
  const types = new Set(lesson.exercises.map((exercise) => exercise.type));
  expect(types.size, 'the lesson mixes the exercise types').toBeGreaterThanOrEqual(MIXED_TYPES);
  const missing = EXERCISE_TYPES.filter((type) => !types.has(type));
  if (missing.length > 0) test.info().annotations.push({ type: 'types not in this lesson', description: missing.join(', ') });
  const intents = planIntents(lesson.exercises);
  const planned = [...intents.values()];
  expect(planned, 'one wrong, one almost correct answer').toEqual(
    expect.arrayContaining(['wrong', 'almost']),
  );
  const expectedVariants = new Set<FeedbackVariant>(['correct', ...planned]);
  const byId = new Map(lesson.exercises.map((exercise) => [exercise.id, exercise]));
  // A lesson whose only Gheg answer with ë, ç, â… is the "almost" one tries the bar out instead.
  const barAnswerPlanned = lesson.exercises.some((exercise) =>
    usesBar(exercise, intents.get(exercise.id) ?? 'correct'),
  );

  await expect(player.progress).toHaveAttribute('aria-valuemax', String(total));
  await expect(player.progress).toHaveAttribute('aria-valuenow', '0');
  if (lesson.exercises[0]?.type !== 'match_pairs') {
    await expect(player.checkButton, 'nothing to check yet').toBeDisabled();
  }

  const answerCount = new Map<string, number>();
  const shownScreens = new Set<string>();
  const shownFeedback = new Set<FeedbackVariant>();
  let wrongExercise: string | undefined;
  let charsFromBar = 0;

  for (let step = 0; ; step += 1) {
    expect(step, 'the lesson ends after its exercises and one retry').toBeLessThanOrEqual(total + 1);
    await expect(player.exercise.or(resultScreen.heading)).toBeVisible();
    if (await resultScreen.heading.isVisible()) break;

    const { id, type } = await player.current();
    const exercise = byId.get(id);
    if (!exercise) throw new Error(`Exercise ${id} is not part of the lesson response`);
    expect(type).toBe(exercise.type);
    const retry = answerCount.has(id);
    const intent: Intent = retry ? 'correct' : (intents.get(id) ?? 'correct');

    await test.step(`${step + 1}. ${id}${retry ? ' (retry)' : ''}: ${intent}`, async () => {
      await (retry ? expect(player.retryBadge).toBeVisible() : expect(player.retryBadge).toBeHidden());
      const progressBefore = await player.progressValue();

      const beforeCheck = async () => {
        const name = retry ? 'retry' : exerciseScreenName(exercise);
        if (shownScreens.has(name)) return;
        shownScreens.add(name);
        await snap(page, name, { fullPage: false });
      };

      const attempt = page.waitForResponse(isAttempt);
      if (exercise.type === 'match_pairs') {
        await player.matchPairs(exercise.pairs ?? [], beforeCheck);
      } else {
        if (!barAnswerPlanned && charsFromBar === 0 && isTyped(exercise) && exercise.answerLang === 'sq') {
          charsFromBar += await player.tryOutSpecialChars(player.textField(exercise));
        }
        charsFromBar += await player.enterAnswer(exercise, intent);
        await beforeCheck();
        await player.check();
      }

      const instant = await player.shownFeedback();
      await expect
        .poll(() => gate.heldCount, { message: 'the sheet came before the backend verdict' })
        .toBe(1);
      await gate.release();
      const attemptResponse = await attempt;
      expect(attemptResponse.ok(), 'the backend accepts the attempt').toBe(true);
      expect(attemptResponse.request().postDataJSON() as AttemptRequest).toMatchObject({
        exerciseId: id,
        retry,
      });
      const verdict = (await attemptResponse.json()) as AttemptResponse;
      expect(verdict.outcome, 'binding evaluation of the backend').toBe(OUTCOME_OF[intent]);

      const variant = VARIANT_OF[verdict.outcome];
      const sheet = player.feedbackSheet(variant);
      await expect(sheet).toBeVisible();
      expect(instant, 'the instant pre-check shows the verdict of the backend').toBe(variant);
      await expect(sheet).toHaveAttribute('data-tone', FEEDBACK[variant].tone);
      if (variant !== 'correct' && verdict.solution) {
        await expect(sheet).toContainText(`${FEEDBACK[variant].solutionLabel}:`);
        await expect(sheet).toContainText(verdict.solution);
      }
      await expect(player.progress, 'only answers that count move the bar').toHaveAttribute(
        'aria-valuenow',
        String(progressBefore + (verdict.countsAsCorrect ? 1 : 0)),
      );

      if (variant === 'wrong') {
        wrongExercise = id;
        const chosen = choiceFor(exercise, 'wrong');
        const solution = choiceFor(exercise, 'correct');
        if (exercise.type === 'multiple_choice') {
          await expect(player.option(chosen)).toHaveAttribute('data-tone', 'danger');
          await expect(player.option(solution)).toHaveAttribute('data-tone', 'success');
        }
      }

      if (!shownFeedback.has(variant)) {
        shownFeedback.add(variant);
        await expect(sheet).toBeInViewport({ ratio: 1 });
        await snap(page, `feedback-${variant}`, { fullPage: false });
      }

      answerCount.set(id, (answerCount.get(id) ?? 0) + 1);
      await player.continueFrom(sheet);
    });
  }

  expect(wrongExercise, 'a wrong answer was given').toBeDefined();
  expect(answerCount.get(wrongExercise ?? ''), 'the wrong exercise came back at the end').toBe(2);
  expect(shownFeedback).toEqual(expectedVariants);
  expect(charsFromBar, 'special characters typed through the bar').toBeGreaterThan(0);
  expect(attemptResponses).toHaveLength(total + 1);
  expect(attemptResponses.map((response) => response.status()).every((status) => status < 300)).toBe(
    true,
  );

  await test.step('result screen', async () => {
    await expect(resultScreen.heading).toHaveText('Lektion geschafft!');
    await expect.poll(() => completions.length).toBe(1);
    const completion = completions[0];
    if (!completion) throw new Error('The lesson was not completed');
    expect(completion.status()).toBe(200);
    const result = (await completion.json()) as LessonResultResponse;

    expect(result).toMatchObject({ exerciseCount: total, correctCount: total - 1 });
    expect(result.xpBreakdown).toMatchObject({ base: BASE_XP, perfectBonus: 0 });
    expect(result.xpEarned).toBe(result.xpBreakdown.base + result.xpBreakdown.speedBonus);
    expect(result.xpTotal).toBe(xpBefore + result.xpEarned);

    await expect(resultScreen.stat('XP')).toContainText(`+${result.xpEarned}`);
    await expect(resultScreen.stat('Genauigkeit')).toContainText(percent(result.accuracy));
    await expect(resultScreen.stat('Zeit')).toContainText(clock(result.durationMs));
    await expect(resultScreen.xpPart('Basis')).toHaveText(`Basis +${BASE_XP}`);
    const learned = result.learnedItems.length;
    await expect(resultScreen.learnedWords()).toHaveCount(Math.min(learned, COLLAPSED_WORDS));
    await resultScreen.expectDailyGoal(result.dailyGoal);
    await snap(page, 'result', { fullPage: false });
    await resultScreen.dailyGoalCard.scrollIntoViewIfNeeded();
    await snap(page, 'result-daily-goal', { fullPage: false });
    if (learned > COLLAPSED_WORDS) {
      const showAll = resultScreen.showAllWordsButton(learned);
      await expect(showAll).toHaveAttribute('aria-expanded', 'false');
      await showAll.click();
      await expect(resultScreen.learnedWords()).toHaveCount(learned);
      await expect(resultScreen.showFewerWordsButton).toHaveAttribute('aria-expanded', 'true');
    }
    // A full-page capture would leave the sticky "Weiter" button in the middle of the word list.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await snap(page, 'result-scrolled', { fullPage: false });

    await resultScreen.leave(result);
    await shell.expectHome();
    await expect(shell.xpLabel, 'the top bar shows the new XP').toHaveText(`${result.xpTotal} XP`);
    const pathAfter = await fetchPath(page.request);
    const next = currentUnit(pathAfter);
    const kind = next.focus ? 'Fokus-Lektion' : 'Lektion';
    // The lesson may have finished the stage: then its open checkpoint is the next step.
    const checkpoint = checkpointAsNextStep(pathAfter);
    await expect(path.currentNode, 'the path moves on to the next step right away').toHaveAccessibleName(
      checkpoint
        ? `Checkpoint ${checkpoint.level}, als Nächstes`
        : `${kind} ${next.lessonsCompleted + 1}, als Nächstes`,
    );
    if (!checkpoint) {
      await expect(path.unit(next.title).locator('button[aria-current="step"]')).toHaveCount(1);
    }
    await snap(page, 'home-after-lesson', { fullPage: false });
  });
});
