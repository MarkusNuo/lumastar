import createClient from 'openapi-fetch';
import { ApiError, CLIENT_ERROR_CODES } from './ApiError';
import { csrfMiddleware, problemMiddleware } from './middleware';
import type { paths } from './schema';
import { notifyUnauthorized } from './unauthorized';

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
  const client = createClient<paths>({ baseUrl, fetch, credentials: 'include' });
  client.use(csrfMiddleware, problemMiddleware(onUnauthorized));
  return client;
}

/** The app's API client; the dev and preview servers proxy `/api` to the backend. */
export const api = createApiClient();

/**
 * Returns the response data. Failures already rejected in the middleware, but openapi-fetch still
 * types `data` as optional, so this narrows it for endpoints that answer with a body.
 */
export async function unwrap<T>(pending: Promise<{ data?: T; response: Response }>): Promise<T> {
  const { data, response } = await pending;
  if (data === undefined) {
    throw new ApiError('The response has no body', {
      status: response.status,
      code: CLIENT_ERROR_CODES.unexpectedResponse,
    });
  }
  return data;
}
