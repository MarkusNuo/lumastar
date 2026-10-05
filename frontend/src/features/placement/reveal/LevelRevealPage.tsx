import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../../api/ApiError';
import { FailureScreen } from '../../../components/ui/FailureScreen';
import { WaitingScreen } from '../../../components/ui/WaitingScreen';
import { ONBOARDING_ROUTES } from '../../onboarding/onboardingRoutes';
import { PLACEMENT_COPY } from '../copy';
import { placementResultQuery } from '../placementApi';
import { LevelReveal } from './LevelReveal';

const copy = PLACEMENT_COPY.reveal;

/** Route `/einstufung/ergebnis/:testId`: the reveal, then the plan (PRD 6). */
export function LevelRevealPage() {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const result = useQuery(placementResultQuery(testId));

  if (result.data) {
    return (
      <LevelReveal
        result={result.data}
        onContinue={() => void navigate(ONBOARDING_ROUTES.plan, { replace: true })}
      />
    );
  }
  if (!result.isError) return <WaitingScreen label={copy.loading} />;

  const retryable = !isApiError(result.error) || result.error.isTransient;
  return (
    <FailureScreen
      title={copy.loadFailed}
      text={retryable ? copy.network : copy.unknownTest}
      retry={
        retryable
          ? { label: copy.retry, onRetry: () => void result.refetch(), retrying: result.isFetching }
          : undefined
      }
      backLabel={copy.back}
      onBack={() => void navigate(ONBOARDING_ROUTES.home, { replace: true })}
    />
  );
}
