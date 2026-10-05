import { FireIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { UI_COPY } from './copy';

export interface ComboBadgeProps {
  /** Answers in a row; the badge shows while it is set. */
  count: number | null;
  className?: string;
}

/**
 * "3 richtig in Folge!": pops in when the learner hits a run of correct answers in a lesson. The
 * status region stays mounted so screen readers announce each new run.
 */
export function ComboBadge({ count, className }: ComboBadgeProps) {
  return (
    <div role="status" className={cx('pointer-events-none flex justify-center', className)}>
      <AnimatePresence>
        {count !== null && (
          <motion.p
            key={count}
            data-tone="xp"
            initial={{ opacity: 0, scale: 0.5, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -6 }}
            transition={springs.bouncy}
            className="inline-flex items-center gap-1.5 rounded-full tone-solid px-3 py-1 text-caption font-black tracking-wide uppercase shadow-float edge-3d"
          >
            <FireIcon aria-hidden="true" size={16} weight="fill" />
            {UI_COPY.combo(count)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
