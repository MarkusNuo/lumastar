import { formatClock } from '../../../lib/formatClock';

const percentFormat = new Intl.NumberFormat('de-CH', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** 0.917 → "92%" */
export function formatPercent(share: number): string {
  return percentFormat.format(share);
}

/** 134_500 ms → "2:15" */
export function formatDuration(durationMs: number): string {
  return formatClock(Math.round(durationMs / 1000));
}
