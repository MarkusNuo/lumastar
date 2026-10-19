import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, problemResponse } from '../test/http';
import { ApiError, CLIENT_ERROR_CODES } from './ApiError';
import type { Middleware } from 'openapi-fetch';
import { createApiClient, readCookie, unwrap } from './client';
import { CSRF_HEADER, CSRF_REJECTED, csrfMiddleware, type CsrfTokenReader } from './middleware';

function clientAnswering(answer: (request: Request) => Response | Promise<Response>) {
  const requests: Request[] = [];
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: 'http://lumastar.test',
    fetch: async (request) => {
      requests.push(request);
      return answer(request);
    },
    onUnauthorized,
  });
  return { client, requests, onUnauthorized };
}

/** Runs a request through the CSRF middleware alone. */
async function throughCsrf(method: string, readToken: CsrfTokenReader): Promise<Request> {
  const request = new Request('http://lumastar.test/api/x', { method });
  const params = { request } as Parameters<NonNullable<Middleware['onRequest']>>[0];
  await csrfMiddleware(readToken).onRequest?.(params);
  return request;
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('CSRF middleware', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=token%2B123';
  });

  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('echoes the XSRF-TOKEN cookie in the X-XSRF-TOKEN header of a POST', async () => {
    const { client, requests } = clientAnswering(() => new Response(null, { status: 204 }));

    await client.POST('/api/auth/login', { body: { password: 'geheim123' } });

    expect(requests[0]?.headers.get(CSRF_HEADER)).toBe('token+123');
  });

  it('sends requests as made, without copying their bodies in advance', async () => {
    const clone = vi.spyOn(Request.prototype, 'clone');
    const { client, requests } = clientAnswering(() => new Response(null, { status: 204 }));

    await client.POST('/api/auth/verify-email', { body: { token: 'link-token' } });

    // A copied request's body turns into a stream, which DevTools and HAR files cannot show.
    expect(clone).not.toHaveBeenCalled();
    expect(await requests[0]?.text()).toBe('{"token":"link-token"}');
    clone.mockRestore();
  });

  it('sends no CSRF header on a GET', async () => {
    const { client, requests } = clientAnswering(() =>
      jsonResponse({ authenticated: false, registrationMode: 'open', legacyLoginAvailable: false }),
    );

    await client.GET('/api/auth/status');

    expect(requests[0]?.headers.has(CSRF_HEADER)).toBe(false);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('adds the header to %s', async (method) => {
    const request = await throughCsrf(method, () => 'token+123');

    expect(request.headers.get(CSRF_HEADER)).toBe('token+123');
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('leaves %s requests alone', async (method) => {
    const request = await throughCsrf(method, () => 'token+123');

    expect(request.headers.has(CSRF_HEADER)).toBe(false);
  });

  it('waits for an asynchronous reader, like the service worker has one', async () => {
    const request = await throughCsrf('DELETE', () => Promise.resolve('from-cookie-store'));

    expect(request.headers.get(CSRF_HEADER)).toBe('from-cookie-store');
  });
});

const SIGNED_OUT = { authenticated: false, registrationMode: 'open', legacyLoginAvailable: false };

function setCsrfCookie(value: string) {
  document.cookie = `XSRF-TOKEN=${value}`;
}

const describeRequest = (request: Request) =>
  `${request.method} ${new URL(request.url).pathname} ${request.headers.get(CSRF_HEADER)}`;

describe('CSRF token without the cookie', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  /** The status hands out the token; like a real cookie, it arrives with the response. */
  function backendSettingCookie(answer: (request: Request) => Response) {
    return clientAnswering(async (request) => {
      if (request.method !== 'GET') return answer(request);
      await Promise.resolve();
      setCsrfCookie('fresh-token');
      return jsonResponse(SIGNED_OUT);
    });
  }

  it('fetches a token before the first unsafe request of a browser that has none', async () => {
    const { client, requests } = backendSettingCookie(() => new Response(null, { status: 204 }));

    await client.POST('/api/auth/verify-email', { body: { token: 'link-token' } });

    expect(requests.map(describeRequest)).toEqual([
      'GET /api/auth/status null',
      'POST /api/auth/verify-email fresh-token',
    ]);
  });

  it('asks only once while several requests wait for the token', async () => {
    const { client, requests } = backendSettingCookie(() => new Response(null, { status: 204 }));

    await Promise.all([
      client.POST('/api/auth/logout'),
      client.POST('/api/auth/verify-email', { body: { token: 'link-token' } }),
    ]);

    expect(requests.map(describeRequest)).toEqual([
      'GET /api/auth/status null',
      'POST /api/auth/logout fresh-token',
      'POST /api/auth/verify-email fresh-token',
    ]);
  });

  it('still sends the request when no token can be fetched', async () => {
    const { client, requests } = clientAnswering((request) =>
      request.method === 'GET'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : new Response(null, { status: 204 }),
    );

    await client.POST('/api/auth/logout');

    expect(requests.map(describeRequest)).toEqual([
      'GET /api/auth/status null',
      'POST /api/auth/logout null',
    ]);
  });
});

describe('CSRF refusal', () => {
  beforeEach(() => {
    setCsrfCookie('outdated-token');
  });

  /** Refuses unsafe requests unless they carry the token the status handed out last. */
  function backendRefusing(refuseAlways = false) {
    return clientAnswering((request) => {
      if (request.method === 'GET') {
        setCsrfCookie('fresh-token');
        return jsonResponse(SIGNED_OUT);
      }
      return !refuseAlways && request.headers.get(CSRF_HEADER) === 'fresh-token'
        ? new Response(null, { status: 204 })
        : problemResponse({ status: 403, code: CSRF_REJECTED });
    });
  }

  it('sends a refused request once more with a fresh token and the same body', async () => {
    const { client, requests } = backendRefusing();

    const { response } = await client.POST('/api/auth/password-reset/confirm', {
      body: { token: 'link-token', newPassword: 'geheim123' },
    });

    expect(response.status).toBe(204);
    expect(requests.map(describeRequest)).toEqual([
      'POST /api/auth/password-reset/confirm outdated-token',
      'GET /api/auth/status null',
      'POST /api/auth/password-reset/confirm fresh-token',
    ]);
    expect(await requests[2]?.json()).toEqual({ token: 'link-token', newPassword: 'geheim123' });
  });

  it('gives up after the second refusal', async () => {
    const { client, requests } = backendRefusing(true);

    const error = await rejection(client.POST('/api/auth/logout'));

    expect(error).toMatchObject({ status: 403, code: CSRF_REJECTED });
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(2);
  });

  it('does not repeat requests refused for other reasons', async () => {
    const { client, requests } = clientAnswering(() =>
      problemResponse({ status: 403, code: 'invalid_password' }),
    );

    const error = await rejection(
      client.DELETE('/api/account', { body: { password: 'falsch123' } }),
    );

    expect(error.code).toBe('invalid_password');
    expect(requests).toHaveLength(1);
  });

  it('reports a retry that cannot reach the server as a network error', async () => {
    let refused = false;
    const { client } = clientAnswering((request) => {
      if (request.method === 'GET') return jsonResponse(SIGNED_OUT);
      if (refused) return Promise.reject(new TypeError('Failed to fetch'));
      refused = true;
      return problemResponse({ status: 403, code: CSRF_REJECTED });
    });

    const error = await rejection(client.POST('/api/auth/logout'));

    expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.network });
  });
});

