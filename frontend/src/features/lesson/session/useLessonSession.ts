import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { isApiError } from '../../../api/ApiError';
import { onLessonCompleted } from '../../reminders/reminderLifecycle';
import { precheck } from '../evaluation/precheck';
import type { StandardFormLexicon } from '../evaluation/standardFormLexicon';
import { completeLesson, submitAttempt } from '../lessonApi';
import type { Answer, Lesson, LessonResult } from '../model';
import { refreshLearnerData } from '../refreshLearnerData';
import { AttemptOutbox } from './attemptOutbox';
import {
  correctStreak,
  createLessonQueue,
  currentEntry,
  firstAttemptSummary,
  lessonPhase,
  lessonProgress,
  lessonQueueReducer,
  type LessonQueueState,
} from './lessonQueue';

/** How long the end of the lesson waits for answers that are still being sent. */
const FLUSH_TIMEOUT_MS = 6000;
const COMPLETE_RETRIES = 2;

export type LessonCompletion =
  | { status: 'playing' }
  | { status: 'saving' }
  | { status: 'finished'; result: LessonResult; retrySave: () => void; retrying: boolean };

/**
 * Runs one lesson: instant pre-check, answers sent in the background, repetition of wrong answers
 * and the final result. Nothing waits for the network while the learner plays.
 */
export function useLessonSession(lesson: Lesson, lexicon: StandardFormLexicon) {
  const [state, dispatch] = useReducer(lessonQueueReducer, lesson, createLessonQueue);
  const latest = useRef(state);
  const outboxRef = useRef<AttemptOutbox | null>(null);
  const checkedKeys = useRef(new Set<number>());
  const shownAt = useRef(0);

  useLayoutEffect(() => {
    latest.current = state;
  });

  const { sessionId } = lesson;
  useEffect(() => {
    const outbox = new AttemptOutbox(
      (submission) => submitAttempt(sessionId, submission),
      (key, verdict) => dispatch({ type: 'serverVerdict', key, verdict }),
    );
    outboxRef.current = outbox;
    return () => outbox.dispose();
  }, [sessionId]);

  const entry = currentEntry(state);
  const entryKey = entry?.key;
  useLayoutEffect(() => {
    shownAt.current = performance.now();
  }, [entryKey]);

  const check = useCallback(
    (answer: Answer) => {
      const shown = currentEntry(latest.current);
      // A double Enter must not send the same answer twice.
      if (!shown || shown.verdict || checkedKeys.current.has(shown.key)) return;
      checkedKeys.current.add(shown.key);
      dispatch({ type: 'checked', verdict: precheck(shown.exercise, answer, lexicon) });
      outboxRef.current?.enqueue(shown.key, {
        exerciseId: shown.exercise.id,
        answer,
        responseTimeMs: Math.round(performance.now() - shownAt.current),
      });
    },
    [lexicon],
  );

  const proceed = useCallback(() => dispatch({ type: 'continued' }), []);

  const readyToSave = useReadyToSave(state, outboxRef);
  useEffect(() => {
    if (readyToSave) dispatch({ type: 'finalized' });
  }, [readyToSave]);
  const completion = useCompletion(state, readyToSave, outboxRef, lesson);

  return {
    entry,
    phase: lessonPhase(state),
    progress: lessonProgress(state),
    streak: correctStreak(state),
    check,
    proceed,
    completion,
  };
}

/**
 * True once every exercise is answered and the backend evaluated all answers (or they could not
 * be sent in time). A late verdict can still queue a repetition until then.
 */
function useReadyToSave(state: LessonQueueState, outboxRef: RefObject<AttemptOutbox | null>) {
  const done = lessonPhase(state) === 'done';
  const entryCount = state.entries.length;
  // The entry count this readiness was determined for; a new repetition invalidates it.
  const [readyFor, setReadyFor] = useState<number>();

  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    const outbox = outboxRef.current;
    outbox?.retryNow();
    void (outbox?.whenIdle(FLUSH_TIMEOUT_MS) ?? Promise.resolve()).then(() => {
      if (!cancelled) setReadyFor(entryCount);
    });
    return () => {
      cancelled = true;
    };
  }, [done, entryCount, outboxRef]);

  return done && readyFor === entryCount;
}

function useCompletion(
  state: LessonQueueState,
  readyToSave: boolean,
  outboxRef: RefObject<AttemptOutbox | null>,
  { sessionId, kind }: Lesson,
): LessonCompletion {
  const queryClient = useQueryClient();
  const [startedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState(startedAt);
  const [waitingForAnswers, setWaitingForAnswers] = useState(false);

  const result = useQuery({
    queryKey: ['lessonResult', sessionId],
    queryFn: () => {
      setFinishedAt(Date.now());
      return completeLesson(sessionId);
    },
    enabled: readyToSave,
    staleTime: Infinity,
    gcTime: 0,
    retry: (failures, error) =>
      failures < COMPLETE_RETRIES && isApiError(error) && error.isTransient,
  });

  const saved = result.data;
  useEffect(() => {
    if (!saved) return;
    refreshLearnerData(queryClient, saved);
    onLessonCompleted();
  }, [queryClient, saved]);

  if (!readyToSave) return { status: lessonPhase(state) === 'done' ? 'saving' : 'playing' };
  if (result.data) {
    return { status: 'finished', result: result.data, retrySave: () => undefined, retrying: false };
  }
  if (!result.isError) return { status: 'saving' };

  const retrySave = () => {
    const outbox = outboxRef.current;
    setWaitingForAnswers(true);
    outbox?.retryNow();
    void (outbox?.whenIdle(FLUSH_TIMEOUT_MS) ?? Promise.resolve()).then(async () => {
      setWaitingForAnswers(false);
      await result.refetch();
    });
  };
  return {
    status: 'finished',
    result: localResult(state, kind, finishedAt - startedAt),
    retrySave,
    retrying: waitingForAnswers || result.isFetching,
  };
}

/** What the device knows when the backend could not save the lesson: no XP, no word list. */
function localResult(
  state: LessonQueueState,
  kind: Lesson['kind'],
  durationMs: number,
): LessonResult {
  const { exerciseCount, correctCount } = firstAttemptSummary(state);
  return {
    kind,
    accuracy: exerciseCount > 0 ? correctCount / exerciseCount : 0,
    correctCount,
    exerciseCount,
    durationMs,
    learnedItems: [],
    saved: false,
  };
}
