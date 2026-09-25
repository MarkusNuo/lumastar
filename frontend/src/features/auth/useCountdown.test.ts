import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCountdown, useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle until started', () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current[0]).toBe(0);
  });

  it('counts the seconds down to zero and stops', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);

    act(() => void vi.advanceTimersByTime(1_000));
    expect(result.current[0]).toBe(2);

    act(() => void vi.advanceTimersByTime(2_000));
    expect(result.current[0]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [75, '1:15'],
    [900, '15:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });
});
