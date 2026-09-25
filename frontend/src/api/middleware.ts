import type { Middleware } from 'openapi-fetch';
import { ApiError, toApiError, toNetworkError } from './ApiError';

/* Spring Security's SPA CSRF pattern: echo the readable cookie in a header on unsafe requests. */
export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'X-XSRF-TOKEN';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function readCookie(name: string, cookies: string = document.cookie): string | undefined {
  for (const pair of cookies.split(';')) {
    const [key, ...value] = pair.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

/** Reads the cookie per request because the server rotates the token on sign-in and sign-out. */
export function addCsrfHeader(request: Request): void {
  if (!MUTATING_METHODS.has(request.method)) return;
  const token = readCookie(CSRF_COOKIE);
  if (token) request.headers.set(CSRF_HEADER, token);
}

export const csrfMiddleware: Middleware = {
  onRequest: ({ request }) => addCsrfHeader(request),
};

/**
 * Rejects every non-2xx response with an {@link ApiError}, so callers only handle success data,
 * and reports 401s so the auth state can be refreshed.
 */
export function problemMiddleware(onUnauthorized: () => void): Middleware {
  return {
    async onResponse({ response }) {
      if (response.ok) return;
      const error = await toApiError(response);
      if (error.status === 401) onUnauthorized();
      throw error;
    },
    onError({ error }) {
      return error instanceof ApiError ? error : toNetworkError(error);
    },
  };
}
