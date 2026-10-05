import { ShieldCheckIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/Button';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { PopNumber } from '../../../components/ui/PopNumber';
import { StreakFlare } from '../../../components/ui/StreakFlare';
import { playCue } from '../../../lib/effects/playCue';
import { useOnceWhen } from '../../../lib/useOnceWhen';
import { REVEAL_DELAY_MS, useRevealMoment } from '../../../lib/useRevealMoment';
import { durations, springs } from '../../../styles/motion';
import { LESSON_COPY } from '../copy';
import type { LessonStreak } from '../model';

const copy = LESSON_COPY.result.streak;

/** The cold flame shows for a moment, then catches fire. */
const IGNITE_DELAY_MS = REVEAL_DELAY_MS / 2;

export interface StreakCelebrationProps {
  streak: LessonStreak;
  onContinue: () => void;
}

/**
 * After the lesson that met today's goal: the flame "lodert" and the streak counts up by one
 * (PRD F9, 12.4). A bridged missed day gets a friendly word about the streak freeze.
 */
export function StreakCelebration({ streak, onContinue }: StreakCelebrationProps) {
  const lit = useRevealMoment(IGNITE_DELAY_MS);
  useOnceWhen(lit, () => playCue('streak'));
  const days = streak.current;

  return (
    <FocusScreen
      backdrop
      className="items-center justify-center gap-5 pb-6 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          {copy.continue}
        </Button>
      }
    >
      <div data-testid="streak-celebration" className="flex flex-col items-center gap-2">
        <StreakFlare lit={lit} />
        <h1 className="flex flex-col items-center">
          <PopNumber
            value={lit ? days : Math.max(0, days - 1)}
            className="text-hero font-black text-streak"
          />
          <span aria-hidden="true" className="text-title font-black">
            {copy.unit(days)}
          </span>
          <span className="sr-only">{copy.title(days)}</span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={lit ? { opacity: 1, y: 0 } : undefined}
          transition={{ ...springs.gentle, delay: durations.base }}
          className="max-w-xs text-body text-fg-muted"
        >
          {copy.text(days)}
        </motion.p>
      </div>
      {streak.freezeUsed && (
        <p
          data-tone="freeze"
          className="flex items-start gap-3 rounded-card-sm tone-outline px-4 py-3 text-left text-label font-bold"
        >
          <ShieldCheckIcon aria-hidden="true" size={22} weight="fill" className="shrink-0" />
          <span className="text-fg">{copy.freezeUsed}</span>
        </p>
      )}
    </FocusScreen>
  );
}
