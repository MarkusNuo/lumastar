import { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushConfig, PushDevice, ReminderSettings } from '../../api/types';
import {
  ENDPOINT,
  installFakePush,
  removeFakePush,
  SERVER_KEY,
  SERVER_KEY_BYTES,
  type FakePushOptions,
} from '../../test/fakePush';
import { reminderSettings } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { DEVICE_OWNER_KEY, isDeviceOwner, rememberDeviceOwner } from './deviceOwner';
import { useReminderNudge } from './nudgeStore';
import {
  onLessonCompleted,
  releaseDeletedAccountDevice,
  renewDeviceRegistration,
  signOutReleasingDevice,
} from './reminderLifecycle';

const ARDIT = 'ardit@example.ch';
const BLERTA = 'blerta@example.ch';

interface Backend {
  settings?: ReminderSettings;
  config?: PushConfig;
  /** The signed-in learner's devices, or the answer to the question for them. */
  devices?: PushDevice[] | (() => Response);
}

function backend({
  settings = reminderSettings({ enabled: true }),
  config = { available: true, publicKey: SERVER_KEY },
  devices = [],
}: Backend = {}) {
  return stubApi({
    'GET /api/reminders': () => jsonResponse(settings),
    'GET /api/push/config': () => jsonResponse(config),
    'GET /api/push/subscriptions': () =>
      typeof devices === 'function' ? devices() : jsonResponse(devices),
    'POST /api/push/subscriptions': () => jsonResponse({}),
    'DELETE /api/push/subscriptions': () => new Response(null, { status: 204 }),
  });
}

const registered = (endpoint = ENDPOINT): PushDevice => ({
  endpoint,
  createdAt: '2026-10-07T08:00:00Z',
  failureCount: 0,
});

const posts = (requests: Request[]) => requests.filter((request) => request.method === 'POST');
const calls = (requests: Request[]) =>
  requests.map((request) => `${request.method} ${new URL(request.url).pathname}`);

const optedIn: FakePushOptions = { permission: 'granted', subscribedWith: SERVER_KEY_BYTES };

beforeEach(() => {
  useReminderNudge.setState({ state: 'waiting' });
});

afterEach(() => {
  removeFakePush();
  localStorage.clear();
});

describe('onLessonCompleted', () => {
  it('clears the badge and the delivered reminders', async () => {
    const browser = installFakePush();

    onLessonCompleted();

    await waitFor(() => expect(browser.clearAppBadge).toHaveBeenCalledOnce());
    await waitFor(() => expect(browser.notifications[0]?.close).toHaveBeenCalledOnce());
  });

  it('makes the reminder suggestion due once', () => {
    onLessonCompleted();
    expect(useReminderNudge.getState().state).toBe('due');

    useReminderNudge.getState().close();
    onLessonCompleted();
    expect(useReminderNudge.getState().state).toBe('done');
  });
});