describe('readCookie', () => {
  it('finds a cookie among others and decodes it', () => {
    expect(readCookie('XSRF-TOKEN', 'a=1; XSRF-TOKEN=x%3Dy; b=2')).toBe('x=y');
  });

  it('returns undefined for a missing cookie', () => {
    expect(readCookie('XSRF-TOKEN', 'a=1')).toBeUndefined();
  });
});

describe('problem middleware', () => {
  it('resolves with the data of a successful response', async () => {
    const status = {
      authenticated: true,
      registrationMode: 'open',
      legacyLoginAvailable: false,
      displayName: 'Erza',
    };
    const { client } = clientAnswering(() => jsonResponse(status));

    await expect(unwrap(client.GET('/api/auth/status'))).resolves.toEqual(status);
  });

  it('maps a problem detail to an ApiError with its code', async () => {
    const { client } = clientAnswering(() =>
      problemResponse({ status: 401, code: 'invalid_credentials', detail: 'Wrong password.' }),
    );

    const error = await rejection(client.POST('/api/auth/login', { body: { password: 'falsch' } }));

    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials' });
    expect(error.message).toBe('Wrong password.');
    expect(error.isTransient).toBe(false);
  });

  it('keeps the extra problem fields, e.g. the throttling delay', async () => {
    const { client } = clientAnswering(() =>
      problemResponse({ status: 429, code: 'login_throttled', retryAfterSeconds: 60 }),
    );

    const error = await rejection(client.POST('/api/auth/login', { body: { password: 'falsch' } }));

    expect(error.code).toBe('login_throttled');
    expect(error.problem?.retryAfterSeconds).toBe(60);
  });

  it('maps a response without problem detail to an unexpected-response error', async () => {
    const { client } = clientAnswering(() => new Response('Bad Gateway', { status: 502 }));

    const error = await rejection(client.GET('/api/auth/status'));

    expect(error).toMatchObject({ status: 502, code: CLIENT_ERROR_CODES.unexpectedResponse });
    expect(error.problem).toBeUndefined();
    expect(error.isTransient).toBe(true);
  });

  it('maps a failed fetch to a network error', async () => {
    const { client } = clientAnswering(() => Promise.reject(new TypeError('Failed to fetch')));

    const error = await rejection(client.GET('/api/auth/status'));

    expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.network });
    expect(error.isTransient).toBe(true);
  });

  it('signals a 401 so the auth state gets refreshed', async () => {
    const { client, onUnauthorized } = clientAnswering(() =>
      problemResponse({ status: 401, code: 'authentication_required' }),
    );

    await rejection(unwrap(client.GET('/api/me')));

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not signal other failures', async () => {
    const { client, onUnauthorized } = clientAnswering(() =>
      problemResponse({ status: 409, code: 'email_taken' }),
    );

    await rejection(
      client.PUT('/api/account/email', {
        body: { newEmail: 'erza@example.ch', password: 'geheim123' },
      }),
    );

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
