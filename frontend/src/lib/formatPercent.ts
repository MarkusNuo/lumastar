/**
 * 92 → "92 %": Swiss German puts a space before the percent sign; a no-break one, so the sign never
 * wraps onto a line of its own.
 */
export function formatPercent(percent: number): string {
  return `${percent}\u00a0%`;
}

/** 0.917 → "92 %" */
export function formatShare(share: number): string {
  return formatPercent(Math.round(share * 100));
}
