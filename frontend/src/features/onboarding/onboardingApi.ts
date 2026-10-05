import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { OnboardingRequest } from '../../api/types';
import { meQuery } from '../auth/authHooks';

export const onboardingOptionsQuery = queryOptions({
  queryKey: ['onboarding', 'options'],
  queryFn: () => unwrap(api.GET('/api/onboarding/options')),
  // The options and their labels only change with a new server release.
  staleTime: Infinity,
});

export function useAnswerOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: OnboardingRequest) =>
      unwrap(api.PUT('/api/onboarding', { body: request })),
    // The guards follow the onboarding step of the profile, so it has to be fresh before moving on.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQuery.queryKey }),
  });
}
