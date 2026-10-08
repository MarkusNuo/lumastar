import { describe, expect, it } from 'vitest';
import { goalChoices } from './goalLadder';

describe('goalChoices', () => {
  it('offers the next rungs above the first goal', () => {
    expect(goalChoices(0, 10)).toEqual([20, 30, 50]);
    expect(goalChoices(7, 10)).toEqual([20, 30, 50]);
  });

  it('only offers goals above the streak, lower ones than the current goal included', () => {
    expect(goalChoices(25, 50)).toEqual([30, 75, 100]);
  });

  it('climbs by 100 days after a year', () => {
    expect(goalChoices(360, 365)).toEqual([465, 565, 665]);
    expect(goalChoices(470, 565)).toEqual([665, 765, 865]);
  });
});
