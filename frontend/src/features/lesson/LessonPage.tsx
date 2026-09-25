import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { Button } from '../../components/ui/Button';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { Mascot } from '../../components/ui/Mascot';
import { meQuery } from '../auth/authHooks';
import { LESSON_COPY } from './copy';
import { startLesson } from './lessonApi';
import { LessonPlayer } from './LessonPlayer';
import { LessonStatusScreen } from './LessonStatusScreen';

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
          // The top bar shows the new XP total.
          void queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
          backToPath();
        }}
      />
    );
  }

  if (!lesson.isError) return <LessonStatusScreen label={LESSON_COPY.loading} />;

  const retryable = !isApiError(lesson.error) || lesson.error.isTransient;
  return (
    <FocusScreen
      className="items-center justify-center gap-4 text-center"
      footer={
        <div className="flex flex-col gap-3">
          {retryable && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={ArrowClockwiseIcon}
              loading={lesson.isFetching}
              onClick={() => void lesson.refetch()}
            >
              {copy.retry}
            </Button>
          )}
          <Button
            variant={retryable ? 'ghost' : 'primary'}
            size="lg"
            fullWidth
            onClick={backToPath}
          >
            {copy.back}
          </Button>
        </div>
      }
    >
      <Mascot expression="sad" size="xl" />
      <h1 className="text-headline font-black">{copy.title}</h1>
      <p className="max-w-xs text-body text-fg-muted">{failureText(lesson.error)}</p>
    </FocusScreen>
  );
}
