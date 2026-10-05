import { useReducedMotion, type Transition } from 'motion/react';

const INSTANT: Transition = { duration: 0 };

/**
 * The transition, or none for users who prefer reduced motion. `MotionConfig reducedMotion="user"`
 * only stops transforms; widths, positions and SVG path lengths still need this.
 */
export function useMotionTransition(transition: Transition): Transition {
  return useReducedMotion() ? INSTANT : transition;
}
