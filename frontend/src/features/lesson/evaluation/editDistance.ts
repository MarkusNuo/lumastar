/**
 * Damerau-Levenshtein distance in its optimal-string-alignment form, as in the backend: insertions,
 * deletions, substitutions and swaps of two adjacent characters each cost one edit.
 */
export function editDistance(a: string, b: string): number {
  let beforePrevious = new Array<number>(b.length + 1).fill(0);
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
      let distance = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + substitution,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distance = Math.min(distance, (beforePrevious[j - 2] ?? 0) + 1);
      }
      current[j] = distance;
    }
    [beforePrevious, previous, current] = [previous, current, beforePrevious];
  }
  return previous[b.length] ?? 0;
}
