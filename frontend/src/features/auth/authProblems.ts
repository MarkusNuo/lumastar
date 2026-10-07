import { isApiError } from '../../api/ApiError';
import { formatClock } from '../../lib/formatClock';
import type { FieldErrors } from '../../lib/useFormErrors';
import { AUTH_COPY } from './copy';
import { useCountdown } from './useCountdown';

// Used only if a throttled answer lacks retryAfterSeconds; matches the backend's first lock.
const FALLBACK_LOCK_SECONDS = 60;

/** Seconds to wait when the server throttled the request, otherwise undefined. */
export function throttleSeconds(error: unknown): number | undefined {
  if (!isApiError(error) || error.status !== 429) return undefined;
  return error.problem?.retryAfterSeconds ?? FALLBACK_LOCK_SECONDS;
}

/** The request fields a validation problem names, e.g. ["email"]. */
function invalidFields(error: unknown): string[] {
  if (!isApiError(error, 'validation_failed')) return [];
  return error.problem?.errors?.map((fieldError) => fieldError.field) ?? [];
}

/** For each request field the server may refuse: the form field that shows it, and the message. */
export type ServerFields<Field extends string> = Partial<Record<string, readonly [Field, string]>>;

/** The errors of a validation problem on the fields the form shows; empty for any other error. */
export function serverFieldErrors<Field extends string>(
  error: unknown,
  fields: ServerFields<Field>,
): FieldErrors<Field> {
  return Object.fromEntries(
    invalidFields(error).flatMap((field) => {
      const shown = fields[field];
      return shown ? [shown] : [];
    }),
  ) as FieldErrors<Field>;
}

/**
 * Shows a `validation_failed` answer: an error on each refused field the form shows, otherwise
 * the general message through `fail`. Returns false for every other error, which is the caller's.
 */
export function rejectInvalid<Field extends string>(
  error: unknown,
  fields: ServerFields<Field>,
  form: { rejectFields: (errors: FieldErrors<Field>) => void },
  fail: (message: string) => void,
): boolean {
  if (!isApiError(error, 'validation_failed')) return false;
  const errors = serverFieldErrors(error, fields);
  if (Object.keys(errors).length > 0) form.rejectFields(errors);
  else fail(AUTH_COPY.invalid);
  return true;
}

export type LinkProblem = 'expired' | 'invalid';

/** Why a link from a mail (verification, password reset) no longer works, if that is the error. */
export function linkProblem(error: unknown): LinkProblem | undefined {
  if (isApiError(error, 'token_expired')) return 'expired';
  // A token the server refuses to even look at (e.g. cut off or padded) is just as unusable.
  if (isApiError(error, 'token_invalid') || invalidFields(error).includes('token')) {
    return 'invalid';
  }
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
