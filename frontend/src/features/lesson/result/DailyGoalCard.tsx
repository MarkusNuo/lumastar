import { motion } from 'motion/react';
import { useEffect, useId } from 'react';
import { DailyGoalRing } from '../../../components/ui/DailyGoalRing';
import { UI_COPY } from '../../../components/ui/copy';
import { playCue } from '../../../lib/effects/playCue';
import { durations, springs } from '../../../styles/motion';
import { LESSON_COPY } from '../copy';
import type { LessonDailyGoal } from '../model';

const copy = LESSON_COPY.result.dailyGoal;

export interface DailyGoalCardProps {
  goal: LessonDailyGoal;
  /** Seconds before the ring fills, so it follows the result cards. */
  delay?: number;
}

/**
 * Today's minutes after the lesson (PRD F9). The lesson that meets the goal fills the ring with a
 * burst of sparks and its own sound.
 */
export function DailyGoalCard({ goal, delay = 0 }: DailyGoalCardProps) {
  const titleId = useId();
  const { minutesToday, goalMinutes, goalMet, justMet } = goal;
  // Plays as the ring closes; leaving the screen before that cancels it.
  useEffect(() => {
    if (!justMet) return;
    const timer = setTimeout(() => playCue('goal'), (delay + durations.slow) * 1000);
    return () => clearTimeout(timer);
  }, [justMet, delay]);

  return (
    <section
      aria-labelledby={titleId}
      data-tone={goalMet ? 'success' : 'neutral'}
      className="flex w-full items-center gap-4 rounded-card tone-outline p-4 text-left"
    >
      <DailyGoalRing
        progress={goalMinutes > 0 ? minutesToday / goalMinutes : 0}
        valueText={UI_COPY.dailyGoalValue(minutesToday, goalMinutes)}
        size="md"
        burst={justMet}
        delay={delay}
      />
      <div className="min-w-0">
        <h2 id={titleId} className="text-micro font-black tracking-wider text-fg-muted uppercase">
          {copy.title}
        </h2>
        <motion.p
          initial={justMet ? { scale: 0.85, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.bouncy, delay: delay + durations.slow }}
          className="origin-left text-lead font-black text-fg"
        >
          {headline(goal)}
        </motion.p>
        <p className="text-label font-bold text-fg-muted">{detail(goal)}</p>
      </div>
    </section>
  );
}

function headline({ minutesToday, goalMinutes, goalMet, justMet }: LessonDailyGoal): string {
  if (justMet) return copy.justMet;
  return goalMet ? copy.met : copy.minutes(minutesToday, goalMinutes);
}

function detail({ minutesToday, goalMinutes, goalMet, justMet }: LessonDailyGoal): string {
  if (justMet) return copy.justMetText(minutesToday);
  return goalMet ? copy.metText(minutesToday) : copy.remaining(goalMinutes - minutesToday);
}
