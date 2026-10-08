import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCelebrationTimeline, useStepCount } from './useCelebrationTimeline';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCelebrationTimeline', () => {
  it('moves from the intro through the show to the settled screen', () => {
    const { result } = renderHook(() => useCelebrationTimeline(600, 2000));

    expect(result.current).toMatchObject({ phase: 'intro', skipped: false });
    act(() => void vi.advanceTimersByTime(600));
    expect(result.current.phase).toBe('show');
    act(() => void vi.advanceTimersByTime(1400));
    expect(result.current.phase).toBe('settled');
  });

  it('settles at once when skipped', () => {
    const { result } = renderHook(() => useCelebrationTimeline(600, 2000));

    act(() => result.current.skip());

    expect(result.current).toMatchObject({ phase: 'settled', skipped: true });
    act(() => void vi.advanceTimersByTime(600));
    expect(result.current.phase).toBe('settled');
  });
});

describe('useStepCount', () => {
  it('waits, then counts up one visible step at a time', () => {
    const { result, rerender } = renderHook(({ running }) => useStepCount(8, 10, running, false), {
      initialProps: { running: false },
    });

    expect(result.current).toBe(8);
    rerender({ running: true });
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe(9);
    act(() => void vi.advanceTimersByTime(130));
    expect(result.current).toBe(10);
  });

  it('takes bigger steps over a long distance', () => {
    const { result } = renderHook(() => useStepCount(0, 40, true, false));
    const seen = new Set<number>();

    for (let tick = 0; tick < 12; tick += 1) {
      act(() => void vi.advanceTimersByTime(300));
      seen.add(result.current);
    }

    expect(result.current).toBe(40);
    expect(seen.size).toBeLessThanOrEqual(8);
  });

  it('shows the final number when skipped', () => {
    const { result } = renderHook(() => useStepCount(4, 5, true, true));

    expect(result.current).toBe(5);
  });
});
