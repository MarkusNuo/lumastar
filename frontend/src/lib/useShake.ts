import { useAnimate, useReducedMotion } from 'motion/react';
import { useCallback } from 'react';
import { durations } from '../styles/motion';

export const SHAKE_OFFSETS_PX = [0, -12, 10, -8, 6, -3, 0];

/** Short horizontal shake for wrong input; attach `scope` to the element to shake. */
export function useShake<T extends Element = HTMLDivElement>() {
  const [scope, animate] = useAnimate<T>();
  const reduceMotion = useReducedMotion();

  const shake = useCallback(() => {
    if (reduceMotion) return;
    void animate(scope.current, { x: SHAKE_OFFSETS_PX }, { duration: durations.slow });
  }, [animate, scope, reduceMotion]);

  return [scope, shake] as const;
}
