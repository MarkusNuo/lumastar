import { isApiError } from '../../api/ApiError';
import { LESSON_COPY } from '../lesson/copy';
import { LessonRunner, type LessonStartFailure } from '../lesson/LessonRunner';
import { REVIEW_COPY } from './copy';
import { startReviewLesson } from './reviewApi';
import { REVIEW_ROUTES } from './reviewRoutes';

const copy = REVIEW_COPY.lesson;

const FAILURE: LessonStartFailure = {
  title: copy.failureTitle,
  text: (error) =>
    isApiError(error, 'no_reviews_due') ? copy.nothingDue : LESSON_COPY.failure.network,
  backLabel: copy.back,
};

/** Route `/wiederholen/lektion`: a lesson of the most overdue items, then back to the tab. */
export function ReviewLessonPage() {
  return (
    <LessonRunner
      lessonKey={['review']}
      start={startReviewLesson}
      exitTo={REVIEW_ROUTES.home}
      failure={FAILURE}
    />
  );
}
