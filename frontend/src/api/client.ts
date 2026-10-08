import createClient from 'openapi-fetch';
import { ApiError, CLIENT_ERROR_CODES } from './ApiError';
import { CSRF_COOKIE, csrfMiddleware, problemMiddleware, ReplayableRequest } from './middleware';
import type { paths } from './schema';
import { notifyUnauthorized } from './unauthorized';

export function readCookie(name: string, cookies: string = document.cookie): string | undefined {
  for (const pair of cookies.split(';')) {
    const [key, ...value] = pair.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: (request: Request) => Promise<Response>;
  onUnauthorized?: () => void;
}

export function createApiClient({
  // Absolute, because `new Request()` outside the browser (tests) rejects relative URLs.
  baseUrl = globalThis.location.origin,
  // Resolved per call so tests can stub the global fetch after this module was loaded.
  fetch = (request) => globalThis.fetch(request),
  onUnauthorized = notifyUnauthorized,
}: ApiClientOptions = {}) {
  const client = createClient<paths>({
    baseUrl,
    fetch,
    credentials: 'include',
    Request: ReplayableRequest,
  });
  // Responses pass the middleware in reverse: the CSRF retry comes before the problem mapping.
  client.use(
    problemMiddleware(onUnauthorized),
    csrfMiddleware(() => readCookie(CSRF_COOKIE)),
  );
  return client;
}

/** The app's API client; the dev and preview servers proxy `/api` to the backend. */
export const api = createApiClient();

/**
 * Returns the response data. Failures already rejected in the middleware, but openapi-fetch still
 * types `data` as optional, so this narrows it for endpoints that answer with a body.
 */
export async function unwrap<T>(pending: Promise<{ data?: T; response: Response }>): Promise<T> {
  return (await unwrapWithResponse(pending)).data;
}

/** Like {@link unwrap}, but keeps the response for its headers (e.g. a download's file name). */
export async function unwrapWithResponse<T>(
  pending: Promise<{ data?: T; response: Response }>,
): Promise<{ data: T; response: Response }> {
  const { data, response } = await pending;
  if (data === undefined) {
    throw new ApiError('The response has no body', {
      status: response.status,
      code: CLIENT_ERROR_CODES.unexpectedResponse,
    });
  }
  return { data, response };
}
