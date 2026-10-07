import type { Middleware } from 'openapi-fetch';
import { ApiError, toApiError, toNetworkError } from './ApiError';

/*
 * Middleware of the API clients: the page's client and the service worker's. It therefore uses
 * nothing that only exists in a window, such as `document`.
 */

/* Spring Security's SPA CSRF pattern: echo the readable cookie in a header on unsafe requests. */
export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'X-XSRF-TOKEN';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Reads the current CSRF token: the page from `document.cookie`, the worker from the Cookie Store. */
export type CsrfTokenReader = () => string | undefined | Promise<string | undefined>;

/**
 * Reads the token per request because the server rotates it on sign-in and sign-out. A reader that
 * answers at once adds no wait, so the page's requests leave in the order they were made.
 */
export function csrfMiddleware(readToken: CsrfTokenReader): Middleware {
  const withToken = (request: Request, token: string | undefined) => {
    if (token) request.headers.set(CSRF_HEADER, token);
    return request;
  };
  return {
    onRequest({ request }) {
      if (!MUTATING_METHODS.has(request.method)) return undefined;
      const token = readToken();
      return token instanceof Promise
        ? token.then((value) => withToken(request, value))
        : withToken(request, token);
    },
  };
}

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
