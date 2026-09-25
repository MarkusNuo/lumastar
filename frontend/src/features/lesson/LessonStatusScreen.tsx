import { motion } from 'motion/react';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { LoadingDots } from '../../components/ui/LoadingDots';
import { Mascot } from '../../components/ui/Mascot';
import { durations } from '../../styles/motion';

/**
 * Waiting before or after a lesson. It fades in after a moment, so a fast answer switches straight
 * to the next screen instead of flashing this one.
 */
export function LessonStatusScreen({ label }: { label: string }) {
  return (
    <FocusScreen className="items-center justify-center">
      <div role="status" className="flex flex-col items-center gap-4 text-primary-soft">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durations.base, delay: durations.slow }}
          className="flex flex-col items-center gap-4"
        >
          <Mascot expression="thinking" size="xl" />
          <LoadingDots />
        </motion.div>
        <span className="sr-only">{label}</span>
      </div>
    </FocusScreen>
  );
}
