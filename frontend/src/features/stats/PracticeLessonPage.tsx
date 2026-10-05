import { useParams } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { LESSON_COPY } from '../lesson/copy';
import { LessonRunner, type LessonStartFailure } from '../lesson/LessonRunner';
import { STATS_COPY } from './copy';
import { startPracticeLesson } from './statsApi';
import { STATS_ROUTES } from './statsRoutes';

const copy = STATS_COPY.practice;

const FAILURE: LessonStartFailure = {
  title: copy.failureTitle,
  text: (error) => {
    if (isApiError(error, 'no_practice_exercises')) return copy.noExercises;
    if (isApiError(error) && !error.isTransient) return copy.unknownSkill;
    return LESSON_COPY.failure.network;
  },
  backLabel: copy.back,
};

/** Route `/statistik/ueben/:skillTag`: "Gezielt üben" on one skill tag, then back to the tab. */
export function PracticeLessonPage() {
  const { skillTag = '' } = useParams();
  return (
    <LessonRunner
      lessonKey={['practice', skillTag]}
      start={() => startPracticeLesson(skillTag)}
      exitTo={STATS_ROUTES.home}
      failure={FAILURE}
    />
  );
}
