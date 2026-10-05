import { motion, useReducedMotion } from 'motion/react';
import { cx } from '../../lib/cx';
import { durations, springs } from '../../styles/motion';
import { Flame } from './Flame';

export interface StreakFlareProps {
  /** False shows the cold flame; turning true ignites it with a flare, a glow and rising embers. */
  lit: boolean;
  className?: string;
}

/** Sideways drift (px) and start (s) of the embers; uneven so they rise like real sparks. */
const EMBERS = [
  { drift: -30, delay: 0.05 },
  { drift: 12, delay: 0.2 },
  { drift: -10, delay: 0.4 },
  { drift: 34, delay: 0.3 },
  { drift: -22, delay: 0.6 },
  { drift: 20, delay: 0.75 },
] as const;
const EMBER_RISE_PX = 120;
const EMBER_ROUNDS = 2;

/** The big streak flame that "lodert" when the streak grows (PRD 12.4); decorative only. */
export function StreakFlare({ lit, className }: StreakFlareProps) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;

  return (
    <div aria-hidden="true" className={cx('relative grid size-44 place-items-center', className)}>
      <motion.span
        className="absolute inset-6 rounded-full bg-streak blur-glow"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={
          lit
            ? { opacity: animate ? [0, 0.7, 0.4] : 0.4, scale: animate ? [0.6, 1.3, 1] : 1 }
            : { opacity: 0, scale: 0.6 }
        }
        transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute inline-grid"
        initial={false}
        animate={{ opacity: lit ? 0 : 1 }}
        transition={{ duration: durations.fast }}
      >
        <Flame lit={false} className="size-36" />
      </motion.span>
      <motion.span
        className="absolute inline-grid origin-bottom"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={lit ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={springs.bouncy}
      >
        <Flame lit className="size-36 origin-bottom motion-safe:animate-blaze" />
      </motion.span>
      {lit &&
        animate &&
        EMBERS.map(({ drift, delay }) => (
          <motion.span
            key={`${drift}-${delay}`}
            data-testid="streak-ember"
            className="absolute bottom-12 size-2 rounded-full bg-streak-core"
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: [0, drift], y: [0, -EMBER_RISE_PX], scale: [1, 0.4] }}
            transition={{
              duration: durations.slow * 4,
              ease: 'easeOut',
              delay,
              repeat: EMBER_ROUNDS - 1,
            }}
          />
        ))}
    </div>
  );
}
