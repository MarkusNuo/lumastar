import { CheckpointResultScreen } from '../../checkpoint/CheckpointResultScreen';
import { LessonResultScreen, type LessonResultScreenProps } from './LessonResultScreen';
import { WithStreakCelebration } from '../../streak/celebration/StreakCelebration';

/**
 * The end of any lesson: a saved checkpoint gets its own pass or fail moment, and the lesson that
 * met today's goal is followed by the streak flame, one moment per screen, before the learner goes
 * on, be it with "Weiter" or into the suggested focus lesson.
 */
export function LessonEnd({ onContinue, onStartFocus, ...props }: LessonResultScreenProps) {
  const { result } = props;

  return (
    <WithStreakCelebration dailyGoal={result.dailyGoal} streak={result.streak}>
      {(celebrateThen) => {
        const goOn = () => celebrateThen(onContinue);
        const startFocus = (unitId: string) => celebrateThen(() => onStartFocus(unitId));
        return result.checkpoint ? (
          <CheckpointResultScreen
            result={result}
            checkpoint={result.checkpoint}
            onContinue={goOn}
            onStartFocus={startFocus}
          />
        ) : (
          <LessonResultScreen {...props} onContinue={goOn} onStartFocus={startFocus} />
        );
      }}
    </WithStreakCelebration>
  );
}
