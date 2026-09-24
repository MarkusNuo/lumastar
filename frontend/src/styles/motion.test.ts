import { describe, expect, it } from 'vitest';
import { durations, springs } from './motion';
import tokens from './tokens.css?raw';

describe('motion tokens', () => {
  it.each(Object.entries(durations))(
    'keeps the %s duration in sync with tokens.css',
    (name, seconds) => {
      expect(tokens).toContain(`--duration-${name}: ${Math.round(seconds * 1000)}ms;`);
    },
  );

  it.each(Object.entries(springs))('keeps the %s spring within 150-300 ms', (_name, spring) => {
    expect(spring.visualDuration).toBeGreaterThanOrEqual(0.15);
    expect(spring.visualDuration).toBeLessThanOrEqual(0.3);
  });
});
