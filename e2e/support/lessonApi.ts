import { expect, type APIRequestContext, type Response } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';
import { firstWrongCandidate, submittedAnswer, type Intent } from './lessonAnswers.ts';

/*
 * The parts of the lesson API (POST /api/lessons, …/attempts, …/complete) the e2e tests read. The
 * start response carries every exercise with its solutions, so a test knows how to answer each one.
 */

export type ExerciseType =
  | 'multiple_choice'
  | 'translate_wordbank'
  | 'translate_free'
  | 'fill_gap'
  | 'match_pairs'
  | 'word_order';

export const P0_EXERCISE_TYPES: readonly ExerciseType[] = [
  'multiple_choice',
  'translate_wordbank',
  'translate_free',
  'fill_gap',
  'match_pairs',
  'word_order',
];

export type Lang = 'sq' | 'de';

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  prompt: { lang: Lang; text: string };
  answerLang?: Lang;
  choices?: string[];
  wordBank?: string[];
  tokens?: string[];
  text?: string;
  pairs?: { left: string; right: string }[];
  solutions?: string[];
  standardForms?: string[];
  explanation: string;
}

export interface LessonResponse {
  sessionId: string;
  unitId: string;
  exercises: LessonExercise[];
}

export type Outcome = 'correct' | 'almost_correct' | 'correct_standard_form' | 'wrong';

/** Exactly one field, depending on the exercise type. */
export interface SubmittedAnswer {
  text?: string;
  choice?: string;
  tokens?: string[];
  mistakes?: number;
}

export interface AttemptRequest {
  exerciseId: string;
  answer: SubmittedAnswer;
  responseTimeMs: number;
  retry?: boolean;
}

export interface AttemptResponse {
  exerciseId: string;
  outcome: Outcome;
  countsAsCorrect: boolean;
  solution?: string;
  hint?: string;
}

export interface LessonResultResponse {
  xpEarned: number;
  xpBreakdown: { base: number; perfectBonus: number; speedBonus: number };
  accuracy: number;
  durationMs: number;
  correctCount: number;
  exerciseCount: number;
  learnedItems: { id: string; gheg: string; de: string }[];
  xpTotal: number;
}

const pathOf = (response: Response) => new URL(response.url()).pathname;
const isPost = (response: Response) => response.request().method() === 'POST';

export const isLessonStart = (response: Response) =>
  isPost(response) && pathOf(response) === '/api/lessons';

export const isAttempt = (response: Response) =>
  isPost(response) && /^\/api\/lessons\/[^/]+\/attempts$/.test(pathOf(response));

export const isCompletion = (response: Response) =>
  isPost(response) && /^\/api\/lessons\/[^/]+\/complete$/.test(pathOf(response));

export interface Me {
  displayName: string;
  currentLevel?: string;
  xpTotal: number;
}

/** The learner from GET /api/me, the source of the top bar and the profile header. */
export async function fetchMe(request: APIRequestContext): Promise<Me> {
  const response = await request.get('/api/me');
  expect(response.status()).toBe(200);
  return (await response.json()) as Me;
}

/** XP of the learner from GET /api/me. */
export async function fetchXpTotal(request: APIRequestContext): Promise<number> {
  return (await fetchMe(request)).xpTotal;
}

export interface PlayedLesson {
  lesson: LessonResponse;
  result: LessonResultResponse;
  wrongExercise: LessonExercise;
}

/** A plausible answer time, far from the speed-bonus and "slow" thresholds. */
const RESPONSE_TIME_MS = 4000;

/**
 * Plays a whole lesson through the API, as the player does: the first exercise with choices is
 * answered wrong and repeated at the end, every other one right. Faster than the UI, for tests that
 * only need recorded learning data (sessions, attempts, an error, mastery).
 */
export async function playLessonViaApi(
  request: APIRequestContext,
  unitId: string,
): Promise<PlayedLesson> {
  const headers = await csrfHeaders(request);
  const started = await request.post('/api/lessons', { headers, data: { unitId } });
  expect(started.status(), await started.text()).toBe(201);
  const lesson = (await started.json()) as LessonResponse;
  const wrongExercise = firstWrongCandidate(lesson.exercises);

  const answer = async (exercise: LessonExercise, intent: Intent, retry: boolean) => {
    const body: AttemptRequest = {
      exerciseId: exercise.id,
      answer: submittedAnswer(exercise, intent),
      responseTimeMs: RESPONSE_TIME_MS,
      retry,
    };
    const response = await request.post(`/api/lessons/${lesson.sessionId}/attempts`, {
      headers,
      data: body,
    });
    expect(response.ok(), await response.text()).toBe(true);
    const verdict = (await response.json()) as AttemptResponse;
    expect(verdict.countsAsCorrect, `${exercise.id} answered ${intent}`).toBe(intent !== 'wrong');
  };

  for (const exercise of lesson.exercises) {
    await answer(exercise, exercise === wrongExercise ? 'wrong' : 'correct', false);
  }
  await answer(wrongExercise, 'correct', true);

  const completed = await request.post(`/api/lessons/${lesson.sessionId}/complete`, { headers });
  expect(completed.status(), await completed.text()).toBe(200);
  return { lesson, result: (await completed.json()) as LessonResultResponse, wrongExercise };
}
