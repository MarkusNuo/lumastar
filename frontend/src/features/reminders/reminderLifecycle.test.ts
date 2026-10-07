import { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PushConfig, ReminderSettings } from '../../api/types';
import {
  ENDPOINT,
  installFakePush,
  removeFakePush,
  SERVER_KEY,
  SERVER_KEY_BYTES,
  type FakePushOptions,
} from '../../test/fakePush';
import { reminderSettings } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { onLessonCompleted, releaseDevice, renewDeviceRegistration } from './reminderLifecycle';
import { useReminderNudge } from './nudgeStore';

function backend(
  settings: ReminderSettings,
  config: PushConfig = { available: true, publicKey: SERVER_KEY },
) {
  return stubApi({
    'GET /api/reminders': () => jsonResponse(settings),
    'GET /api/push/config': () => jsonResponse(config),
    'POST /api/push/subscriptions': () => jsonResponse({}),
    'DELETE /api/push/subscriptions': () => new Response(null, { status: 204 }),
  });
}

const posts = (requests: Request[]) => requests.filter((request) => request.method === 'POST');

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
  it('registers the subscription of a device that opted in again', async () => {
    installFakePush(optedIn);
    const requests = backend(reminderSettings({ enabled: true }));

    await renewDeviceRegistration(new QueryClient());

    expect(posts(requests)).toHaveLength(1);
    expect(await posts(requests)[0]?.clone().json()).toMatchObject({ endpoint: ENDPOINT });
  });

  it('subscribes again when the server has a new key', async () => {
    const browser = installFakePush({ permission: 'granted', subscribedWith: [7, 7, 7] });
    const requests = backend(reminderSettings({ enabled: true }));

    await renewDeviceRegistration(new QueryClient());

    expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
    expect(posts(requests)).toHaveLength(1);
  });

  it('leaves a device alone whose reminders are off', async () => {
    installFakePush(optedIn);
    const requests = backend(reminderSettings({ enabled: false }));

    await renewDeviceRegistration(new QueryClient());

    expect(posts(requests)).toHaveLength(0);
  });

  it('asks the backend nothing on a device that never opted in', async () => {
    installFakePush({ permission: 'granted' });
    const requests = backend(reminderSettings({ enabled: true }));

    await renewDeviceRegistration(new QueryClient());

    expect(requests).toHaveLength(0);
  });

  it('stays silent when the backend cannot be reached', async () => {
    installFakePush(optedIn);
    stubApi({});

    await expect(renewDeviceRegistration(new QueryClient())).resolves.toBeUndefined();
  });
});

describe('releaseDevice', () => {
  it('unsubscribes and makes the backend forget the device', async () => {
    const browser = installFakePush(optedIn);
    const requests = backend(reminderSettings({ enabled: true }));

    await releaseDevice();

    expect(browser.state.subscription, 'unsubscribed').toBeNull();
    expect(requests.map((request) => request.method)).toEqual(['DELETE']);
    expect(await requests[0]?.clone().json()).toEqual({ endpoint: ENDPOINT });
  });

  it('never stands in the way of signing out', async () => {
    installFakePush(optedIn);
    stubApi({});

    await expect(releaseDevice()).resolves.toBeUndefined();
  });
});
