import {
  matchQuery,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { isApiError } from '../../api/ApiError';
import { api, unwrap } from '../../api/client';
import type { LoginRequest, RegisterRequest } from '../../api/types';
import { onUnauthorized } from '../../api/unauthorized';
import { useVerificationBannerDismissed } from '../account/verification/bannerDismissed';
import { useResendCooldown } from '../account/verification/resendCooldown';
import { useReminderNudge } from '../reminders/nudgeStore';
import { signOutReleasingDevice } from '../reminders/reminderLifecycle';

export const authStatusQuery = queryOptions({
  queryKey: ['auth', 'status'],
  queryFn: () => unwrap(api.GET('/api/auth/status')),
  // Only changes through sign-in, registration, sign-out or a 401; each of them refreshes it.
  staleTime: Infinity,
});

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => unwrap(api.GET('/api/me')),
});

export function useAuthStatus() {
  return useQuery(authStatusQuery);
}

export function useMe() {
  return useQuery(meQuery);
}

/** For the public screens, which work with and without a session. */
export function useSignedIn(): boolean {
  return useAuthStatus().data?.authenticated === true;
}

/** The sign-in with an address; only the former single-user account signs in without one. */
export type Credentials = Required<LoginRequest>;

/**
 * Forgets everything the client keeps of a learner but the auth status: the cached server data and
 * the per-account UI state. Device settings such as sound and vibration stay. Without it, whoever
 * signs in next on this page would see the previous learner's profile until it is refetched.
 */
export function forgetLearner(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => !matchQuery({ queryKey: authStatusQuery.queryKey }, query),
  });
  useVerificationBannerDismissed.getState().reset();
  useResendCooldown.getState().reset();
  useReminderNudge.getState().reset();
}

/**
 * Signs in and keeps the mutation pending until the guards can leave the sign-in screen, which
 * unmounts it: whatever should happen on success therefore runs in `onSignedIn`, before that.
 */
function useSignIn<Variables>(
  request: (variables: Variables) => Promise<unknown>,
  onSignedIn?: (variables: Variables) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: Variables) => {
      await request(variables);
    },
    onSuccess: (_, variables) => {
      // A session that ended elsewhere may have left data behind that no status change cleared.
      forgetLearner(queryClient);
      onSignedIn?.(variables);
      return queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
    },
  });
}

export function useLogin() {
  return useSignIn((credentials: Credentials) =>
    api.POST('/api/auth/login', { body: credentials }),
  );
}

/** The account of the former single-user version signs in with its password alone. */
export function useLegacyLogin() {
  return useSignIn((password: string) => api.POST('/api/auth/login', { body: { password } }));
}

/** Creates the account and signs in; the verification mail is on its way. */
export function useRegister(onCreated: (request: RegisterRequest) => void) {
  return useSignIn(
    (request: RegisterRequest) => api.POST('/api/auth/register', { body: request }),
    onCreated,
  );
}

/** Forgets everything of the session except the auth status, which turns to signed out. */
export function endSession(queryClient: QueryClient): void {
  queryClient.setQueryData(
    authStatusQuery.queryKey,
    (status) => status && { ...status, authenticated: false, displayName: undefined },
  );
  forgetLearner(queryClient);
  // Registration mode and legacy sign-in may have changed while signed in.
  void queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      signOutReleasingDevice(async () => {
        try {
          await api.POST('/api/auth/logout');
        } catch (error) {
          // An expired session is signed out already, which is what the user asked for.
          if (!isApiError(error) || error.status !== 401) throw error;
        }
      }),
    onSuccess: () => endSession(queryClient),
  });
}

/**
 * However the session ended (sign-out, a 401, a status loaded without one), nothing of the learner
 * stays for whoever signs in next on this page.
 */
export function useForgetLearnerWhenSignedOut(authenticated: boolean | undefined): void {
  const queryClient = useQueryClient();

  // An effect, so the signed-in screens are gone before their data is: they would refetch it.
  useEffect(() => {
    if (authenticated === false) forgetLearner(queryClient);
  }, [authenticated, queryClient]);
}

/** A 401 while the app believes it is signed in means the session ended: re-check the status. */
export function useRefreshAuthOnUnauthorized(): void {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onUnauthorized(() => {
        if (queryClient.getQueryData(authStatusQuery.queryKey)?.authenticated) {
          void queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
        }
      }),
    [queryClient],
  );
}
