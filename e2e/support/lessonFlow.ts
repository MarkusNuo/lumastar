import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { AppShell } from '../pages/AppShell.ts';
import { LearningPathPage } from '../pages/LearningPathPage.ts';
import { LessonPlayer, VARIANT_OF } from '../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../pages/LessonResultScreen.ts';
import { firstWrongCandidate, type Intent } from './lessonAnswers.ts';
import {
  allCorrect,
  isAttempt,
  isCompletion,
  isLessonStart,
  type AttemptResponse,
  type IntentOf,
  type LessonResponse,
  type LessonResultResponse,
  type PlayedLesson,
} from './lessonApi.ts';
import { finishOpenFocusUnits } from './progression.ts';

/*
 * Lessons of any kind through the UI. The detailed checks of the player live in tests/lesson; these
 * are the ways to get through a lesson: open it, answer each exercise with its intent and the wrong
 * ones again when the player repeats them, until the end screen shows.
 */

export interface OpenedLesson {
  /** The start response: every exercise with its solutions. */
  lesson: LessonResponse;
  /** The completion the player sends as the end screen appears. */
  completion: Promise<Response>;
}

/** Runs `open` (e.g. a tap on a path node) and waits for the lesson it starts. */
export async function openLesson(
  page: Page,
  open: () => Promise<void>,
  isStart: (response: Response) => boolean = isLessonStart,
): Promise<OpenedLesson> {
  // No timeout of its own: the test timeout bounds the lesson.
  const completion = page.waitForResponse(isCompletion, { timeout: 0 });
  const started = page.waitForResponse(isStart);
  await open();
  const response = await started;
  expect(response.status(), 'the lesson starts').toBe(201);
  return { lesson: (await response.json()) as LessonResponse, completion };
}

export interface UiPlayOptions {
  intentOf?: IntentOf;
  /** Shows once the last exercise is done, e.g. the heading of the result screen. */
  end: Locator;
}

/** Answers the opened lesson through the UI until `end` shows; returns the saved result. */
export async function playOpenedLesson(
  page: Page,
  { lesson, completion }: OpenedLesson,
  { intentOf = allCorrect, end }: UiPlayOptions,
): Promise<LessonResultResponse> {
  const player = new LessonPlayer(page);
  const byId = new Map(lesson.exercises.map((exercise) => [exercise.id, exercise]));
  const wrong = lesson.exercises.filter((exercise) => intentOf(exercise, lesson) === 'wrong');
  const answered = new Set<string>();

  for (let step = 0; ; step += 1) {
    expect(step, 'the lesson ends after its exercises and the retries').toBeLessThanOrEqual(
      lesson.exercises.length + wrong.length,
    );
    await expect(player.exercise.or(end)).toBeVisible();
    if (await end.isVisible()) break;

    const { id } = await player.current();
    const exercise = byId.get(id);
    if (!exercise) throw new Error(`Exercise ${id} is not part of the lesson response`);
    const intent: Intent = answered.has(id) ? 'correct' : intentOf(exercise, lesson);

    const attempt = page.waitForResponse(isAttempt);
    if (exercise.type === 'match_pairs') {
      await player.matchPairs(exercise.pairs ?? [], async () => {});
    } else {
      await player.enterAnswer(exercise, intent);
      await player.check();
    }
    const verdict = (await (await attempt).json()) as AttemptResponse;
    expect(verdict.countsAsCorrect, `${id} answered ${intent}`).toBe(intent !== 'wrong');
    answered.add(id);
    await player.continueFrom(player.feedbackSheet(VARIANT_OF[verdict.outcome]));
  }

  const completed = await completion;
  expect(completed.status()).toBe(200);
  return (await completed.json()) as LessonResultResponse;
}

/**
 * Plays the next lesson of a curriculum unit through the UI, from the path back to it: the first
 * exercise with choices is answered wrong and repeated at the end, every other one right. Focus
 * units the plan holds open are played through the API first.
 */
export async function playLessonInUi(page: Page): Promise<PlayedLesson> {
  const path = new LearningPathPage(page);
  const resultScreen = new LessonResultScreen(page);

  await finishOpenFocusUnits(page.request);
  await path.goto();
  const opened = await openLesson(page, () => path.startCurrentLesson());
  const wrongExercise = firstWrongCandidate(opened.lesson.exercises);
  const result = await playOpenedLesson(page, opened, {
    intentOf: (exercise) => (exercise === wrongExercise ? 'wrong' : 'correct'),
    end: resultScreen.heading,
  });
  await resultScreen.continueButton.click();
  await new AppShell(page).expectHome();
  return { lesson: opened.lesson, result, wrongExercise };
}
