import type { MergedOptions, Middleware } from 'openapi-fetch';
import { ApiError, toApiError, toNetworkError } from './ApiError';

/*
 * Middleware of the API clients: the page's client and the service worker's. It therefore uses
 * nothing that only exists in a window, such as `document`.
 */

/* Spring Security's SPA CSRF pattern: echo the readable cookie in a header on unsafe requests. */
export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'X-XSRF-TOKEN';

/** The problem code of a request the server refused for a missing or outdated CSRF token. */
export const CSRF_REJECTED = 'csrf_invalid';

/** Every backend response sets the cookie; the auth status is the cheapest one to ask for. */
const CSRF_TOKEN_SOURCE = '/api/auth/status';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Reads the current CSRF token: the page from `document.cookie`, the worker from the Cookie Store. */
export type CsrfTokenReader = () => string | undefined | Promise<string | undefined>;

/**
 * A request that can be sent again. Sending consumes a body, so it keeps what it was made of; the
 * clients make their requests with it (`createClient({ Request: ReplayableRequest })`). Copying
 * every request in advance instead would turn each body into a stream, which DevTools and HAR
 * files cannot show.
 */
export class ReplayableRequest extends Request {
  readonly #init: RequestInit | undefined;

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    this.#init = init;
  }

  /** A new request as this one was made, before middleware changed its headers. */
  replay(): Request {
    return new Request(this.url, this.#init);
  }
}

/**
 * Sends the CSRF token with every unsafe request. It is read per request because the server
 * rotates it on sign-in and sign-out; a reader that answers at once adds no wait, so the page's
 * requests leave in the order they were made.
 *
 * Without the cookie (a browser that never talked to the backend, e.g. one opening a link from a
 * mail) it first asks the server for one. A {@link ReplayableRequest} refused for its token is sent
 * once more with a fresh one. Register it after the problem middleware, so it sees the refusal
 * first.
 */
export function csrfMiddleware(readToken: CsrfTokenReader): Middleware {
  let obtaining: Promise<void> | undefined;

  /** One request for a token, however many requests are waiting for it. */
  const obtainToken = (options: MergedOptions): Promise<void> => {
    obtaining ??= options
      .fetch(new Request(`${options.baseUrl}${CSRF_TOKEN_SOURCE}`, { credentials: 'include' }))
      .then(
        () => undefined,
        // The request goes out anyway; without a token the server's answer tells what went wrong.
        () => undefined,
      )
      .finally(() => {
        obtaining = undefined;
      });
    return obtaining;
  };

  const freshToken = async (options: MergedOptions) => {
    await obtainToken(options);
    return readToken();
  };

  const withToken = (request: Request, token: string | undefined) => {
    if (token) request.headers.set(CSRF_HEADER, token);
    return request;
  };

  return {
    onRequest({ request, options }) {
      if (!MUTATING_METHODS.has(request.method)) return undefined;
      const sendWith = (token: string | undefined) =>
        token
          ? withToken(request, token)
          : freshToken(options).then((fresh) => withToken(request, fresh));
      const token = readToken();
      return token instanceof Promise ? token.then(sendWith) : sendWith(token);
    },
    async onResponse({ request, response, options }) {
      if (!(request instanceof ReplayableRequest) || !MUTATING_METHODS.has(request.method)) {
        return undefined;
      }
      if (!(await isCsrfRejection(response))) return undefined;
      const retry = withToken(request.replay(), await freshToken(options));
      try {
        return await options.fetch(retry);
      } catch (error) {
        throw toNetworkError(error);
      }
    },
  };
}

async function isCsrfRejection(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  return (await toApiError(response.clone())).code === CSRF_REJECTED;
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
