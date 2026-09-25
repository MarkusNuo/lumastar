import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { FEEDBACK, LessonPlayer, type FeedbackVariant } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { firstBuildableChips, normalizeAnswer, withoutDiacritics } from '../../support/answers.ts';
import {
  fetchXpTotal,
  isAttempt,
  isCompletion,
  isLessonStart,
  P0_EXERCISE_TYPES,
  type AttemptRequest,
  type AttemptResponse,
  type LessonExercise,
  type LessonResponse,
  type LessonResultResponse,
  type Outcome,
} from '../../support/lessonApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * A whole lesson of the first unit through the real UI (PRD F4, F5, F9). The backend composes the
 * lesson at random, so the start response tells the test each exercise's type and solutions. One
 * choice is answered wrong, one text without its diacritics, one with a Standard form; the rest right.
 */

const UNIT = 'Begrüssung & Höflichkeit';
const BASE_XP = 10;

type Intent = FeedbackVariant;

const OUTCOME_OF: Record<Intent, Outcome> = {
  correct: 'correct',
  almost: 'almost_correct',
  standard: 'correct_standard_form',
  wrong: 'wrong',
};

const VARIANT_OF: Record<Outcome, FeedbackVariant> = {
  correct: 'correct',
  almost_correct: 'almost',
  correct_standard_form: 'standard',
  wrong: 'wrong',
};

const isTyped = (exercise: LessonExercise) =>
  exercise.type === 'translate_free' || (exercise.type === 'fill_gap' && !exercise.choices);

const hasChoices = (exercise: LessonExercise) => exercise.choices !== undefined;

const solutionsOf = (exercise: LessonExercise) => exercise.solutions ?? [];

/** A solution typed without ë, ç, â…, which neither is a solution nor a Standard form by itself. */
function almostAnswer(exercise: LessonExercise): string | undefined {
  const taken = new Set([...solutionsOf(exercise), ...(exercise.standardForms ?? [])].map(normalizeAnswer));
  return solutionsOf(exercise)
    .map(withoutDiacritics)
    .find((answer) => !taken.has(normalizeAnswer(answer)));
}

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
  pick('wrong', (exercise) => exercise.type === 'multiple_choice', hasChoices);
  pick('standard', (exercise) => isTyped(exercise) && (exercise.standardForms?.length ?? 0) > 0);
  pick('almost', (exercise) => isTyped(exercise) && almostAnswer(exercise) !== undefined);
  return intents;
}

function choiceFor(exercise: LessonExercise, intent: Intent): string {
  const solutions = new Set(solutionsOf(exercise).map(normalizeAnswer));
  const choice = (exercise.choices ?? []).find(
    (candidate) => solutions.has(normalizeAnswer(candidate)) === (intent !== 'wrong'),
  );
  if (choice === undefined) throw new Error(`No ${intent} choice in ${exercise.id}`);
  return choice;
}

function textFor(exercise: LessonExercise, intent: Intent): string {
  const text =
    intent === 'almost'
      ? almostAnswer(exercise)
      : intent === 'standard'
        ? exercise.standardForms?.[0]
        : solutionsOf(exercise)[0];
  if (text === undefined) throw new Error(`No ${intent} text for ${exercise.id}`);
  return text;
}

/** Screenshot name per exercise type; the two ways of filling a gap look different. */
function screenName(exercise: LessonExercise): string {
  if (exercise.type === 'fill_gap') return exercise.choices ? 'fill_gap-choices' : 'fill_gap-typed';
  return exercise.type;
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

  await path.goto();
  const xpBefore = await fetchXpTotal(page.request);
  await expect(shell.xpLabel).toHaveText(`${xpBefore} XP`);

  const started = page.waitForResponse(isLessonStart);
  await path.lessonNode(UNIT, 1).tap();
  const startResponse = await started;
  expect(startResponse.status()).toBe(201);
  const lesson = (await startResponse.json()) as LessonResponse;
  await expect(page).toHaveURL(new RegExp(`/lesson/${lesson.unitId}$`));

  const total = lesson.exercises.length;
  expect(new Set(lesson.exercises.map((exercise) => exercise.type)), 'every P0 type').toEqual(
    new Set(P0_EXERCISE_TYPES),
  );
  const intents = planIntents(lesson.exercises);
  const planned = [...intents.values()];
  expect(planned, 'one wrong, one almost correct answer').toEqual(
    expect.arrayContaining(['wrong', 'almost']),
  );
  const expectedVariants = new Set<FeedbackVariant>(['correct', ...planned]);
  const byId = new Map(lesson.exercises.map((exercise) => [exercise.id, exercise]));

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
        const name = retry ? 'retry' : `exercise-${screenName(exercise)}`;
        if (shownScreens.has(name)) return;
        shownScreens.add(name);
        await snap(page, name, { fullPage: false });
      };

      const attempt = page.waitForResponse(isAttempt);
      if (exercise.type === 'match_pairs') {
        await player.matchPairs(exercise.pairs ?? [], beforeCheck);
      } else {
        charsFromBar += await enterAnswer(player, exercise, intent);
        await beforeCheck();
        await player.check();
      }

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
    await expect(resultScreen.learnedWords()).toHaveCount(result.learnedItems.length);
    await snap(page, 'result', { fullPage: false });
    // A full-page capture would leave the sticky "Weiter" button in the middle of the word list.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await snap(page, 'result-scrolled', { fullPage: false });

    await resultScreen.continueButton.click();
    await shell.expectHome();
    await expect(shell.xpLabel, 'the top bar shows the new XP').toHaveText(`${result.xpTotal} XP`);
    await snap(page, 'home-after-lesson', { fullPage: false });
  });
});

/** Enters the answer of every type except match_pairs; returns the characters typed via the bar. */
async function enterAnswer(
  player: LessonPlayer,
  exercise: LessonExercise,
  intent: Intent,
): Promise<number> {
  switch (exercise.type) {
    case 'multiple_choice':
      await player.chooseOption(choiceFor(exercise, intent));
      return 0;
    case 'translate_wordbank': {
      const chips = firstBuildableChips(solutionsOf(exercise), exercise.wordBank ?? []);
      await player.tapChips('Wortbausteine', chips);
      await expect(player.answerLine().getByRole('button')).toHaveText(chips);
      return 0;
    }
    case 'word_order': {
      const tokens = exercise.tokens ?? [];
      await player.tapChips('Wortbausteine', tokens);
      await expect(player.answerLine().getByRole('button')).toHaveText(tokens);
      return 0;
    }
    case 'fill_gap':
      if (exercise.choices) {
        const choice = choiceFor(exercise, intent);
        await player.tapChips('Antwortmöglichkeiten', [choice]);
        await expect(player.exercise.getByRole('group', { name: 'Lücke' })).toHaveText(choice);
        return 0;
      }
      return typeText(player, player.gapField(), exercise, intent);
    case 'translate_free':
      return typeText(player, player.answerField(exercise.answerLang ?? 'sq'), exercise, intent);
    case 'match_pairs':
      throw new Error('Match pairs are answered by matchPairs');
  }
}

/** A learner who types "almost" right skips the special characters; the others use the bar. */
function typeText(
  player: LessonPlayer,
  field: Locator,
  exercise: LessonExercise,
  intent: Intent,
): Promise<number> {
  const useBar = exercise.answerLang === 'sq' && intent !== 'almost';
  return player.typeAnswer(field, textFor(exercise, intent), { useBar });
}
