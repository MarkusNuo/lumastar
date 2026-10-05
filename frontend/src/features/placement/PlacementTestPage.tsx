import { queryOptions, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { isApiError } from '../../api/ApiError';
import { FailureScreen } from '../../components/ui/FailureScreen';
import { WaitingScreen } from '../../components/ui/WaitingScreen';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { PLACEMENT_COPY } from './copy';
import { startPlacement } from './placementApi';
import { PlacementTest } from './PlacementTest';
import { useOpenPlacementResult } from './useOpenPlacementResult';

const copy = PLACEMENT_COPY.test;

/** Every visit starts a new test; the backend abandons an unfinished one (PRD F2). */
const placementStartQuery = queryOptions({
  queryKey: ['placement', 'test'],
  queryFn: startPlacement,
  staleTime: Infinity,
  gcTime: 0,
});

/** Route `/einstufung/test`. */
export function PlacementTestPage() {
  const navigate = useNavigate();
  const openResult = useOpenPlacementResult();
  const start = useQuery(placementStartQuery);
  const backToIntro = () => void navigate(ONBOARDING_ROUTES.placementIntro, { replace: true });

  if (start.data) {
    return (
      <PlacementTest
        key={start.data.testId}
        started={start.data}
        onFinished={openResult}
        onQuit={backToIntro}
        onRestart={() => void start.refetch()}
        restarting={start.isFetching}
      />
    );
  }
  if (!start.isError) return <WaitingScreen label={copy.loading} />;

  const unavailable = isApiError(start.error, 'placement_unavailable');
  return (
    <FailureScreen
      title={copy.failure.title}
      text={unavailable ? copy.failure.unavailable : copy.failure.network}
      retry={
        unavailable
          ? undefined
          : {
              label: copy.failure.retry,
              onRetry: () => void start.refetch(),
              retrying: start.isFetching,
            }
      }
      backLabel={copy.failure.back}
      onBack={backToIntro}
    />
  );
}
