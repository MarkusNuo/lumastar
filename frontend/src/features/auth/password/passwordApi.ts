import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authStatusQuery } from '../authHooks';
import { call } from '../interimApi';

/** Asks for a reset link; the server answers the same whether the address has an account or not. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => call('POST', '/api/auth/password-reset', { email }),
  });
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

/** Sets the new password of the link's account; works without a session. */
export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reset: PasswordReset) => call('POST', '/api/auth/password-reset/confirm', reset),
    // A reset may end the sessions of the account, this one included.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey }),
  });
}
