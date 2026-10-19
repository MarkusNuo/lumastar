import { expect, type APIRequestContext, type Response } from '@playwright/test';

/* The review endpoints the tests read: the due counts and the review lesson. */

/** GET /api/review/summary: the learner's FSRS cards. */
export interface ReviewSummary {
  /** Due now, overdue ones included. */
  dueNow: number;
  /** Coming due during tomorrow, in the learner's time zone. */
  dueTomorrow: number;
  /** All cards, i.e. items practised so far. */
  totalCards: number;
}

const pathOf = (response: Response) => new URL(response.url()).pathname;

export const isReviewSummary = (response: Response) =>
  response.request().method() === 'GET' && pathOf(response) === '/api/review/summary';

export const isReviewStart = (response: Response) =>
  response.request().method() === 'POST' && pathOf(response) === '/api/review/lessons';

export async function fetchReviewSummary(request: APIRequestContext): Promise<ReviewSummary> {
  const response = await request.get('/api/review/summary');
  expect(response.status()).toBe(200);
  return (await response.json()) as ReviewSummary;
}

/**
 * "1 Karte fällig", "12 Karten fällig": the label of the due count and of the navigation badge. The
 * FSRS cards hold words, phrases and grammar points alike.
 */
export const dueLabel = (count: number) => `${count} ${cards(count)} fällig`;

export const cards = (count: number) => (count === 1 ? 'Karte' : 'Karten');
