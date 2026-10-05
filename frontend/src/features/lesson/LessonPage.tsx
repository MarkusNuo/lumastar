import { useParams } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { LESSON_COPY } from './copy';
import { startLesson } from './lessonApi';
import { LessonRunner, type LessonStartFailure } from './LessonRunner';

const copy = LESSON_COPY.failure;

const FAILURE: LessonStartFailure = {
  title: copy.title,
  text: (error) => {
    if (isApiError(error, 'unit_without_content')) return copy.noContent;
    if (isApiError(error, 'unit_not_found')) return copy.unknownUnit;
    return copy.network;
  },
  backLabel: copy.back,
};

/** Route `/lesson/:unitId`: a lesson of a curriculum unit or of a focus unit of the plan. */
export function LessonPage() {
  const { unitId = '' } = useParams();
  return (
    <LessonRunner
      lessonKey={['unit', unitId]}
      start={() => startLesson(unitId)}
      exitTo="/"
      failure={FAILURE}
    />
  );
}
