import { CheckIcon, TimerIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useId } from 'react';
import { clamp } from '../../lib/clamp';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';

export interface DailyGoalRingProps {
  /** Share of the daily goal reached, 0..1; values outside are clamped. */
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClass = { sm: 'size-10', md: 'size-16', lg: 'size-24' } as const;
const iconSize = { sm: 18, md: 26, lg: 34 } as const;

const VIEWBOX = 44;
const CENTER = VIEWBOX / 2;
const STROKE = 5;
const RADIUS = CENTER - STROKE / 2 - 1;

export function DailyGoalRing({
  progress,
  size = 'sm',
  label = 'Tagesziel',
  className,
}: DailyGoalRingProps) {
  const share = clamp(progress, 0, 1);
  const percent = Math.round(share * 100);
  const complete = share >= 1;
  const gradientId = useId();

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent} %`}
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
          transition={springs.gentle}
        />
      </svg>
      {complete ? (
        <CheckIcon
          aria-hidden="true"
          size={iconSize[size]}
          weight="bold"
          className="text-success"
        />
      ) : (
        <TimerIcon
          aria-hidden="true"
          size={iconSize[size]}
          weight="bold"
          className="text-fg-muted"
        />
      )}
    </div>
  );
}
