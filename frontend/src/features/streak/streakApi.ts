import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { GoalChoice } from './goal/GoalChooser';

/** The streak screen; every finished lesson and a new streak goal change it. */
export const STREAK_QUERY_KEY = ['streak'] as const;

/** GET /api/streak for one calendar month, or the current one; the shown month stays while the next loads. */
export function streakQuery(month: string | undefined) {
  return queryOptions({
    queryKey: [...STREAK_QUERY_KEY, month ?? 'current'],
    queryFn: () => unwrap(api.GET('/api/streak', { params: { query: { month } } })),
    placeholderData: keepPreviousData,
  });
}

/** Saves a streak goal at once (PUT /api/streak/goal) and refreshes the streak screen. */
export function useGoalChoice(): GoalChoice {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (target: number) => unwrap(api.PUT('/api/streak/goal', { body: { target } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STREAK_QUERY_KEY }),
  });
  return {
    choose: (target) => save.mutate(target),
    reset: save.reset,
    chosen: save.variables,
    status: choiceStatus(save),
  };
}

function choiceStatus(save: {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}): GoalChoice['status'] {
  if (save.isPending) return 'saving';
  if (save.isSuccess) return 'saved';
  return save.isError ? 'failed' : 'idle';
}
