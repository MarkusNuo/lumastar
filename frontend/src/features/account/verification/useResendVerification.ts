import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '../../../api/ApiError';
import { showToast } from '../../../components/ui/toastStore';
import { formatClock } from '../../../lib/formatClock';
import { throttleSeconds } from '../../auth/authProblems';
import { call } from '../../auth/interimApi';
import { refreshAccount } from '../accountApi';
import { ACCOUNT_COPY } from '../copy';
import { useResendCooldown } from './resendCooldown';

const ALREADY_VERIFIED = 'email_already_verified';

/** Matches the backend's throttle, so the button rarely runs into a 429. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** "Link erneut senden": a new verification mail for the signed-in account, then a cooldown. */
export function useResendVerification() {
  const secondsLeft = useResendCooldown((state) => state.secondsLeft);
  const startCooldown = useResendCooldown((state) => state.start);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => call('POST', '/api/auth/verify-email/resend'),
    onSuccess: () => {
      startCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(ACCOUNT_COPY.verification.sent);
    },
    onError: (error) => {
      const wait = throttleSeconds(error);
      if (wait !== undefined) startCooldown(wait);
      // Confirmed meanwhile, e.g. in another tab: the reminders can go.
      if (isApiError(error, ALREADY_VERIFIED)) {
        showToast(ACCOUNT_COPY.verification.alreadyVerified);
        void refreshAccount(queryClient);
      }
    },
  });

  return {
    send: () => mutation.mutate(),
    pending: mutation.isPending,
    coolingDown: secondsLeft > 0,
    countdown: formatClock(secondsLeft),
    /** A failure the cooldown or the refreshed status do not already explain. */
    failed:
      mutation.isError &&
      throttleSeconds(mutation.error) === undefined &&
      !isApiError(mutation.error, ALREADY_VERIFIED),
  };
}
