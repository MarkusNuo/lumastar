import { motion } from 'motion/react';
import { clamp } from '../../lib/clamp';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';

export type MeterTone = 'aurora' | 'danger';

export interface MeterBarProps {
  /** The measured share, 0..1; values outside are clamped. */
  value: number;
  /** Accessible name, e.g. "Wortschatz". */
  label: string;
  /** Read instead of the bare number, e.g. "72 %" or "noch keine Daten". */
  valueText: string;
  tone?: MeterTone;
  className?: string;
}

const fillClass: Record<MeterTone, string> = {
  aurora: 'bg-linear-to-r from-secondary to-primary',
  danger: 'bg-danger',
};

/**
 * A quiet, static bar for a measured value (mastery, error rate) rather than progress through a
 * task: no shine, no sparks, it only grows in once.
 */
export function MeterBar({ value, label, valueText, tone = 'aurora', className }: MeterBarProps) {
  const share = clamp(value, 0, 1);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      aria-valuetext={valueText}
      className={cx('h-3 w-full overflow-hidden rounded-full bg-surface-raised', className)}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${share * 100}%` }}
        transition={springs.gentle}
        className={cx('h-full rounded-full', share > 0 && 'min-w-3', fillClass[tone])}
      />
    </div>
  );
}
