import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { isLevel } from '../../app/learnerStats';
import { FailureScreen } from '../../components/ui/FailureScreen';
import { LESSON_COPY } from '../lesson/copy';
import { LessonRunner, type LessonStartFailure } from '../lesson/LessonRunner';
import { startCheckpoint } from './checkpointApi';
import { CHECKPOINT_COPY } from './copy';

const copy = CHECKPOINT_COPY.failure;

const FAILURE: LessonStartFailure = {
  title: copy.title,
  text: (error) => {
    if (isApiError(error, 'checkpoint_locked')) return copy.locked;
    if (isApiError(error, 'checkpoint_passed')) return copy.passed;
    if (isApiError(error, 'checkpoint_not_found')) return copy.notFound;
    return LESSON_COPY.failure.network;
  },
  backLabel: copy.back,
};

/** Route `/checkpoint/:level`: the test at the end of a stage, played like a lesson. */
export function CheckpointPage() {
  const { level = '' } = useParams();
  const navigate = useNavigate();

  if (!isLevel(level)) {
    return (
      <FailureScreen
        title={copy.title}
        text={copy.notFound}
        backLabel={copy.back}
        onBack={() => void navigate('/', { replace: true })}
      />
    );
  }
  return (
    <LessonRunner
      lessonKey={['checkpoint', level]}
      start={() => startCheckpoint(level)}
      exitTo="/"
      failure={FAILURE}
    />
  );
}
