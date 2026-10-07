import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authStatusQuery, endSession, meQuery } from '../auth/authHooks';
import { call, type Account } from '../auth/interimApi';

export const accountQuery = queryOptions({
  queryKey: ['account'],
  queryFn: () => call<Account>('GET', '/api/account'),
});

/** Name, address and verification show in the account, the profile and the auth status alike. */
export function refreshAccount(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    [accountQuery.queryKey, meQuery.queryKey, authStatusQuery.queryKey].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

function useAccountChange<Variables, Result>(
  request: (variables: Variables) => Promise<Result>,
  onChanged?: (result: Result) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (result) => {
      onChanged?.(result);
      return refreshAccount(queryClient);
    },
  });
}

export function useChangeDisplayName() {
  return useAccountChange((displayName: string) =>
    call<Account>('PUT', '/api/account/display-name', { displayName }),
  );
}

export interface EmailChange {
  newEmail: string;
  password: string;
}

/**
 * A confirmed address stays until the link mailed to the new one is opened (`pendingEmail`); an
 * unconfirmed or missing one is replaced at once. The current address cancels a pending change.
 * `onChanged` runs before the refresh, which may let a guard leave the screen.
 */
export function useChangeEmail(onChanged?: (account: Account) => void) {
  return useAccountChange(
    (change: EmailChange) => call<Account>('PUT', '/api/account/email', change),
    onChanged,
  );
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/** Ends the account's other sessions; this one stays signed in. */
export function useChangePassword() {
  return useAccountChange((change: PasswordChange) => call('PUT', '/api/account/password', change));
}

/**
 * Deletes the account with all learning data. The session ends with it and the guards leave the
 * screen at once, so `onDeleted` runs before that.
 */
export function useDeleteAccount(onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await call('DELETE', '/api/account', { password });
    },
    onSuccess: () => {
      onDeleted();
      endSession(queryClient);
    },
  });
}
