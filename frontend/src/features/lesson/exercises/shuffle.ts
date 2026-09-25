type Random = () => number;

const MAX_SCRAMBLE_TRIES = 12;

/** Fisher-Yates shuffle into a new array. */
export function shuffled<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * Indices 0…count-1 in a random order for which `isSolved` is false, so a word-order exercise
 * never starts solved. Gives up after a few tries (e.g. when every order is accepted).
 */
export function scrambledIndices(
  count: number,
  isSolved: (order: number[]) => boolean,
  random: Random = Math.random,
): number[] {
  const identity = Array.from({ length: count }, (_, index) => index);
  let order = identity;
  for (let tries = 0; tries < MAX_SCRAMBLE_TRIES; tries++) {
    order = shuffled(identity, random);
    if (!isSolved(order)) return order;
  }
  return order;
}
