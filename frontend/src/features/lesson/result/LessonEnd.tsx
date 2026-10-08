import { CheckpointResultScreen } from '../../checkpoint/CheckpointResultScreen';
import { LessonResultScreen, type LessonResultScreenProps } from './LessonResultScreen';
import { WithStreakCelebration } from '../../streak/celebration/StreakCelebration';

/**
 * The end of any lesson: a saved checkpoint gets its own pass or fail moment, and the lesson that
 * met today's goal is followed by the streak flame, one moment per screen.
 */
export function LessonEnd(props: LessonResultScreenProps) {
  const { result } = props;

  return (
    <WithStreakCelebration
      dailyGoal={result.dailyGoal}
      streak={result.streak}
      onContinue={props.onContinue}
    >
      {(onContinue) =>
        result.checkpoint ? (
          <CheckpointResultScreen
            result={result}
            checkpoint={result.checkpoint}
            onContinue={onContinue}
            onStartFocus={props.onStartFocus}
          />
        ) : (
          <LessonResultScreen {...props} onContinue={onContinue} />
        )
      }
    </WithStreakCelebration>
  );
}
