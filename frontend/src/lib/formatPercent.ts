/** 92 → "92 %": Swiss German puts a space before the percent sign. */
export function formatPercent(percent: number): string {
  return `${percent} %`;
}

/** 0.917 → "92 %" */
export function formatShare(share: number): string {
  return formatPercent(Math.round(share * 100));
}
