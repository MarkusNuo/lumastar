import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { FeedbackSheet, type FeedbackVariant } from '../../components/ui/FeedbackSheet';
import { ScreenFooter } from '../../components/ui/FocusScreen';
import { springs } from '../../styles/motion';
import { LESSON_COPY } from './copy';
import { needsCheckButton } from './exercises/exerciseProps';
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
  onCheck: (answer: Answer) => void;
  onContinue: () => void;
  /** Off while a dialog is open on top. */
  keyboardEnabled: boolean;
}

/** One exercise: the task, a fixed "Prüfen" button and the feedback sheet (PRD 12.3). */
export function ExerciseScreen({
  entry,
  onCheck,
  onContinue,
  keyboardEnabled,
}: ExerciseScreenProps) {
  const { exercise, verdict, retry } = entry;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Screen readers start at the new task, unless the exercise put the cursor into its input.
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body && contentRef.current?.contains(active)) return;
    contentRef.current
      ?.querySelector<HTMLElement>('[data-exercise-title]')
      ?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <motion.div
        ref={contentRef}
        data-exercise-id={exercise.id}
        data-exercise-type={exercise.type}
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={springs.snappy}
        className="flex-1 pt-2 pb-8"
      >
        <ExerciseView
          exercise={exercise}
          retry={retry}
          verdict={verdict}
          onAnswerChange={setAnswer}
          onSubmit={onCheck}
        />
      </motion.div>
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
          continueLabel={LESSON_COPY.continue}
          onContinue={onContinue}
        />
      )}
    </>
  );
}
