import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { PlacementResult } from '../../api/types';
import { meQuery } from '../auth/authHooks';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { PLAN_QUERY_KEY } from '../plan/planQueries';
import { placementResultQuery } from './placementApi';

/**
 * After a finished or skipped test: fresh profile and plan, then the level reveal. A result that
 * is known already (a skip answers with it) is shown without loading it again.
 */
export function useOpenPlacementResult(): (
  testId: string,
  known?: PlacementResult,
) => Promise<void> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async (testId, known) => {
    if (known) queryClient.setQueryData(placementResultQuery(testId).queryKey, known);
    // Placing sets the level, completes the onboarding and (re)creates the plan.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: meQuery.queryKey }),
      // Also the plan queries no screen shows right now, so the plan after the reveal is the new one.
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY, refetchType: 'all' }),
    ]);
    await navigate(ONBOARDING_ROUTES.placementResult(testId), { replace: true });
  };
}
