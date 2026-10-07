import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { pathQuery } from '../plan/planQueries';
import { PATH_COPY } from './copy';
import { buildLearningPath, nextLessonUnit } from './learningPath';
import { lessonRoute } from './lessonRoute';

/**
 * Route `/weiter` ("Jetzt üben" on a reminder): straight into the plan's next lesson. Without one
 * (a checkpoint is next, or the plan could not load) the learning path shows what comes next.
 */
export function NextLessonPage() {
  const path = useQuery(pathQuery);

  if (path.isError) return <Navigate to="/" replace />;
  if (!path.data) return <WaitingScreen label={PATH_COPY.loading} />;
  const unitId = nextLessonUnit(buildLearningPath(path.data));
  return <Navigate to={unitId ? lessonRoute(unitId) : '/'} replace />;
}
