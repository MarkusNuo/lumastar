import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { FeedbackSheet, type FeedbackVariant } from '../../components/ui/FeedbackSheet';
import { ScreenFooter } from '../../components/ui/FocusScreen';
import { LESSON_COPY } from './copy';
import { ExerciseStage } from './ExerciseStage';
import { hasPromptBubble, mascotFor, needsCheckButton } from './exercises/exerciseProps';
import { ExerciseView } from './exercises/ExerciseView';
import type { Answer, LessonExercise, Outcome, Verdict } from './model';
import type { QueueEntry } from './session/lessonQueue';
import { useEnterKey } from './useEnterKey';

const feedbackVariant: Record<Outcome, FeedbackVariant> = {
  correct: 'correct',
  almost_correct: 'almost',
  correct_standard_form: 'standard',
  wrong: 'wrong',
};

function answerLang(exercise: LessonExercise) {
  return 'answerLang' in exercise ? exercise.answerLang : undefined;
}

/** A correct answer needs no solution; the others show what was expected. */
function shownSolution(verdict: Verdict): string | undefined {
  return verdict.outcome === 'correct' ? undefined : verdict.solution;
}

export interface ExerciseScreenProps {
  entry: QueueEntry;
  /** Keeps the order of options and tiles the same when the exercise comes back as a retry. */
  shuffleSeed: number;
  onCheck: (answer: Answer) => void;
  onContinue: () => void;
  /** Off while a dialog is open on top. */
  keyboardEnabled: boolean;
}

/** One exercise: the task, a fixed "Prüfen" button and the feedback sheet. */
export function ExerciseScreen({
  entry,
  shuffleSeed,
  onCheck,
  onContinue,
  keyboardEnabled,
}: ExerciseScreenProps) {
  const { exercise, verdict, retry } = entry;
  const [answer, setAnswer] = useState<Answer | null>(null);

  const check = () => {
    if (answer && !verdict) onCheck(answer);
  };

  useEnterKey(keyboardEnabled, () => {
    if (verdict) {
      onContinue();
      return true;
    }
    if (!answer || !needsCheckButton(exercise)) return false;
    onCheck(answer);
    return true;
  });

  return (
    <>
      <ExerciseStage exercise={exercise}>
        <ExerciseView
          exercise={exercise}
          retry={retry}
          verdict={verdict}
          onAnswerChange={setAnswer}
          onSubmit={onCheck}
          shuffleSeed={shuffleSeed}
        />
      </ExerciseStage>
      {needsCheckButton(exercise) && (
        <ScreenFooter>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!answer || verdict !== undefined}
            onClick={check}
          >
            {LESSON_COPY.check}
          </Button>
        </ScreenFooter>
      )}
      {verdict && (
        <FeedbackSheet
          open
          variant={feedbackVariant[verdict.outcome]}
          solution={shownSolution(verdict)}
          solutionLang={answerLang(exercise)}
          hint={verdict.hint}
          explanation={verdict.explanation}
          mascot={hasPromptBubble(exercise) ? undefined : mascotFor(verdict)}
          continueLabel={LESSON_COPY.continue}
          onContinue={onContinue}
        />
      )}
    </>
  );
}
