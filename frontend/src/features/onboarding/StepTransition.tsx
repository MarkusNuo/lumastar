import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { springs } from '../../styles/motion';
import type { StepDirection } from './useStepFlow';

const SLIDE_OFFSET_PX = 40;

/** Slides a freshly mounted step in from the side it is coming from. */
export function StepTransition({
  direction,
  className,
  children,
}: {
  direction: StepDirection;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * SLIDE_OFFSET_PX }}
      animate={{ opacity: 1, x: 0 }}
      transition={springs.snappy}
      className={className}
    >
      {children}
    </motion.div>
  );
}
