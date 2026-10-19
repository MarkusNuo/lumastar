import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { toLesson } from '../lesson/lessonApi';
import type { Lesson } from '../lesson/model';

/** Level progress, mastery, top errors, heatmap and forecast; every finished lesson changes them. */
export const STATS_QUERY_KEY = ['stats'] as const;

/** The statistics tab. */
export const statsQuery = queryOptions({
  queryKey: STATS_QUERY_KEY,
  queryFn: () => unwrap(api.GET('/api/stats')),
});

/**
 * "Gezielt üben": a lesson of the exercises with one skill tag; 409
 * `no_practice_exercises` when none at or below the learner's level carries it.
 */
export async function startPracticeLesson(skillTag: string): Promise<Lesson> {
  return toLesson(await unwrap(api.POST('/api/lessons', { body: { kind: 'practice', skillTag } })));
}
