import { AnimatePresence, motion } from 'motion/react';
import { springs } from '../../styles/motion';

const numberFormat = new Intl.NumberFormat('de-CH');

/** A number that pops in whenever it changes (but not on first render). */
export function PopNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden="true" className="inline-grid">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ scale: 1.5, y: -6 }}
          animate={{ scale: 1, y: 0 }}
          transition={springs.bouncy}
          className={className}
        >
          {numberFormat.format(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
