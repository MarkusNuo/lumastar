import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Counts from 0 up to `target`; shows the target at once with reduced motion. */
export function useCountUp(target: number, durationMs = 900, delayMs = 250): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now + delayMs;
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, delayMs, reduceMotion]);

  return reduceMotion ? target : value;
}
