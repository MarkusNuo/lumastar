import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { toLesson } from '../lesson/lessonApi';
import type { Lesson } from '../lesson/model';

/** Everything that depends on the FSRS cards; every answered exercise can change it. */
export const REVIEW_QUERY_KEY = ['review'] as const;

/** FSRS learning steps make new cards due within minutes, so the count refreshes now and then. */
const SUMMARY_REFRESH_MS = 60_000;

/** Due now, due tomorrow and all cards (PRD F8). */
export const reviewSummaryQuery = queryOptions({
  queryKey: [...REVIEW_QUERY_KEY, 'summary'],
  queryFn: () => unwrap(api.GET('/api/review/summary')),
  refetchInterval: SUMMARY_REFRESH_MS,
});

/** A lesson of the most overdue items; 409 `no_reviews_due` when no exercise practises one. */
export async function startReviewLesson(): Promise<Lesson> {
  return toLesson(await unwrap(api.POST('/api/review/lessons')));
}
