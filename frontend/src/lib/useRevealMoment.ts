import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** A short drum roll before the level shows; how long the mascot "thinks". */
export const REVEAL_DELAY_MS = 900;

/**
 * False during the drum roll, then true. With reduced motion there is nothing to wait for, so the
 * result shows at once.
 */
export function useRevealMoment(delayMs = REVEAL_DELAY_MS): boolean {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => setRevealed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, reduceMotion]);

  return revealed || reduceMotion === true;
}
