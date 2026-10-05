import { useState } from 'react';
import { CheckpointResultScreen } from '../../checkpoint/CheckpointResultScreen';
import { LessonResultScreen, type LessonResultScreenProps } from './LessonResultScreen';
import { StreakCelebration } from './StreakCelebration';

/**
 * The end of any lesson: a saved checkpoint gets its own pass or fail moment, and the lesson that
 * met today's goal is followed by the streak flame, one moment per screen.
 */
export function LessonEnd(props: LessonResultScreenProps) {
  const { result, onContinue } = props;
  const [celebrating, setCelebrating] = useState(false);
  const grownStreak = result.dailyGoal?.justMet ? result.streak : undefined;

  if (celebrating && grownStreak) {
    return <StreakCelebration streak={grownStreak} onContinue={onContinue} />;
  }
  const continueFromResult = grownStreak ? () => setCelebrating(true) : onContinue;
  if (result.checkpoint) {
    return (
      <CheckpointResultScreen
        result={result}
        checkpoint={result.checkpoint}
        onContinue={continueFromResult}
        onStartFocus={props.onStartFocus}
      />
    );
  }
  return <LessonResultScreen {...props} onContinue={continueFromResult} />;
}
