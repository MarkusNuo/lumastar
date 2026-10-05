import { CheckIcon, TimerIcon } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { clamp } from '../../lib/clamp';
import { cx } from '../../lib/cx';
import { formatPercent } from '../../lib/formatPercent';
import { useMotionTransition } from '../../lib/useMotionTransition';
import { durations, springs } from '../../styles/motion';
import { UI_COPY } from './copy';
import { SparkBurst } from './SparkBurst';

type RingSize = 'sm' | 'md' | 'lg';

export interface DailyGoalRingProps {
  /** Share of the daily goal reached, 0..1; values outside are clamped. */
  progress: number;
  size?: RingSize;
  label?: string;
  /** Read instead of the percentage, e.g. "3 von 5 Min.". */
  valueText?: string;
  /** Sparks fly off once the ring is full, e.g. when a lesson has just met the goal. */
  burst?: boolean;
  /** Seconds before the ring fills, e.g. until a screen has sprung in. */
  delay?: number;
  className?: string;
}

const sizeClass = { sm: 'size-10', md: 'size-16', lg: 'size-24' } as const;
const iconSize = { sm: 18, md: 26, lg: 34 } as const;
const burstDistance: Record<RingSize, number> = { sm: 26, md: 44, lg: 64 };

const VIEWBOX = 44;
const CENTER = VIEWBOX / 2;
const STROKE = 5;
const RADIUS = CENTER - STROKE / 2 - 1;

export function DailyGoalRing({
  progress,
  size = 'sm',
  label = UI_COPY.dailyGoal,
  valueText,
  burst = false,
  delay = 0,
  className,
}: DailyGoalRingProps) {
  const share = clamp(progress, 0, 1);
  const percent = Math.round(share * 100);
  const complete = share >= 1;
  const gradientId = useId();
  const reduceMotion = useReducedMotion();
  const fill = useMotionTransition({ ...springs.gentle, delay });
  const ResultIcon = complete ? CheckIcon : TimerIcon;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText ?? formatPercent(percent)}
      className={cx('relative inline-grid shrink-0 place-items-center', sizeClass[size], className)}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="absolute inset-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-secondary)]" />
            <stop offset="100%" className="[stop-color:var(--color-primary)]" />
          </linearGradient>
        </defs>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-surface-raised"
        />
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          stroke={complete ? undefined : `url(#${gradientId})`}
          className={complete ? 'stroke-success' : undefined}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: share, opacity: share > 0 ? 1 : 0 }}
          transition={fill}
        />
      </svg>
      <motion.span
        key={complete ? 'complete' : 'open'}
        initial={complete ? { scale: 0.3 } : false}
        animate={{ scale: 1 }}
        transition={{ ...springs.bouncy, delay: delay + durations.slow }}
        className="inline-grid"
      >
        <ResultIcon
          aria-hidden="true"
          size={iconSize[size]}
          weight="bold"
          className={complete ? 'text-success' : 'text-fg-muted'}
        />
      </motion.span>
      {burst && complete && !reduceMotion && (
        <span aria-hidden="true" data-testid="goal-burst" className="absolute top-1/2 left-1/2">
          <SparkBurst distance={burstDistance[size]} delay={delay + durations.slow} />
        </span>
      )}
    </div>
  );
}
