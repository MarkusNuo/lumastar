import { expect, type Page } from '@playwright/test';
import { AppShell } from '../pages/AppShell.ts';
import { LearningPathPage } from '../pages/LearningPathPage.ts';
import { LessonPlayer, VARIANT_OF } from '../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../pages/LessonResultScreen.ts';
import { firstWrongCandidate, type Intent } from './lessonAnswers.ts';
import {
  isAttempt,
  isCompletion,
  isLessonStart,
  type AttemptResponse,
  type LessonResponse,
  type LessonResultResponse,
  type PlayedLesson,
} from './lessonApi.ts';

/**
 * Plays lesson `lesson` of the unit through the UI, from the learning path back to it: the first
 * exercise with choices is answered wrong and repeated at the end, every other one right. The
 * detailed checks of the player live in tests/lesson; this is the way to get there and back.
 */
export async function playLessonInUi(page: Page, unitTitle: string, lesson = 1): Promise<PlayedLesson> {
  const path = new LearningPathPage(page);
  const player = new LessonPlayer(page);
  const resultScreen = new LessonResultScreen(page);

  await path.goto();
  // Sent as the result screen appears; no timeout of its own, the test timeout bounds the lesson.
  const completion = page.waitForResponse(isCompletion, { timeout: 0 });
  const started = page.waitForResponse(isLessonStart);
  await path.lessonNode(unitTitle, lesson).tap();
  const startResponse = await started;
  expect(startResponse.status()).toBe(201);
  const response = (await startResponse.json()) as LessonResponse;
  const byId = new Map(response.exercises.map((exercise) => [exercise.id, exercise]));
  const wrongExercise = firstWrongCandidate(response.exercises);
  const answered = new Set<string>();

  for (let step = 0; ; step += 1) {
    expect(step, 'the lesson ends after its exercises and one retry').toBeLessThanOrEqual(
      response.exercises.length + 1,
    );
    await expect(player.exercise.or(resultScreen.heading)).toBeVisible();
    if (await resultScreen.heading.isVisible()) break;

    const { id } = await player.current();
    const exercise = byId.get(id);
    if (!exercise) throw new Error(`Exercise ${id} is not part of the lesson response`);
    const intent: Intent = exercise === wrongExercise && !answered.has(id) ? 'wrong' : 'correct';

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
  const result = (await completed.json()) as LessonResultResponse;
  await resultScreen.continueButton.click();
  await new AppShell(page).expectHome();
  return { lesson: response, result, wrongExercise };
}
