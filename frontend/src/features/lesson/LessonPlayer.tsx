import { XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ComboBadge } from '../../components/ui/ComboBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { LESSON_COPY } from './copy';
import type { StandardFormLexicon } from './evaluation/standardFormLexicon';
import { ExerciseScreen } from './ExerciseScreen';
import { seedFrom } from './exercises/shuffle';
import type { Lesson, LessonResult } from './model';
import { LessonResultScreen } from './result/LessonResultScreen';
import { isComboMilestone } from './session/lessonQueue';
import { useLessonSession } from './session/useLessonSession';
import { useAnswerCue } from './useAnswerCue';

export interface LessonPlayerProps {
  lesson: Lesson;
  /** Standard forms the pre-check recognises in typed Gheg answers. */
  lexicon: StandardFormLexicon;
  /** Leaving before the end; the lesson's progress is lost. */
  onQuit: () => void;
  onFinish: (result: LessonResult) => void;
}

export function LessonPlayer({ lesson, lexicon, onQuit, onFinish }: LessonPlayerProps) {
  const session = useLessonSession(lesson, lexicon);
  const [quitOpen, setQuitOpen] = useState(false);
  const { completion, entry, progress, streak } = session;
  const playing = completion.status === 'playing' && entry !== undefined;
  // Shown while the feedback of the answer that completed the run is open.
  const combo = entry?.verdict && isComboMilestone(streak) ? streak : null;
  useAnswerCue(entry, combo !== null);

  useEscapeKey(playing && !quitOpen, () => setQuitOpen(true));

  if (completion.status === 'finished') {
    return (
      <LessonResultScreen
        result={completion.result}
        onContinue={() => onFinish(completion.result)}
        onRetrySave={completion.retrySave}
        retrying={completion.retrying}
      />
    );
  }
  if (!playing) return <WaitingScreen label={LESSON_COPY.saving} />;

  return (
    <FocusScreen
      header={
        <>
          <IconButton
            icon={XIcon}
            label={LESSON_COPY.close}
            variant="ghost"
            onClick={() => setQuitOpen(true)}
          />
          <div className="relative flex-1">
            <ProgressBar
              label={LESSON_COPY.progressLabel}
              value={progress.completed}
              max={progress.total}
              valueText={LESSON_COPY.progressValue(progress.completed, progress.total)}
              burstKey={combo ?? undefined}
            />
            <ComboBadge count={combo} className="absolute inset-x-0 top-full z-(--z-bar) mt-2" />
          </div>
        </>
      }
    >
      <ExerciseScreen
        key={entry.key}
        entry={entry}
        shuffleSeed={seedFrom(`${lesson.sessionId}:${entry.exercise.id}`)}
        onCheck={session.check}
        onContinue={session.proceed}
        keyboardEnabled={!quitOpen}
      />
      <ConfirmDialog
        open={quitOpen}
        title={LESSON_COPY.quit.title}
        text={LESSON_COPY.quit.text}
        cancelLabel={LESSON_COPY.quit.stay}
        confirmLabel={LESSON_COPY.quit.leave}
        confirmVariant="ghost"
        onCancel={() => setQuitOpen(false)}
        onConfirm={onQuit}
      />
    </FocusScreen>
  );
}
