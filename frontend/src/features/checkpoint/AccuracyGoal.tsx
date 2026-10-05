import { motion } from 'motion/react';
import { springs } from '../../styles/motion';
import { CHECKPOINT_COPY } from './copy';

const copy = CHECKPOINT_COPY.failed;

export interface AccuracyGoalProps {
  /** 0 to 1 */
  accuracy: number;
  /** 0 to 1; the mark on the bar. */
  required: number;
}

/** A share as a CSS length along the bar. */
const percent = (share: number) => `${share * 100}%`;

/** How close a failed checkpoint came: the accuracy as a bar with the pass mark on it. */
export function AccuracyGoal({ accuracy, required }: AccuracyGoalProps) {
  return (
    <div
      role="img"
      aria-label={copy.meter(accuracy, required)}
      className="flex w-full flex-col gap-2"
    >
      <div className="relative h-4 rounded-full bg-surface-raised">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: percent(accuracy) }}
          transition={springs.gentle}
          data-tone="warning"
          className="h-full rounded-full tone-solid"
        />
        <span
          aria-hidden="true"
          style={{ left: percent(required) }}
          className="absolute -top-1.5 -bottom-1.5 w-1 -translate-x-1/2 rounded-full bg-fg"
        />
      </div>
      <div aria-hidden="true" className="relative h-5">
        <span
          style={{ left: percent(required) }}
          className="absolute -translate-x-1/2 text-caption font-extrabold whitespace-nowrap text-fg-muted"
        >
          {copy.goal(required)}
        </span>
      </div>
    </div>
  );
}
