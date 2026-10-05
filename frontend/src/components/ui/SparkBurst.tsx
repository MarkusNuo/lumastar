import { motion } from 'motion/react';
import { cx } from '../../lib/cx';
import { durations } from '../../styles/motion';

/** Directions of the sparks in degrees; uneven on purpose so the burst looks hand-made. */
const SPARK_ANGLES = [-160, -115, -70, -25, 20, 65, 110, 155];
/** The shock ring grows from 24 px to about twice the spark distance. */
const RING_GROWTH_PER_PX = 1 / 10;

export interface SparkBurstProps {
  /** How far the sparks fly from the centre, in px. */
  distance?: number;
  /** Seconds before the burst starts. */
  delay?: number;
}

/**
 * A little burst of sparks and a shock ring around its own position, e.g. at the end of a filling
 * progress bar or around a completed goal ring. Callers skip it for reduced motion.
 */
export function SparkBurst({ distance = 22, delay = 0 }: SparkBurstProps) {
  const transition = { duration: durations.slow * 2, ease: 'easeOut', delay } as const;
  return (
    <>
      <motion.span
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: distance * RING_GROWTH_PER_PX, opacity: [0.9, 0] }}
        transition={transition}
        className="absolute -top-3 -left-3 size-6 rounded-full border-3 border-xp"
      />
      {SPARK_ANGLES.map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        const reach = distance + (index % 2) * 6;
        return (
          <motion.span
            key={angle}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
            animate={{
              x: Math.cos(radians) * reach,
              y: Math.sin(radians) * reach,
              scale: [0.4, 1.1, 0],
              opacity: [1, 1, 0],
            }}
            transition={transition}
            className={cx(
              'absolute -top-1 -left-1 size-2 rounded-full',
              index % 2 === 0 ? 'bg-xp' : 'bg-secondary',
            )}
          />
        );
      })}
    </>
  );
}
