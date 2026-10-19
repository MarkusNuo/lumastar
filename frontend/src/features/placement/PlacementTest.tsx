import { XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FailureScreen } from '../../components/ui/FailureScreen';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { seedFrom } from '../lesson/exercises/shuffle';
import { PLACEMENT_COPY } from './copy';
import type { StartedPlacement } from './placementApi';
import { PlacementExercise } from './PlacementExercise';
import { usePlacementTest } from './usePlacementTest';

const copy = PLACEMENT_COPY.test;

export interface PlacementTestProps {
  started: StartedPlacement;
  /** The last item was answered: open the result. */
  onFinished: (testId: string) => Promise<void>;
  /** Leaving before the end; the answers are lost. */
  onQuit: () => void;
  /** Starts a new test after this one broke off (e.g. replaced by a test started elsewhere). */
  onRestart: () => void;
  restarting: boolean;
}

/** The adaptive placement test: one item per screen, no verdict, at most `maxItems`. */
export function PlacementTest({
  started,
  onFinished,
  onQuit,
  onRestart,
  restarting,
}: PlacementTestProps) {
  const test = usePlacementTest(started, onFinished);
  const [quitOpen, setQuitOpen] = useState(false);
  const { step, failure } = test;
  useEscapeKey(!quitOpen && !test.finished, () => setQuitOpen(true));

  if (test.finished) return <WaitingScreen label={PLACEMENT_COPY.reveal.loading} />;
  if (failure === 'broken') {
    return (
      <FailureScreen
        title={copy.broken.title}
        text={copy.broken.text}
        retry={{ label: copy.broken.restart, onRetry: onRestart, retrying: restarting }}
        backLabel={copy.failure.back}
        onBack={onQuit}
      />
    );
  }

  return (
    <FocusScreen
      header={
        <>
          <IconButton
            icon={XIcon}
            label={copy.close}
            variant="ghost"
            onClick={() => setQuitOpen(true)}
          />
          <ProgressBar
            label={copy.progressLabel}
            value={test.answered}
            max={test.maxItems}
            valueText={copy.progressValue(step.position, test.maxItems)}
          />
          <span
            aria-hidden="true"
            className="shrink-0 text-label font-black text-fg-muted tabular-nums"
          >
            {copy.counter(step.position, test.maxItems)}
          </span>
        </>
      }
    >
      <PlacementExercise
        key={step.position}
        exercise={step.exercise}
        shuffleSeed={seedFrom(`${started.testId}:${step.exercise.id}`)}
        onSubmit={test.submit}
        sending={test.sending}
        sendFailed={failure === 'retryable'}
        keyboardEnabled={!quitOpen}
      />
      <ConfirmDialog
        open={quitOpen}
        title={copy.quit.title}
        text={copy.quit.text}
        cancelLabel={copy.quit.stay}
        confirmLabel={copy.quit.leave}
        confirmVariant="ghost"
        onCancel={() => setQuitOpen(false)}
        onConfirm={onQuit}
      />
    </FocusScreen>
  );
}
