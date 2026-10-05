import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { FailureScreen } from '../../components/ui/FailureScreen';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { meQuery } from '../auth/authHooks';
import { PLAN_QUERY_KEY } from '../plan/planQueries';
import { LESSON_COPY } from './copy';
import { startLesson } from './lessonApi';
import { LessonPlayer } from './LessonPlayer';

const copy = LESSON_COPY.failure;

/** Every visit starts a new lesson, so a finished or abandoned one is never shown again. */
function lessonQuery(unitId: string) {
  return queryOptions({
    queryKey: ['lesson', unitId],
    queryFn: () => startLesson(unitId),
    staleTime: Infinity,
    gcTime: 0,
  });
}

function failureText(error: Error): string {
  if (isApiError(error, 'unit_without_content')) return copy.noContent;
  if (isApiError(error, 'unit_not_found')) return copy.unknownUnit;
  return copy.network;
}

/** Route `/lesson/:unitId`: loads the whole lesson up front, then plays it without waiting. */
export function LessonPage() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lesson = useQuery(lessonQuery(unitId));

  const backToPath = () => void navigate('/', { replace: true });

  if (lesson.data) {
    return (
      <LessonPlayer
        lesson={lesson.data}
        onQuit={backToPath}
        onFinish={() => {
          // The top bar shows the new XP total, the path the completed lesson.
          void queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
          void queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
          backToPath();
        }}
      />
    );
  }

  if (!lesson.isError) return <WaitingScreen label={LESSON_COPY.loading} />;

  const retryable = !isApiError(lesson.error) || lesson.error.isTransient;
  return (
    <FailureScreen
      title={copy.title}
      text={failureText(lesson.error)}
      retry={
        retryable
          ? { label: copy.retry, onRetry: () => void lesson.refetch(), retrying: lesson.isFetching }
          : undefined
      }
      backLabel={copy.back}
      onBack={backToPath}
    />
  );
}
