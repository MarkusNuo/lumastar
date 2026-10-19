import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import { SHAKE_OFFSETS_PX } from '../../../lib/useShake';
import { durations } from '../../../styles/motion';
import type { Reaction } from './exerciseProps';

const HOP_OFFSETS_PX = [0, -10, 0];

export interface ReactionSurfaceProps {
  reaction: Reaction;
  children: ReactNode;
  /** Should repeat the radius of the content so the shine stays inside it. */
  className?: string;
}

/** The answer area: hops with a shine when correct, shakes when wrong. */
export function ReactionSurface({ reaction, children, className }: ReactionSurfaceProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || reaction === 'idle') return;
    void (reaction === 'success'
      ? animate(scope.current, { y: HOP_OFFSETS_PX }, { duration: durations.slow, ease: 'easeOut' })
      : animate(scope.current, { x: SHAKE_OFFSETS_PX }, { duration: durations.slow }));
  }, [reaction, reduceMotion, animate, scope]);

  return (
    <div ref={scope} className={cx('relative', className)}>
      {children}
      {reaction === 'success' && !reduceMotion && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <motion.span
            initial={{ x: '-120%' }}
            animate={{ x: '420%' }}
            transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 w-1/4 -skew-x-20 bg-linear-to-r from-transparent via-shine to-transparent"
          />
        </span>
      )}
    </div>
  );
}
