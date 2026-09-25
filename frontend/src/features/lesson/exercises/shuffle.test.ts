import { describe, expect, it } from 'vitest';
import { randomFor, scrambledIndices, seededRandom, shuffled } from './shuffle';

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);

    const draws = Array.from({ length: 5 }, () => [first(), second()]);

    for (const [a, b] of draws) expect(a).toBe(b);
    expect(new Set(draws.map(([a]) => a)).size).toBe(5);
  });

  it('stays within [0, 1)', () => {
    const random = seededRandom(0);
    for (let draw = 0; draw < 100; draw++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomFor', () => {
  it('uses Math.random without a seed', () => {
    expect(randomFor(undefined)).toBe(Math.random);
  });

  it('starts a fresh seeded sequence on every call', () => {
    expect(randomFor(7)()).toBe(randomFor(7)());
  });
});

describe('shuffled', () => {
  it('keeps every item exactly once and leaves the input alone', () => {
    const items = ['Mirë', 'se', 'vjen', 'në', 'Prishtinë'];

    const result = shuffled(items, seededRandom(7));

    expect([...result].sort()).toEqual([...items].sort());
    expect(items).toEqual(['Mirë', 'se', 'vjen', 'në', 'Prishtinë']);
  });

  it('gives the same order for the same seed', () => {
    const items = [0, 1, 2, 3, 4, 5, 6];

    expect(shuffled(items, seededRandom(3))).toEqual(shuffled(items, seededRandom(3)));
  });
});

describe('scrambledIndices', () => {
  it('never returns an order that is already solved', () => {
    const random = seededRandom(3);
    for (let run = 0; run < 50; run++) {
      const order = scrambledIndices(3, (candidate) => candidate.join() === '0,1,2', random);
      expect(order.join()).not.toBe('0,1,2');
      expect([...order].sort()).toEqual([0, 1, 2]);
    }
  });

  it('gives up when every order counts as solved', () => {
    expect(scrambledIndices(2, () => true, seededRandom(1))).toHaveLength(2);
  });

  it('returns the single index of a one-word sentence', () => {
    expect(scrambledIndices(1, () => true)).toEqual([0]);
  });
});
