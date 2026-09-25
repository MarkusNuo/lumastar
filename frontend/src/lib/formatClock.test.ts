import { describe, expect, it } from 'vitest';
import { formatClock } from './formatClock';

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [75, '1:15'],
    [900, '15:00'],
    [-3, '0:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});
