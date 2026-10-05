import type { ReviewSummary } from '../../api/types';

/** due: something to review now · allDone: practised, nothing due · empty: nothing practised yet. */
export type ReviewState = 'due' | 'allDone' | 'empty';

export function reviewState({ dueNow, totalCards }: ReviewSummary): ReviewState {
  if (dueNow > 0) return 'due';
  return totalCards > 0 ? 'allDone' : 'empty';
}
