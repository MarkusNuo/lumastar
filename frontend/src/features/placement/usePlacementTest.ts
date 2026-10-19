import { useMutation } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { isApiError } from '../../api/ApiError';
import type { Answer } from '../lesson/model';
import {
  answerPlacementItem,
  type PlacementProgress,
  type PlacementStep,
  type StartedPlacement,
} from './placementApi';

/** Network trouble can be retried with the same answer; anything else ends this test. */
export type PlacementFailure = 'retryable' | 'broken';

export interface PlacementTestState {
  step: PlacementStep;
  /** Items answered so far; drives the progress bar. */
  answered: number;
  maxItems: number;
  submit: (answer: Answer) => void;
  /** The answer is on its way; the item is read-only meanwhile. */
  sending: boolean;
  /** The last item was answered and the result is being opened. */
  finished: boolean;
  failure: PlacementFailure | undefined;
}

/**
 * Runs one placement test: every answer goes to the backend, which picks the next item.
 * The test gives no verdict, so the learner just moves on.
 */
export function usePlacementTest(
  started: StartedPlacement,
  onFinished: (testId: string) => Promise<void>,
): PlacementTestState {
  const { testId, maxItems } = started;
  const [step, setStep] = useState<PlacementStep>(started);
  const [finished, setFinished] = useState(false);
  const shownAt = useRef(0);

  useLayoutEffect(() => {
    shownAt.current = performance.now();
  }, [step]);

  const answer = useMutation({
    mutationFn: (submitted: Answer) =>
      answerPlacementItem(
        testId,
        step.exercise.id,
        submitted,
        Math.round(performance.now() - shownAt.current),
      ),
    onSuccess: (progress: PlacementProgress) => {
      if (!progress.finished) {
        setStep(progress.next);
        return;
      }
      setFinished(true);
      return onFinished(testId);
    },
  });

  const failure: PlacementFailure | undefined = !answer.isError
    ? undefined
    : isApiError(answer.error) && !answer.error.isTransient
      ? 'broken'
      : 'retryable';

  return {
    step,
    answered: step.position - 1,
    maxItems,
    submit: (submitted) => {
      if (!answer.isPending && !finished) answer.mutate(submitted);
    },
    sending: answer.isPending,
    finished,
    failure,
  };
}
