import { expect, type APIRequestContext, type Response } from '@playwright/test';

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

export interface AttemptRequest {
  exerciseId: string;
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

/** XP of the learner from GET /api/me, the source of the top bar. */
export async function fetchXpTotal(request: APIRequestContext): Promise<number> {
  const response = await request.get('/api/me');
  expect(response.status()).toBe(200);
  return ((await response.json()) as { xpTotal: number }).xpTotal;
}
