import { motion } from 'motion/react';
import { AuroraBackdrop } from '../components/ui/AuroraBackdrop';
import { LoadingDots } from '../components/ui/LoadingDots';
import { Mascot } from '../components/ui/Mascot';
import { Wordmark } from '../components/ui/Wordmark';
import { durations, springs } from '../styles/motion';
import { APP_COPY } from './copy';

/**
 * Branded loading state. It appears after a short delay, so fast answers switch straight to the
 * screen instead of flashing the splash for a few milliseconds.
 */
export function SplashScreen() {
  return (
    <div role="status">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: durations.base, delay: durations.slow }}
        className="relative isolate grid min-h-dvh place-items-center"
      >
        <AuroraBackdrop />
        <motion.div
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ ...springs.bouncy, delay: durations.slow }}
          className="flex flex-col items-center gap-4 text-primary-soft"
        >
          <Mascot size="xl" />
          <Wordmark size="lg" />
          <LoadingDots />
        </motion.div>
      </motion.div>
      <span className="sr-only">{APP_COPY.loading}</span>
    </div>
  );
}
