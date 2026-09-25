export type Random = () => number;

const MAX_SCRAMBLE_TRIES = 12;

/** Repeatable pseudo-random numbers in [0, 1) from a linear congruential generator. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

/** A 32-bit seed from a text (FNV-1a), e.g. from session and exercise id. */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

/** A fresh generator for one shuffle: seeded when a fixed order is wanted, Math.random otherwise. */
export function randomFor(seed: number | undefined): Random {
  return seed === undefined ? Math.random : seededRandom(seed);
}

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
