import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';

/** Everything that depends on the learning plan; a placement or a finished lesson refreshes it. */
export const PLAN_QUERY_KEY = ['plan'] as const;

/** The plan up to C2 with the live progress; feeds the learning path and the plan timeline. */
export const pathQuery = queryOptions({
  queryKey: [...PLAN_QUERY_KEY, 'path'],
  queryFn: () => unwrap(api.GET('/api/path')),
});

export const planChangesQuery = queryOptions({
  queryKey: [...PLAN_QUERY_KEY, 'changes'],
  queryFn: () => unwrap(api.GET('/api/plan/changes')),
});
