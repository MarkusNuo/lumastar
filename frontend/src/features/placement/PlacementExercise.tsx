import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { ScreenFooter } from '../../components/ui/FocusScreen';
import { ExerciseStage } from '../lesson/ExerciseStage';
import { ExerciseView } from '../lesson/exercises/ExerciseView';
import type { Answer, LessonExercise } from '../lesson/model';
import { useEnterKey } from '../lesson/useEnterKey';
import { PLACEMENT_COPY } from './copy';

const copy = PLACEMENT_COPY.test;

export interface PlacementExerciseProps {
  exercise: LessonExercise;
  shuffleSeed: number;
  onSubmit: (answer: Answer) => void;
  sending: boolean;
  /** The answer did not arrive; "Weiter" sends it again. */
  sendFailed: boolean;
  /** Off while a dialog is open on top. */
  keyboardEnabled: boolean;
}

/**
 * One placement item in the lesson player's exercise components, without a verdict: the test
 * neither teaches nor discourages, so "Weiter" simply moves on.
 */
export function PlacementExercise({
  exercise,
  shuffleSeed,
  onSubmit,
  sending,
  sendFailed,
  keyboardEnabled,
}: PlacementExerciseProps) {
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEnterKey(keyboardEnabled, () => {
    if (!answer) return false;
    onSubmit(answer);
    return true;
  });

  return (
    <>
      <ExerciseStage exercise={exercise} inert={sending}>
        <ExerciseView
          exercise={exercise}
          retry={false}
          verdict={undefined}
          onAnswerChange={setAnswer}
          onSubmit={onSubmit}
          shuffleSeed={shuffleSeed}
        />
      </ExerciseStage>
      <ScreenFooter>
        <div className="flex flex-col gap-3">
          {sendFailed && <Callout tone="danger">{copy.answerFailed}</Callout>}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={sending}
            disabled={!answer}
            onClick={() => answer && onSubmit(answer)}
          >
            {copy.next}
          </Button>
        </div>
      </ScreenFooter>
    </>
  );
}
