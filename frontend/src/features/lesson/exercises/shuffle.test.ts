import { describe, expect, it } from 'vitest';
import { scrambledIndices, shuffled } from './shuffle';

/** Deterministic pseudo-random numbers for repeatable shuffles. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('shuffled', () => {
  it('keeps every item exactly once and leaves the input alone', () => {
    const items = ['Mirë', 'se', 'vjen', 'në', 'Prishtinë'];

    const result = shuffled(items, seeded(7));

    expect([...result].sort()).toEqual([...items].sort());
    expect(items).toEqual(['Mirë', 'se', 'vjen', 'në', 'Prishtinë']);
  });
});

describe('scrambledIndices', () => {
  it('never returns an order that is already solved', () => {
    const random = seeded(3);
    for (let run = 0; run < 50; run++) {
      const order = scrambledIndices(3, (candidate) => candidate.join() === '0,1,2', random);
      expect(order.join()).not.toBe('0,1,2');
      expect([...order].sort()).toEqual([0, 1, 2]);
    }
  });

  it('gives up when every order counts as solved', () => {
    expect(scrambledIndices(2, () => true, seeded(1))).toHaveLength(2);
  });

  it('returns the single index of a one-word sentence', () => {
    expect(scrambledIndices(1, () => true)).toEqual([0]);
  });
});
