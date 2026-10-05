import { expect, type APIRequestContext, type APIResponse, type Response } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';
import { firstWrongCandidate, submittedAnswer, type Intent } from './lessonAnswers.ts';

/*
 * The parts of the lesson API (POST /api/lessons, …/attempts, …/complete) the e2e tests read. The
 * start response carries every exercise with its solutions, so a test knows how to answer each one.
 * Review lessons (POST /api/review/lessons) and checkpoints (POST /api/checkpoints) are played the
 * same way.
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

/** lesson of a unit, focus lesson (PRD F3, F7), review (F8), checkpoint (PRD 5), practice (F10). */
export type LessonKind = 'lesson' | 'focus' | 'review' | 'checkpoint' | 'practice';

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  level: string;
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
  /** Known mistakes, matched against the normalised answer before any tolerance. */
  errorHints?: { pattern: string; category: string; hint: string }[];
  skillTags: string[];
  itemIds: string[];
}

export interface LessonResponse {
  sessionId: string;
  unitId: string;
  kind: LessonKind;
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

/** A focus lesson on the skill tag a lesson got wrong at least three times (PRD F7). */
export interface FocusSuggestion {
  skillTag: string;
  label: string;
  unitId: string;
}

/** The result of a checkpoint (PRD 5, F9). */
export interface CheckpointResult {
  level: string;
  passed: boolean;
  requiredAccuracy: number;
  /** The level after a pass; absent after a failure. */
  newLevel?: string;
  /** Level badges this checkpoint awarded, e.g. ["A1"] for passing A1.3. */
  badges: string[];
}

/** The daily goal on the day of the lesson, up to and including it (PRD F9). */
export interface LessonDailyGoal {
  minutesToday: number;
  goalMinutes: number;
  goalMet: boolean;
  /** This lesson met the goal of its day and extended the streak: the streak celebration follows. */
  justMet: boolean;
}

/** The streak after the lesson (PRD F9). */
export interface LessonStreak {
  current: number;
  extendedToday: boolean;
  freezeUsed: boolean;
}

export interface LessonResultResponse {
  kind: LessonKind;
  xpEarned: number;
  xpBreakdown: { base: number; perfectBonus: number; speedBonus: number };
  accuracy: number;
  durationMs: number;
  correctCount: number;
  exerciseCount: number;
  /** The items practised in the lesson; `known` once the FSRS card of the item is in review state. */
  learnedItems: { id: string; gheg: string; de: string; known: boolean }[];
  /** Learned words of the learner (PRD F10): words and phrases whose card is in review state. */
  learnedWordsTotal: number;
  xpTotal: number;
  focusSuggestion?: FocusSuggestion;
  checkpoint?: CheckpointResult;
  dailyGoal: LessonDailyGoal;
  streak: LessonStreak;
}

const pathOf = (response: Response) => new URL(response.url()).pathname;
const isPost = (response: Response) => response.request().method() === 'POST';

export const isLessonStart = (response: Response) =>
  isPost(response) && pathOf(response) === '/api/lessons';

export const isCheckpointStart = (response: Response) =>
  isPost(response) && pathOf(response) === '/api/checkpoints';

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

/** How the test answers an exercise of the lesson at its first appearance; a wrong one is retried right. */
export type IntentOf = (exercise: LessonExercise, lesson: LessonResponse) => Intent;

export const allCorrect: IntentOf = () => 'correct';

/**
 * A lesson started through the API: POST /api/lessons (a unit, or a practice lesson on a skill tag),
 * /api/review/lessons or /api/checkpoints.
 */
export type LessonStart =
  | { unitId: string }
  | { practice: string }
  | { review: true }
  | { checkpoint: string };

function startRequest(start: LessonStart): { url: string; data?: object } {
  if ('review' in start) return { url: '/api/review/lessons' };
  if ('checkpoint' in start) return { url: '/api/checkpoints', data: { level: start.checkpoint } };
  if ('practice' in start) return { url: '/api/lessons', data: { kind: 'practice', skillTag: start.practice } };
  return { url: '/api/lessons', data: { unitId: start.unitId } };
}

export interface PlayedLesson {
  lesson: LessonResponse;
  result: LessonResultResponse;
  wrongExercise: LessonExercise;
}

/** A plausible answer time, far from the speed-bonus and "slow" thresholds. */
const RESPONSE_TIME_MS = 4000;

/**
 * Starts a lesson through the API; the response is checked by the caller, e.g. a review lesson that
 * may find nothing due (409 no_reviews_due).
 */
export async function startViaApi(request: APIRequestContext, start: LessonStart): Promise<APIResponse> {
  const { url, data } = startRequest(start);
  return request.post(url, { headers: await csrfHeaders(request), ...(data ? { data } : {}) });
}

/**
 * Starts and plays a whole lesson through the API, as the player does: every exercise once with its
 * intent, the wrong ones again at the end (right this time), then completed. Faster than the UI, for
 * tests that only need recorded learning data or progress along the plan.
 */
export async function playViaApi(
  request: APIRequestContext,
  start: LessonStart,
  intentOf: IntentOf = allCorrect,
): Promise<{ lesson: LessonResponse; result: LessonResultResponse }> {
  const started = await startViaApi(request, start);
  expect(started.status(), `${started.url()}: ${await started.text()}`).toBe(201);
  const lesson = (await started.json()) as LessonResponse;
  return { lesson, result: await finishViaApi(request, lesson, intentOf) };
}

/** Answers every exercise of a started lesson with its intent, retries the wrong ones and completes it. */
export async function finishViaApi(
  request: APIRequestContext,
  lesson: LessonResponse,
  intentOf: IntentOf = allCorrect,
): Promise<LessonResultResponse> {
  const headers = await csrfHeaders(request);
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

  const wrong: LessonExercise[] = [];
  for (const exercise of lesson.exercises) {
    const intent = intentOf(exercise, lesson);
    await answer(exercise, intent, false);
    if (intent === 'wrong') wrong.push(exercise);
  }
  for (const exercise of wrong) await answer(exercise, 'correct', true);

  const completed = await request.post(`/api/lessons/${lesson.sessionId}/complete`, { headers });
  expect(completed.status(), await completed.text()).toBe(200);
  return (await completed.json()) as LessonResultResponse;
}

/**
 * Plays a lesson of the unit through the API with one mistake: the first exercise with choices is
 * answered wrong and repeated at the end, every other one right.
 */
export async function playLessonViaApi(
  request: APIRequestContext,
  unitId: string,
): Promise<PlayedLesson> {
  const played = await playViaApi(request, { unitId }, (exercise, lesson) =>
    exercise.id === firstWrongCandidate(lesson.exercises).id ? 'wrong' : 'correct',
  );
  return { ...played, wrongExercise: firstWrongCandidate(played.lesson.exercises) };
}
