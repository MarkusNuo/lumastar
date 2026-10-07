import { isApiError } from '../../api/ApiError';

/** The password confirming an account change was wrong. */
export function isWrongPassword(error: unknown): boolean {
  return isApiError(error, 'invalid_password');
}
