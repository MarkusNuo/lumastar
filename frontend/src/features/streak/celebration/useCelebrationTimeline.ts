import { useReducedMotionConfig } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** intro: the moment before the big reveal; show: it plays; settled: everything is in place. */
export type CelebrationPhase = 'intro' | 'show' | 'settled';

export interface CelebrationTimeline {
  phase: CelebrationPhase;
  /** Tapped through (or reduced motion): everything takes its final state without a show. */
  skipped: boolean;
  /** No show at all: no confetti either. */
  reducedMotion: boolean;
  skip: () => void;
}

/**
 * The beats of a celebration screen. With reduced motion (the device's, or a `MotionConfig` that
 * forces it) there is nothing to wait for, so it starts settled; a tap skips to the end, so nobody
 * has to sit through it twice.
 */
export function useCelebrationTimeline(showAtMs: number, settledAtMs: number): CelebrationTimeline {
  const reduceMotion = useReducedMotionConfig() === true;
  const [phase, setPhase] = useState<CelebrationPhase>('intro');
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (reduceMotion || skipped) return;
    const timers = [
      setTimeout(() => setPhase('show'), showAtMs),
      setTimeout(() => setPhase('settled'), settledAtMs),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, skipped, showAtMs, settledAtMs]);

  const skip = useCallback(() => setSkipped(true), []);

  if (reduceMotion || skipped) {
    return { phase: 'settled', skipped: true, reducedMotion: reduceMotion, skip };
  }
  return { phase, skipped: false, reducedMotion: false, skip };
}

/**
 * Calls `skip` on a tap anywhere on the returned element while `active`. Only a shortcut for
 * pointers: the screen's own button stays the way on for the keyboard.
 */
export function useTapToSkip<T extends HTMLElement>(
  skip: () => void,
  active: boolean,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    element.addEventListener('pointerdown', skip);
    return () => element.removeEventListener('pointerdown', skip);
  }, [skip, active]);

  return ref;
}

/** Pause before the first step, then one step per tick; long distances take bigger steps. */
const FIRST_STEP_MS = 300;
const STEP_MS = 130;
const MAX_STEPS = 8;

/**
 * Counts from `from` to `to` once `running` turns true, one visible step at a time, so each new
 * number can pop; `instant` jumps to the end.
 */
export function useStepCount(from: number, to: number, running: boolean, instant: boolean): number {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!running || instant) return;
    const steps = Math.min(MAX_STEPS, Math.max(0, to - from));
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      step += 1;
      setValue(step >= steps ? to : from + Math.round(((to - from) * step) / steps));
      if (step < steps) timer = setTimeout(tick, STEP_MS);
    };
    timer = setTimeout(tick, FIRST_STEP_MS);
    return () => clearTimeout(timer);
  }, [from, to, running, instant]);

  if (instant) return to;
  return running ? value : from;
}
