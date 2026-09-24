/**
 * Horizontal swing of the n-th node on the learning path as a factor of the path amplitude
 * (-1 … 1). Consecutive nodes trace a gentle S-curve: centre, right, centre, left, centre …
 */
export function pathSwing(index: number): number {
  return Math.round(Math.sin((index * Math.PI) / 4) * 100) / 100;
}
