import type { Level } from '../../api/types';

/** The full-screen checkpoint of a stage, e.g. /checkpoint/A1.2. */
export const CHECKPOINT_ROUTE = '/checkpoint/:level';

export function checkpointRoute(level: Level): string {
  return `/checkpoint/${encodeURIComponent(level)}`;
}
