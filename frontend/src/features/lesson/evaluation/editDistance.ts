/** Whether a character of the first text counts as the character of the second. */
export type CharMatch = (a: string, b: string) => boolean;

const identical: CharMatch = (a, b) => a === b;

/**
 * Damerau-Levenshtein distance in its optimal-string-alignment form, as in the backend: insertions,
 * deletions, substitutions and swaps of two adjacent characters each cost one edit. Characters that
 * `same` accepts (by default only identical ones) cost nothing.
 */
export function editDistance(a: string, b: string, same: CharMatch = identical): number {
  let beforePrevious = new Array<number>(b.length + 1).fill(0);
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = same(a.charAt(i - 1), b.charAt(j - 1)) ? 0 : 1;
      let distance = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + substitution,
      );
      const swapped =
        i > 1 &&
        j > 1 &&
        same(a.charAt(i - 1), b.charAt(j - 2)) &&
        same(a.charAt(i - 2), b.charAt(j - 1));
      if (swapped) distance = Math.min(distance, (beforePrevious[j - 2] ?? 0) + 1);
      current[j] = distance;
    }
    [beforePrevious, previous, current] = [previous, current, beforePrevious];
  }
  return previous[b.length] ?? 0;
}
