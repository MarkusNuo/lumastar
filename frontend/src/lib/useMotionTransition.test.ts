import { renderHook } from '@testing-library/react';
import { useReducedMotion } from 'motion/react';
import { describe, expect, it, vi } from 'vitest';
import { springs } from '../styles/motion';
import { useMotionTransition } from './useMotionTransition';

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: vi.fn(() => false),
}));

describe('useMotionTransition', () => {
  it('keeps the spring for everyone else', () => {
    const { result } = renderHook(() => useMotionTransition(springs.gentle));

    expect(result.current).toBe(springs.gentle);
  });

  it('makes the change instant for users who prefer reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useMotionTransition(springs.gentle));

    expect(result.current).toEqual({ duration: 0 });
  });
});
