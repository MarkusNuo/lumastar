import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { SettingsRequest } from '../../api/types';
import { meQuery } from '../auth/authHooks';
import { PLAN_QUERY_KEY } from '../plan/planQueries';
import { REVIEW_QUERY_KEY } from '../review/reviewApi';
import { PROGRESS_QUERY_KEY } from '../stats/progressApi';
import { STATS_QUERY_KEY } from '../stats/statsApi';
import { STREAK_QUERY_KEY } from '../streak/streakApi';

/** Target retention of the FSRS reviews. */
export const RETENTION = { min: 0.7, max: 0.99, default: 0.9, step: 0.01 } as const;

export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: () => unwrap(api.GET('/api/settings')),
});

/**
 * Stores all settings at once. A new daily goal re-estimates the plan and may meet today's goal,
 * which extends the streak; the save only ends once the shown plan and progress are fresh.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: SettingsRequest) => unwrap(api.PUT('/api/settings', { body: settings })),
    onSuccess: async (saved) => {
      queryClient.setQueryData(settingsQuery.queryKey, saved);
      const affected = [
        meQuery.queryKey,
        PLAN_QUERY_KEY,
        PROGRESS_QUERY_KEY,
        STATS_QUERY_KEY,
        REVIEW_QUERY_KEY,
        STREAK_QUERY_KEY,
      ];
      await Promise.all(affected.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}
