import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  motionPreference.reduced = false;
});

describe('useCountUp', () => {
  it('starts counting from zero', () => {
    const { result } = renderHook(() => useCountUp(20));

    expect(result.current).toBe(0);
  });

  it('shows the final number at once for users who prefer reduced motion', () => {
    motionPreference.reduced = true;

    const { result } = renderHook(() => useCountUp(20));

    expect(result.current).toBe(20);
  });
});
