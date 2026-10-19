import { describe, expect, it } from 'vitest';
import { CSRF_HEADER } from '../api/middleware';
import { fakePushSubscription } from '../test/fakeServiceWorker';
import { jsonResponse, problemResponse } from '../test/http';
import { createWorkerBackend } from './workerBackend';

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

function backendAnswering(answer: () => Response, csrfToken?: string) {
  const requests: Request[] = [];
  const backend = createWorkerBackend({
    baseUrl: 'https://lumastar.test',
    fetch: (request) => {
      requests.push(request);
      return Promise.resolve(answer());
    },
    readCsrfToken: () => Promise.resolve(csrfToken),
    userAgent: ANDROID,
  });
  const last = async () => {
    const request = requests.at(-1);
    return {
      method: request?.method,
      path: request && new URL(request.url).pathname,
      body: (await request?.clone().text()) ? ((await request?.clone().json()) as unknown) : null,
      csrf: request?.headers.get(CSRF_HEADER),
    };
  };
  return { backend, last };
}

describe('createWorkerBackend', () => {
  it('snoozes with the token for an hour, which needs no session', async () => {
    const { backend, last } = backendAnswering(() =>
      jsonResponse({ snoozedUntil: '2026-10-07T19:00:00Z' }),
    );

    await backend.snooze('snooze-123');

    expect(await last()).toEqual({
      method: 'POST',
      path: '/api/reminders/snooze',
      body: { token: 'snooze-123', minutes: 60 },
      csrf: null,
    });
  });

  it('rejects a snooze the backend refuses, e.g. an expired token', async () => {
    const { backend } = backendAnswering(() =>
      problemResponse({ status: 404, code: 'snooze_token_invalid' }),
    );

    await expect(backend.snooze('old')).rejects.toMatchObject({ code: 'snooze_token_invalid' });
  });

  it('registers a renewed subscription with the CSRF token of the Cookie Store', async () => {
    const { backend, last } = backendAnswering(() => jsonResponse({}), 'csrf-from-cookie-store');

    await backend.saveSubscription(fakePushSubscription('https://fcm.googleapis.com/fcm/send/1'));

    expect(await last()).toEqual({
      method: 'POST',
      path: '/api/push/subscriptions',
      body: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/1',
        keys: { p256dh: 'p256dh-of-https://fcm.googleapis.com/fcm/send/1', auth: 'auth-secret' },
        label: 'Chrome · Android',
      },
      csrf: 'csrf-from-cookie-store',
    });
  });

  it('removes the old subscription by its endpoint', async () => {
    const { backend, last } = backendAnswering(() => new Response(null, { status: 204 }));

    await backend.deleteSubscription('https://fcm.googleapis.com/fcm/send/old');

    expect(await last()).toMatchObject({
      method: 'DELETE',
      path: '/api/push/subscriptions',
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/old' },
    });
  });

  it('reads the server key, or none while push is not set up', async () => {
    const available = backendAnswering(() => jsonResponse({ available: true, publicKey: 'BAEC' }));
    const unavailable = backendAnswering(() => jsonResponse({ available: false }));

    expect(await available.backend.publicKey()).toBe('BAEC');
    expect(await unavailable.backend.publicKey()).toBeUndefined();
  });
});
