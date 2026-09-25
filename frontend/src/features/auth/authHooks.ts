import {
  matchQuery,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { isApiError } from '../../api/ApiError';
import { api, unwrap } from '../../api/client';
import type { AuthStatus, SetupRequest } from '../../api/types';
import { onUnauthorized } from '../../api/unauthorized';

export const authStatusQuery = queryOptions({
  queryKey: ['auth', 'status'],
  queryFn: () => unwrap(api.GET('/api/auth/status')),
  // Only changes through setup, login, logout or a 401, and each of those refreshes it explicitly.
  staleTime: Infinity,
});

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => unwrap(api.GET('/api/me')),
});

const SIGNED_OUT: AuthStatus = { authenticated: false, setupRequired: false };

export function useAuthStatus() {
  return useQuery(authStatusQuery);
}

export function useMe() {
  return useQuery(meQuery);
}

export function useSetupAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SetupRequest) => unwrap(api.POST('/api/auth/setup', { body: request })),
    onSuccess: (profile) => {
      queryClient.setQueryData(meQuery.queryKey, profile);
      queryClient.setQueryData(authStatusQuery.queryKey, {
        authenticated: true,
        setupRequired: false,
        displayName: profile.displayName,
      });
    },
    onError: (error) => {
      // Someone else finished the setup in the meantime: the refreshed status leads to the login.
      if (isApiError(error, 'account_exists')) {
        void queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.POST('/api/auth/login', { body: { password } });
    },
    // Returning the refetch keeps the mutation pending until the guards can leave the login screen.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.POST('/api/auth/logout');
      } catch (error) {
        // An expired session is signed out already, which is what the user asked for.
        if (!isApiError(error) || error.status !== 401) throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(authStatusQuery.queryKey, SIGNED_OUT);
      queryClient.removeQueries({
        predicate: (query) => !matchQuery({ queryKey: authStatusQuery.queryKey }, query),
      });
    },
  });
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
