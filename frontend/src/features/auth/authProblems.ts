import { isApiError } from '../../api/ApiError';
import { formatClock } from '../../lib/formatClock';
import { useCountdown } from './useCountdown';

// Used only if a throttled answer lacks retryAfterSeconds; matches the backend's first lock.
const FALLBACK_LOCK_SECONDS = 60;

/** Seconds to wait when the server throttled the request, otherwise undefined. */
export function throttleSeconds(error: unknown): number | undefined {
  if (!isApiError(error) || error.status !== 429) return undefined;
  return error.problem?.retryAfterSeconds ?? FALLBACK_LOCK_SECONDS;
}

/** The request fields a validation problem names, e.g. ["email"]. */
export function invalidFields(error: unknown): string[] {
  if (!isApiError(error, 'validation_failed')) return [];
  return error.problem?.errors?.map((fieldError) => fieldError.field) ?? [];
}

export type LinkProblem = 'expired' | 'invalid';

/** Why a link from a mail (verification, password reset) no longer works, if that is the error. */
export function linkProblem(error: unknown): LinkProblem | undefined {
  if (isApiError(error, 'token_expired')) return 'expired';
  if (isApiError(error, 'token_invalid')) return 'invalid';
  return undefined;
}

/** Locks a form's button with a countdown while the server throttles it. */
export function useThrottleLock() {
  const [seconds, start] = useCountdown();
  return {
    locked: seconds > 0,
    countdown: formatClock(seconds),
    /** Starts the lock if the error is a throttle answer; returns whether it was one. */
    lockOn: (error: unknown): boolean => {
      const wait = throttleSeconds(error);
      if (wait === undefined) return false;
      start(wait);
      return true;
    },
  };
}
