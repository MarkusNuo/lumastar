import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, problemResponse } from '../test/http';
import { ApiError, CLIENT_ERROR_CODES } from './ApiError';
import { createApiClient, unwrap } from './client';
import { addCsrfHeader, CSRF_HEADER, readCookie } from './middleware';

function clientAnswering(answer: () => Response | Promise<Response>) {
  const requests: Request[] = [];
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: 'http://lingora.test',
    fetch: async (request) => {
      requests.push(request);
      return answer();
    },
    onUnauthorized,
  });
  return { client, requests, onUnauthorized };
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

  it('sends no CSRF header on a GET', async () => {
    const { client, requests } = clientAnswering(() =>
      jsonResponse({ authenticated: false, registrationMode: 'open', legacyLoginAvailable: false }),
    );

    await client.GET('/api/auth/status');

    expect(requests[0]?.headers.has(CSRF_HEADER)).toBe(false);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('adds the header to %s', (method) => {
    const request = new Request('http://lingora.test/api/x', { method });

    addCsrfHeader(request);

    expect(request.headers.get(CSRF_HEADER)).toBe('token+123');
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('leaves %s requests alone', (method) => {
    const request = new Request('http://lingora.test/api/x', { method });

    addCsrfHeader(request);

    expect(request.headers.has(CSRF_HEADER)).toBe(false);
  });

  it('sends no header while the cookie is missing', async () => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const { client, requests } = clientAnswering(() => new Response(null, { status: 204 }));

    await client.POST('/api/auth/logout');

    expect(requests[0]?.headers.has(CSRF_HEADER)).toBe(false);
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
