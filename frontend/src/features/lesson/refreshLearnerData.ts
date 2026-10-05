import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { meQuery } from '../auth/authHooks';
import { BADGES_QUERY_KEY } from '../checkpoint/checkpointApi';
import { PLAN_QUERY_KEY } from '../plan/planQueries';
import { REVIEW_QUERY_KEY } from '../review/reviewApi';
import type { LessonResult } from './model';

/**
 * A saved lesson changes XP and plan progress, reviews FSRS cards and, after a passed checkpoint,
 * the level (top bar, path, plan) and the badges. Inactive queries refetch when shown next.
 */
export function refreshLearnerData(queryClient: QueryClient, result: LessonResult): void {
  const keys: QueryKey[] = [meQuery.queryKey, PLAN_QUERY_KEY, REVIEW_QUERY_KEY];
  if (result.checkpoint?.passed) keys.push(BADGES_QUERY_KEY);
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}