describe('renewDeviceRegistration', () => {
  describe("with the learner's own subscription", () => {
    beforeEach(() => rememberDeviceOwner(ARDIT));

    it('registers it again', async () => {
      installFakePush(optedIn);
      const requests = backend();

      await renewDeviceRegistration(new QueryClient(), ARDIT);

      expect(posts(requests)).toHaveLength(1);
      expect(await posts(requests)[0]?.clone().json()).toMatchObject({ endpoint: ENDPOINT });
    });

    it('subscribes again when the server has a new key', async () => {
      const browser = installFakePush({ permission: 'granted', subscribedWith: [7, 7, 7] });
      const requests = backend();

      await renewDeviceRegistration(new QueryClient(), ARDIT);

      expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
      expect(posts(requests)).toHaveLength(1);
    });

    it('leaves a device alone whose reminders are off', async () => {
      installFakePush(optedIn);
      const requests = backend({ settings: reminderSettings({ enabled: false }) });

      await renewDeviceRegistration(new QueryClient(), ARDIT);

      expect(posts(requests)).toHaveLength(0);
    });

    it('stays silent when the backend cannot be reached', async () => {
      installFakePush(optedIn);
      stubApi({});

      await expect(renewDeviceRegistration(new QueryClient(), ARDIT)).resolves.toBeUndefined();
    });
  });

  it('asks the backend nothing on a device that never opted in', async () => {
    installFakePush({ permission: 'granted' });
    const requests = backend();

    await renewDeviceRegistration(new QueryClient(), ARDIT);

    expect(requests).toHaveLength(0);
  });

  it('ends the subscription of a learner whose session ended without signing out', async () => {
    await rememberDeviceOwner(ARDIT);
    const browser = installFakePush(optedIn);
    const requests = backend({ devices: [registered('https://web.push.apple.com/blertas-phone')] });

    await renewDeviceRegistration(new QueryClient(), BLERTA);

    expect(browser.state.subscription, 'unsubscribed').toBeNull();
    expect(calls(requests), 'nothing registered for Blerta').toEqual([
      'GET /api/push/subscriptions',
    ]);
    expect(localStorage.getItem(DEVICE_OWNER_KEY)).toBeNull();
  });

  it('keeps a subscription the backend lists for the learner, e.g. after an address change', async () => {
    await rememberDeviceOwner('ardit.alt@example.ch');
    const browser = installFakePush(optedIn);
    const requests = backend({ devices: [registered()] });

    await renewDeviceRegistration(new QueryClient(), ARDIT);

    expect(browser.state.subscription).not.toBeNull();
    expect(posts(requests)).toHaveLength(1);
    expect(await isDeviceOwner(ARDIT)).toBe(true);
  });

  it('ends a subscription nobody noted that the backend does not list for the learner', async () => {
    const browser = installFakePush(optedIn);
    const requests = backend();

    await renewDeviceRegistration(new QueryClient(), BLERTA);

    expect(browser.state.subscription).toBeNull();
    expect(posts(requests)).toHaveLength(0);
  });

  it('registers nothing while it cannot tell whose subscription it is', async () => {
    await rememberDeviceOwner(ARDIT);
    const browser = installFakePush(optedIn);
    const requests = backend({ devices: () => problemResponse({ status: 503, code: 'down' }) });

    await renewDeviceRegistration(new QueryClient(), BLERTA);

    expect(browser.state.subscription, 'kept for its learner').not.toBeNull();
    expect(posts(requests)).toHaveLength(0);
  });
});

describe('signOutReleasingDevice', () => {
  beforeEach(() => rememberDeviceOwner(ARDIT));

  it('lets the backend forget the device first and ends the subscription after signing out', async () => {
    const browser = installFakePush(optedIn);
    const requests = backend();
    const subscribedWhileSigningOut: boolean[] = [];
    const signOut = vi.fn(() => {
      subscribedWhileSigningOut.push(browser.state.subscription !== null);
      return Promise.resolve();
    });

    await signOutReleasingDevice(signOut);

    expect(subscribedWhileSigningOut).toEqual([true]);
    expect(calls(requests)).toEqual(['DELETE /api/push/subscriptions']);
    expect(await requests[0]?.clone().json()).toEqual({ endpoint: ENDPOINT });
    expect(browser.state.subscription, 'unsubscribed').toBeNull();
    expect(localStorage.getItem(DEVICE_OWNER_KEY)).toBeNull();
  });

  it('gives the backend the device back when signing out fails', async () => {
    const browser = installFakePush(optedIn);
    const requests = backend();
    const failure = new Error('offline');

    await expect(signOutReleasingDevice(() => Promise.reject(failure))).rejects.toBe(failure);

    expect(calls(requests)).toEqual([
      'DELETE /api/push/subscriptions',
      'POST /api/push/subscriptions',
    ]);
    expect(browser.state.subscription).not.toBeNull();
    expect(await isDeviceOwner(ARDIT)).toBe(true);
  });

  it('never stands in the way of signing out', async () => {
    const browser = installFakePush(optedIn);
    stubApi({});
    const signOut = vi.fn(() => Promise.resolve());

    await expect(signOutReleasingDevice(signOut)).resolves.toBeUndefined();

    expect(signOut).toHaveBeenCalledOnce();
    expect(browser.state.subscription).toBeNull();
  });
});

describe('releaseDeletedAccountDevice', () => {
  it('ends the subscription without asking the backend, which forgot the account', async () => {
    await rememberDeviceOwner(ARDIT);
    const browser = installFakePush(optedIn);
    const requests = backend();

    releaseDeletedAccountDevice();

    await waitFor(() => expect(browser.state.subscription).toBeNull());
    expect(requests).toHaveLength(0);
    expect(localStorage.getItem(DEVICE_OWNER_KEY)).toBeNull();
  });
});
