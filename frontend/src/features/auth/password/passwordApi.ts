import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import type { PasswordReset } from '../../../api/types';
import { authStatusQuery } from '../authHooks';

/** Asks for a reset link; the server answers the same whether the address has an account or not. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.POST('/api/auth/password-reset', { body: { email } });
    },
  });
}

/** Sets the new password of the link's account; works without a session. */
export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reset: PasswordReset) => {
      await api.POST('/api/auth/password-reset/confirm', { body: reset });
    },
    // A reset may end the sessions of the account, this one included.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey }),
  });
}
