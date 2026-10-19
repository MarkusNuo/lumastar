import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { Level } from '../../api/types';
import { toLesson } from '../lesson/lessonApi';
import type { Lesson } from '../lesson/model';

export const BADGES_QUERY_KEY = ['badges'] as const;

/** The level badges earned so far, in band order. */
export const badgesQuery = queryOptions({
  queryKey: BADGES_QUERY_KEY,
  queryFn: () => unwrap(api.GET('/api/badges')),
});

/** The test at the end of a stage, played like any lesson. */
export async function startCheckpoint(level: Level): Promise<Lesson> {
  return toLesson(await unwrap(api.POST('/api/checkpoints', { body: { level } })));
}
