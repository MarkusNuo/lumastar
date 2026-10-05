import { motion } from 'motion/react';
import { springs } from '../../styles/motion';
import { LevelBadge, type LevelBadgeProps } from './LevelBadge';

export interface LevelBadgePopProps extends LevelBadgeProps {
  /** Hidden until true, then it springs in with a little twist. */
  revealed: boolean;
}

/** A level badge that pops in for a big moment, e.g. the placement result (PRD 12.3). */
export function LevelBadgePop({ revealed, ...badge }: LevelBadgePopProps) {
  return (
    <motion.div
      initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
      animate={revealed ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
      transition={springs.bouncy}
    >
      <LevelBadge {...badge} />
    </motion.div>
  );
}
