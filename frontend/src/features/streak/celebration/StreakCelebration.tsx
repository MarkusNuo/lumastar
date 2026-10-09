import { useState, type ReactNode } from 'react';
import type { LessonDailyGoal, LessonStreak } from '../../../api/types';
import type { GoalChoice } from '../goal/GoalChooser';
import type { CelebratedStreak } from '../model';
import { useGoalChoice } from '../streakApi';
import { GoalReachedBeat } from './GoalReachedBeat';
import { IgniteBeat } from './IgniteBeat';
import { rememberTrophy, trophyShown } from './shownTrophies';

export interface StreakCelebrationProps {
  streak: CelebratedStreak;
  /** Saves the next streak goal when the streak reached its goal. */
  goalChoice: GoalChoice;
  onContinue: () => void;
}

/** The flame catches, then, if the streak reached its goal, the trophy: one moment per screen. */
export function StreakCelebration({ streak, goalChoice, onContinue }: StreakCelebrationProps) {
  const [trophy, setTrophy] = useState(false);
  const { goalReached } = streak;

  if (trophy && goalReached) {
    return <GoalReachedBeat goal={goalReached} choice={goalChoice} onContinue={onContinue} />;
  }
  return (
    <IgniteBeat streak={streak} onContinue={goalReached ? () => setTrophy(true) : onContinue} />
  );
}

export interface WithStreakCelebrationProps {
  dailyGoal: LessonDailyGoal | undefined;
  streak: LessonStreak | undefined;
  /**
   * The screen before the flame. Every way on from it goes through `celebrateThen(leave)`: when the
   * screen met today's goal, the celebration comes first and `leave` runs after it, otherwise at once.
   */
  children: (celebrateThen: (leave: () => void) => void) => ReactNode;
}

interface PendingCelebration {
  streak: CelebratedStreak;
  leave: () => void;
}

/**
 * A lesson's or placement's end screen, followed by the streak celebration when it met today's
 * goal. The celebration replaces the end screen in place, so nothing else (e.g. the learning path)
 * shows in between, whichever way the learner goes on.
 */
export function WithStreakCelebration({ dailyGoal, streak, children }: WithStreakCelebrationProps) {
  const [celebration, setCelebration] = useState<PendingCelebration>();
  const grownStreak = dailyGoal?.justMet ? streak : undefined;

  if (celebration) {
    return <SavingStreakCelebration streak={celebration.streak} onContinue={celebration.leave} />;
  }
  return children((leave) => {
    if (grownStreak) setCelebration({ streak: withTrophyOnce(grownStreak), leave });
    else leave();
  });
}

/** The streak without its reached goal when this device has shown that trophy already today. */
function withTrophyOnce(streak: CelebratedStreak): CelebratedStreak {
  const { goalReached, ...rest } = streak;
  if (!goalReached || trophyShown(goalReached.target)) return rest;
  rememberTrophy(goalReached.target);
  return streak;
}

function SavingStreakCelebration(props: Omit<StreakCelebrationProps, 'goalChoice'>) {
  const goalChoice = useGoalChoice();
  return <StreakCelebration {...props} goalChoice={goalChoice} />;
}
