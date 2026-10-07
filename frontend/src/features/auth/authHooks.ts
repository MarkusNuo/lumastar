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
import { onUnauthorized } from '../../api/unauthorized';
import { call, type AuthStatus, type Me, type RegisterRequest } from './interimApi';

export const authStatusQuery = queryOptions({
  queryKey: ['auth', 'status'],
  queryFn: () => call<AuthStatus>('GET', '/api/auth/status'),
  // Only changes through sign-in, registration, sign-out or a 401; each of them refreshes it.
  staleTime: Infinity,
});

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => call<Me>('GET', '/api/me'),
});

export function useAuthStatus() {
  return useQuery(authStatusQuery);
}

export function useMe() {
  return useQuery(meQuery);
}

export interface Credentials {
  email: string;
  password: string;
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
      onSignedIn?.(variables);
      return queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
    },
  });
}

export function useLogin() {
  return useSignIn((credentials: Credentials) => call('POST', '/api/auth/login', credentials));
}

/** The account of the former single-user version signs in with its password alone. */
export function useLegacyLogin() {
  return useSignIn((password: string) => call('POST', '/api/auth/login', { password }));
}

/** Creates the account and signs in; the verification mail is on its way. */
export function useRegister(onCreated: (request: RegisterRequest) => void) {
  return useSignIn(
    (request: RegisterRequest) => call('POST', '/api/auth/register', request),
    onCreated,
  );
}

/** Forgets everything of the session except the auth status, which turns to signed out. */
export function endSession(queryClient: QueryClient): void {
  queryClient.setQueryData(
    authStatusQuery.queryKey,
    (status) => status && { ...status, authenticated: false, displayName: undefined },
  );
  queryClient.removeQueries({
    predicate: (query) => !matchQuery({ queryKey: authStatusQuery.queryKey }, query),
  });
  // Registration mode and legacy sign-in may have changed while signed in.
  void queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await call('POST', '/api/auth/logout');
      } catch (error) {
        // An expired session is signed out already, which is what the user asked for.
        if (!isApiError(error) || error.status !== 401) throw error;
      }
    },
    onSuccess: () => endSession(queryClient),
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
