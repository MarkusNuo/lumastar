import { CheckpointResultScreen } from '../../checkpoint/CheckpointResultScreen';
import { LessonResultScreen, type LessonResultScreenProps } from './LessonResultScreen';

/** The end of any lesson: a saved checkpoint gets its own pass or fail moment. */
export function LessonEnd(props: LessonResultScreenProps) {
  const { checkpoint } = props.result;
  if (checkpoint) {
    return (
      <CheckpointResultScreen
        result={props.result}
        checkpoint={checkpoint}
        onContinue={props.onContinue}
        onStartFocus={props.onStartFocus}
      />
    );
  }
  return <LessonResultScreen {...props} />;
}
