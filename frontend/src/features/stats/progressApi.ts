import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';

/** Today's practice minutes, XP and streak; every finished lesson and a new goal change them. */
export const PROGRESS_QUERY_KEY = ['progress'] as const;

/** The daily goal ring and the streak flame of the top bar (PRD F9, 12.3). */
export const todayProgressQuery = queryOptions({
  queryKey: [...PROGRESS_QUERY_KEY, 'today'],
  queryFn: () => unwrap(api.GET('/api/progress/today')),
  // A new day resets the ring; coming back to the app after midnight must show that.
  refetchOnWindowFocus: true,
});
