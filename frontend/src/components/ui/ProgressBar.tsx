import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { clamp } from '../../lib/clamp';
import { cx } from '../../lib/cx';
import { durations, springs } from '../../styles/motion';

export type ProgressBarTone = 'aurora' | 'success' | 'xp';

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Lektionsfortschritt". */
  label: string;
  valueText?: string;
  tone?: ProgressBarTone;
  /** A new value sets off a little burst of sparks at the end of the fill, e.g. for a combo. */
  burstKey?: number;
  className?: string;
}

const fillClass: Record<ProgressBarTone, string> = {
  aurora: 'bg-linear-to-r from-secondary to-primary',
  success: 'bg-success',
  xp: 'bg-linear-to-r from-streak to-xp',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  tone = 'aurora',
  burstKey,
  className,
}: ProgressBarProps) {
  const current = clamp(value, 0, max);
  const percent = max > 0 ? (current / max) * 100 : 0;
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={current}
      aria-valuetext={valueText}
      className={cx('relative h-4 w-full rounded-full bg-surface-raised', className)}
    >
      <motion.div
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={springs.gentle}
        className={cx(
          'relative h-full overflow-hidden rounded-full',
          percent > 0 && 'min-w-4',
          fillClass[tone],
        )}
      >
        <span className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-highlight" />
        <span className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-shine to-transparent motion-safe:animate-shine motion-reduce:hidden" />
      </motion.div>
      {!reduceMotion && (
        // Follows the end of the fill with the same spring.
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ left: `${percent}%` }}
          transition={springs.gentle}
          className="pointer-events-none absolute top-1/2"
        >
          <AnimatePresence>
            {burstKey !== undefined && <SparkBurst key={burstKey} />}
          </AnimatePresence>
        </motion.span>
      )}
    </div>
  );
}

/** Directions of the sparks in degrees; uneven on purpose so the burst looks hand-made. */
const SPARK_ANGLES = [-160, -115, -70, -25, 20, 65, 110, 155];
const SPARK_DISTANCE_PX = 22;

function SparkBurst() {
  return (
    <span data-testid="progress-burst" className="absolute">
      <motion.span
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
        className="absolute -top-3 -left-3 size-6 rounded-full border-3 border-xp"
      />
      {SPARK_ANGLES.map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        const distance = SPARK_DISTANCE_PX + (index % 2) * 6;
        return (
          <motion.span
            key={angle}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{
              x: Math.cos(radians) * distance,
              y: Math.sin(radians) * distance,
              scale: [0.4, 1.1, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
            className={cx(
              'absolute -top-1 -left-1 size-2 rounded-full',
              index % 2 === 0 ? 'bg-xp' : 'bg-secondary',
            )}
          />
        );
      })}
    </span>
  );
}
