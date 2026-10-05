import { formatClock } from '../../../lib/formatClock';

/** 134_500 ms → "2:15" */
export function formatDuration(durationMs: number): string {
  return formatClock(Math.round(durationMs / 1000));
}
