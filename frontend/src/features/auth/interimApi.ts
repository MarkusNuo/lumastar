import { toApiError, toNetworkError } from '../../api/ApiError';
import { addCsrfHeader } from '../../api/middleware';
import type { Profile } from '../../api/types';
import { notifyUnauthorized } from '../../api/unauthorized';

/*
 * TEMPORARY bridge to the M8 account contract until the backend commit with its OpenAPI spec
 * lands; then `npm run gen:api` replaces these shapes and calls with the generated client.
 */

export type RegistrationMode = 'open' | 'invite' | 'closed';

export interface AuthStatus {
  authenticated: boolean;
  registrationMode: RegistrationMode;
  legacyLoginAvailable: boolean;
  displayName?: string;
  emailVerified?: boolean;
}

export interface Me extends Profile {
  email?: string;
  emailVerified?: boolean;
  emailRequired?: boolean;
}

export interface Account {
  email?: string;
  emailVerified: boolean;
  pendingEmail?: string;
  displayName: string;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  inviteCode?: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Same CSRF, problem and 401 handling as the generated client's middleware. */
export async function call<T = undefined>(method: Method, path: string, body?: unknown) {
  const request = new Request(new URL(path, globalThis.location.origin), {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  addCsrfHeader(request);
  let response: Response;
  try {
    response = await globalThis.fetch(request);
  } catch (cause) {
    throw toNetworkError(cause);
  }
  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401) notifyUnauthorized();
    throw error;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
