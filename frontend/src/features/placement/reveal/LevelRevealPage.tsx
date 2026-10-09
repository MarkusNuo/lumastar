import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../../api/ApiError';
import { FailureScreen } from '../../../components/ui/FailureScreen';
import { WaitingScreen } from '../../../components/ui/WaitingScreen';
import { WithStreakCelebration } from '../../streak/celebration/StreakCelebration';
import { ONBOARDING_ROUTES } from '../../onboarding/onboardingRoutes';
import { PLACEMENT_COPY } from '../copy';
import { placementResultQuery } from '../placementApi';
import { LevelReveal } from './LevelReveal';

const copy = PLACEMENT_COPY.reveal;

/**
 * Route `/einstufung/ergebnis/:testId`: the reveal, then the plan (PRD 6). A test that met today's
 * goal counts like a lesson, so the streak flame follows the reveal.
 */
export function LevelRevealPage() {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const result = useQuery(placementResultQuery(testId));
  const placed = result.data;

  if (placed) {
    const openPlan = () => void navigate(ONBOARDING_ROUTES.plan, { replace: true });
    return (
      <WithStreakCelebration dailyGoal={placed.dailyGoal} streak={placed.streak}>
        {(celebrateThen) => (
          <LevelReveal result={placed} onContinue={() => celebrateThen(openPlan)} />
        )}
      </WithStreakCelebration>
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
