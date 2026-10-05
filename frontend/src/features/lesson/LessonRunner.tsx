import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { FailureScreen } from '../../components/ui/FailureScreen';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { lessonRoute } from '../path/lessonRoute';
import { LESSON_COPY } from './copy';
import { EMPTY_LEXICON } from './evaluation/standardFormLexicon';
import { standardFormsQuery } from './lessonApi';
import { LessonPlayer } from './LessonPlayer';
import type { Lesson } from './model';

export interface LessonStartFailure {
  title: string;
  /** Why the start failed, e.g. a unit without exercises or nothing due. */
  text: (error: Error) => string;
  backLabel: string;
}

export interface LessonRunnerProps {
  /** Identifies the lesson to start; a new key starts a new lesson. */
  lessonKey: QueryKey;
  start: () => Promise<Lesson>;
  /** Where the learner goes after the lesson or when leaving it. */
  exitTo: string;
  failure: LessonStartFailure;
}

/**
 * Starts a lesson of any kind (unit, focus, review, checkpoint), loads it whole up front and plays
 * it without waiting. Every visit starts a new one, so a finished or abandoned lesson never returns.
 */
export function LessonRunner({ lessonKey, start, exitTo, failure }: LessonRunnerProps) {
  const navigate = useNavigate();
  const lesson = useQuery({
    queryKey: ['lesson', ...lessonKey],
    queryFn: start,
    staleTime: Infinity,
    gcTime: 0,
  });
  const lexicon = useQuery(standardFormsQuery);
  // Without the lexicon the pre-check misses Standard forms, but the backend's verdict still has them.
  const lexiconSettled = lexicon.data !== undefined || lexicon.isError;

  const exit = () => void navigate(exitTo, { replace: true });

  if (lesson.data && lexiconSettled) {
    return (
      <LessonPlayer
        key={lesson.data.sessionId}
        lesson={lesson.data}
        lexicon={lexicon.data ?? EMPTY_LEXICON}
        onQuit={exit}
        onFinish={exit}
        onStartFocus={(unitId) => void navigate(lessonRoute(unitId), { replace: true })}
      />
    );
  }

  if (!lesson.isError) return <WaitingScreen label={LESSON_COPY.loading} />;

  const retryable = !isApiError(lesson.error) || lesson.error.isTransient;
  return (
    <FailureScreen
      title={failure.title}
      text={failure.text(lesson.error)}
      retry={
        retryable
          ? {
              label: LESSON_COPY.failure.retry,
              onRetry: () => void lesson.refetch(),
              retrying: lesson.isFetching,
            }
          : undefined
      }
      backLabel={failure.backLabel}
      onBack={exit}
    />
  );
}
