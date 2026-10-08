import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushConfig, PushDevice, ReminderSettings } from '../../api/types';
import { Toaster } from '../../components/ui/Toast';
import { useToastStore } from '../../components/ui/toastStore';
import {
  ENDPOINT,
  installFakePush,
  removeFakePush,
  SERVER_KEY,
  SERVER_KEY_BYTES,
  USER_AGENTS,
  type FakePushOptions,
} from '../../test/fakePush';
import { profile, reminderSettings } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes } from '../../test/router';
import { REMINDER_COPY } from './copy';
import { isDeviceOwner } from './deviceOwner';
import { useReminderNudge } from './nudgeStore';
import { REMINDER_ROUTE } from './reminderRoutes';
import { RemindersPage } from './RemindersPage';
import { SAVE_DELAY_MS } from './useReminderTimes';

const AVAILABLE: PushConfig = { available: true, publicKey: SERVER_KEY };

const device = (endpoint: string): PushDevice => ({
  endpoint,
  label: 'Chrome · Android',
  createdAt: '2026-10-07T08:00:00Z',
  failureCount: 0,
});

type Routes = Parameters<typeof stubApi>[0];

interface Setup {
  push?: FakePushOptions;
  settings?: ReminderSettings;
  config?: PushConfig;
  devices?: PushDevice[];
  routes?: Routes;
}

const echo = async (request: Request) => jsonResponse(await request.clone().json());

const EMAIL = profile().email;

/** A backend answer that waits until the test lets it through. */
function heldBack(answer: () => Response | Promise<Response>) {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    route: async () => {
      await released;
      return answer();
    },
    release: () => release(),
  };
}

function renderReminders({
  push,
  settings = reminderSettings(),
  config = AVAILABLE,
  devices = [],
  routes = {},
}: Setup = {}) {
  const browser = installFakePush(push);
  let registered = devices;
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(profile()),
    'GET /api/push/config': () => jsonResponse(config),
    'GET /api/reminders': () => jsonResponse(settings),
    'GET /api/push/subscriptions': () => jsonResponse(registered),
    'PUT /api/reminders': echo,
    'POST /api/push/subscriptions': async (request) => {
      const { endpoint } = (await request.clone().json()) as { endpoint: string };
      return jsonResponse(device(endpoint));
    },
    'DELETE /api/push/subscriptions': async (request) => {
      const { endpoint } = (await request.clone().json()) as { endpoint: string };
      registered = registered.filter((entry) => entry.endpoint !== endpoint);
      return new Response(null, { status: 204 });
    },
    'POST /api/push/test': () =>
      jsonResponse({ devices: 1, delivered: 1, removed: 0, notification: {} }),
    ...routes,
  });
  const view = renderRoutes(
    [
      {
        path: REMINDER_ROUTE,
        element: (
          <>
            <RemindersPage />
            <Toaster />
          </>
        ),
      },
    ],
    REMINDER_ROUTE,
  );
  const sent = (method: string, path: string) =>
    requests.filter(
      (request) => request.method === method && new URL(request.url).pathname === path,
    );
  const body = async (method: string, path: string) =>
    (await sent(method, path).at(-1)?.clone().json()) as unknown;
  return { ...view, browser, requests, sent, body, user: userEvent.setup() };
}

const reminderSwitch = () => screen.findByRole('switch', { name: REMINDER_COPY.toggle.label });

beforeEach(() => {
  useToastStore.setState({ current: null });
});

afterEach(() => {
  removeFakePush();
  localStorage.clear();
  vi.useRealTimers();
});

describe('RemindersPage', () => {
  it('shows what a reminder looks like and the switch, off until the learner opts in', async () => {
    renderReminders();

    expect(screen.getByRole('figure', { name: REMINDER_COPY.preview.label })).toBeInTheDocument();
    expect(await reminderSwitch()).not.toBeChecked();
    expect(screen.queryByRole('button', { name: REMINDER_COPY.test.button })).toBeNull();
  });

  describe('switching on', () => {
    it('asks for the permission, subscribes with the server key and registers the device', async () => {
      const { browser, user, body, sent } = renderReminders();

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      expect(browser.requestPermission).toHaveBeenCalledOnce();
      const [options] = browser.pushManager.subscribe.mock.calls[0] ?? [];
      expect(options?.userVisibleOnly).toBe(true);
      expect([...new Uint8Array(options?.applicationServerKey as Uint8Array)]).toEqual(
        SERVER_KEY_BYTES,
      );
      expect(await body('POST', '/api/push/subscriptions')).toEqual({
        endpoint: ENDPOINT,
        keys: { p256dh: `p256dh-of-${ENDPOINT}`, auth: 'auth-secret' },
        label: 'Chrome · Windows',
      });
      expect(await body('PUT', '/api/reminders')).toEqual({ ...reminderSettings(), enabled: true });
    });

    it('notes whose subscription this browser holds and that the suggestion is done', async () => {
      useReminderNudge.setState({ state: 'due' });
      const { user, sent } = renderReminders();

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      await waitFor(async () => expect(await isDeviceOwner(EMAIL)).toBe(true));
      await waitFor(() => expect(useReminderNudge.getState().state).toBe('done'));
    });

    it('keeps the focus on the switch while it is busy and ignores further taps', async () => {
      const registration = heldBack(() => jsonResponse(device(ENDPOINT)));
      const { browser, user } = renderReminders({
        routes: { 'POST /api/push/subscriptions': registration.route },
      });
      const toggle = await reminderSwitch();

      await user.click(toggle);
      await waitFor(() => expect(toggle).toHaveAttribute('aria-busy', 'true'));
      expect(toggle).toHaveAttribute('aria-disabled', 'true');
      expect(toggle).toBeEnabled();
      expect(toggle).toHaveFocus();
      await user.click(toggle);
      expect(browser.requestPermission).toHaveBeenCalledOnce();

      registration.release();
      await waitFor(() => expect(toggle).toBeChecked());
      expect(toggle).not.toHaveAttribute('aria-busy');
      expect(toggle).toHaveFocus();
    });

    it('then shows the times, the test button and a confirmation', async () => {
      const { user } = renderReminders();

      await user.click(await reminderSwitch());

      expect(await screen.findByText(REMINDER_COPY.enabled('19:00'))).toBeInTheDocument();
      await waitFor(async () => expect(await reminderSwitch()).toBeChecked());
      expect(screen.getByLabelText(REMINDER_COPY.time.label)).toHaveValue('19:00');
      expect(screen.getByRole('switch', { name: REMINDER_COPY.rescue.label })).toBeChecked();
      expect(screen.getByLabelText(REMINDER_COPY.rescue.timeLabel)).toHaveValue('21:30');
      expect(screen.getByRole('button', { name: REMINDER_COPY.test.button })).toBeInTheDocument();
    });

    it('reuses a subscription made with the same key', async () => {
      const { browser, user, sent } = renderReminders({
        push: { permission: 'granted', subscribedWith: SERVER_KEY_BYTES },
      });

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
      expect(sent('POST', '/api/push/subscriptions')).toHaveLength(1);
    });

    it('replaces a subscription made with an older server key', async () => {
      const { browser, user, sent } = renderReminders({
        push: { permission: 'granted', subscribedWith: [9, 9, 9] },
      });

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
    });

    it('explains a dismissed prompt and changes nothing', async () => {
      const { user, sent } = renderReminders({ push: { answer: 'default' } });

      await user.click(await reminderSwitch());

      expect(await screen.findByText(REMINDER_COPY.enableFailed.dismissed)).toBeInTheDocument();
      expect(await reminderSwitch()).not.toBeChecked();
      expect(sent('POST', '/api/push/subscriptions')).toHaveLength(0);
      expect(sent('PUT', '/api/reminders')).toHaveLength(0);
    });

    it('shows how to allow notifications again when the learner blocks them', async () => {
      const { user } = renderReminders({ push: { answer: 'denied' } });

      await user.click(await reminderSwitch());

      expect(
        await screen.findByRole('region', { name: REMINDER_COPY.states.denied.title }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: REMINDER_COPY.toggle.label })).toBeNull();
    });

    it('keeps the account setting when the device cannot be registered', async () => {
      const { user, sent } = renderReminders({
        routes: {
          'POST /api/push/subscriptions': () =>
            problemResponse({ status: 400, code: 'push_service_not_supported' }),
        },
      });

      await user.click(await reminderSwitch());

      expect(
        await screen.findByText(REMINDER_COPY.enableFailed.pushServiceNotSupported),
      ).toBeInTheDocument();
      expect(sent('PUT', '/api/reminders')).toHaveLength(0);
    });

    it('ends the subscription the backend could not register', async () => {
      const { browser, user } = renderReminders({
        routes: {
          'POST /api/push/subscriptions': () => problemResponse({ status: 503, code: 'down' }),
        },
      });

      await user.click(await reminderSwitch());

      expect(await screen.findByText(REMINDER_COPY.enableFailed.failed)).toBeInTheDocument();
      expect(browser.state.subscription, 'unsubscribed').toBeNull();
      expect(await reminderSwitch()).not.toBeChecked();
    });
  });

  describe('switching off', () => {
    const on: Setup = {
      push: { permission: 'granted', subscribedWith: SERVER_KEY_BYTES },
      settings: reminderSettings({ enabled: true }),
      devices: [device(ENDPOINT)],
    };

    it('unsubscribes, forgets the device and turns the reminders off', async () => {
      const { browser, user, body, sent } = renderReminders(on);

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      expect(browser.state.subscription, 'unsubscribed').toBeNull();
      expect(await body('DELETE', '/api/push/subscriptions')).toEqual({ endpoint: ENDPOINT });
      expect(await body('PUT', '/api/reminders')).toEqual({
        ...reminderSettings(),
        enabled: false,
      });
      expect(await screen.findByText(REMINDER_COPY.disabled)).toBeInTheDocument();
    });

    it('leaves the reminders of other devices on', async () => {
      const { user, sent } = renderReminders({
        ...on,
        devices: [device(ENDPOINT), device('https://web.push.apple.com/other')],
      });

      await user.click(await reminderSwitch());

      await waitFor(() => expect(sent('DELETE', '/api/push/subscriptions')).toHaveLength(1));
      expect(await screen.findByText(REMINDER_COPY.otherDevices(1))).toBeInTheDocument();
      expect(sent('PUT', '/api/reminders')).toHaveLength(0);
    });

    it('waits for the device list before it decides about the other devices', async () => {
      const list = heldBack(() =>
        jsonResponse([device(ENDPOINT), device('https://web.push.apple.com/other')]),
      );
      const { user, sent } = renderReminders({
        ...on,
        routes: { 'GET /api/push/subscriptions': list.route },
      });

      await user.click(await reminderSwitch());
      expect(sent('DELETE', '/api/push/subscriptions')).toHaveLength(0);

      list.release();
      expect(await screen.findByText(REMINDER_COPY.disabled)).toBeInTheDocument();
      expect(sent('DELETE', '/api/push/subscriptions')).toHaveLength(1);
      expect(sent('PUT', '/api/reminders'), 'the other device keeps them').toHaveLength(0);
    });

    it('keeps a time saved a moment before', async () => {
      const timeSave = heldBack(() =>
        jsonResponse(reminderSettings({ enabled: true, time: '07:30' })),
      );
      let puts = 0;
      const { user, body, sent } = renderReminders({
        ...on,
        routes: {
          'PUT /api/reminders': (request) => (++puts === 1 ? timeSave.route() : echo(request)),
        },
      });
      const time = await screen.findByLabelText(REMINDER_COPY.time.label);

      act(() => time.focus());
      fireEvent.change(time, { target: { value: '07:30' } });
      // Leaving the field for the switch saves the time.
      await user.click(await reminderSwitch());
      await waitFor(() => expect(sent('DELETE', '/api/push/subscriptions')).toHaveLength(1));
      timeSave.release();

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(2));
      expect(await body('PUT', '/api/reminders')).toEqual(
        reminderSettings({ enabled: false, time: '07:30' }),
      );
    });
  });

  describe('times', () => {
    const on: Setup = {
      push: { permission: 'granted', subscribedWith: SERVER_KEY_BYTES },
      settings: reminderSettings({ enabled: true }),
      devices: [device(ENDPOINT)],
    };

    it('saves a new time once the learner stops turning the wheel', async () => {
      const { body, sent } = renderReminders(on);
      const time = await screen.findByLabelText(REMINDER_COPY.time.label);

      vi.useFakeTimers();
      fireEvent.change(time, { target: { value: '07:45' } });
      fireEvent.change(time, { target: { value: '07:30' } });
      expect(sent('PUT', '/api/reminders')).toHaveLength(0);
      act(() => void vi.advanceTimersByTime(SAVE_DELAY_MS));
      vi.useRealTimers();

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
      expect(await body('PUT', '/api/reminders')).toEqual(
        reminderSettings({ enabled: true, time: '07:30' }),
      );
    });

    it('saves at once when the field loses focus', async () => {
      const { sent } = renderReminders(on);
      const time = await screen.findByLabelText(REMINDER_COPY.time.label);

      fireEvent.change(time, { target: { value: '20:00' } });
      fireEvent.blur(time);

      await waitFor(() => expect(sent('PUT', '/api/reminders')).toHaveLength(1));
    });

    it('keeps a streak rescue before the daily reminder from being saved', async () => {
      const { sent } = renderReminders(on);
      const time = await screen.findByLabelText(REMINDER_COPY.time.label);

      fireEvent.change(time, { target: { value: '22:00' } });
      fireEvent.blur(time);

      expect(
        await screen.findByText(REMINDER_COPY.problems.rescueNotAfterTime),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(REMINDER_COPY.rescue.timeLabel)).toBeInvalid();
      expect(sent('PUT', '/api/reminders')).toHaveLength(0);
    });

    it('switches the streak rescue off at once', async () => {
      const { user, body } = renderReminders(on);

      await user.click(await screen.findByRole('switch', { name: REMINDER_COPY.rescue.label }));

      await waitFor(async () =>
        expect(await body('PUT', '/api/reminders')).toEqual(
          reminderSettings({ enabled: true, rescueEnabled: false }),
        ),
      );
      expect(screen.queryByLabelText(REMINDER_COPY.rescue.timeLabel)).toBeNull();
    });
  });

  describe('test reminder', () => {
    const on: Setup = {
      push: { permission: 'granted', subscribedWith: SERVER_KEY_BYTES },
      settings: reminderSettings({ enabled: true }),
    };

    it('sends one and says it is on its way', async () => {
      const { user, sent } = renderReminders(on);

      await user.click(await screen.findByRole('button', { name: REMINDER_COPY.test.button }));

      expect(await screen.findByText(REMINDER_COPY.test.sent)).toBeInTheDocument();
      expect(sent('POST', '/api/push/test')).toHaveLength(1);
    });

    it.each([
      ['no_push_devices', 409, REMINDER_COPY.test.noDevice],
      ['too_many_requests', 429, REMINDER_COPY.test.tooMany],
    ])('explains %s', async (code, status, text) => {
      const { user } = renderReminders({
        ...on,
        routes: { 'POST /api/push/test': () => problemResponse({ status, code }) },
      });

      await user.click(await screen.findByRole('button', { name: REMINDER_COPY.test.button }));

      expect(await screen.findByText(text)).toBeInTheDocument();
    });

    it('says when no device received it', async () => {
      const { user } = renderReminders({
        ...on,
        routes: {
          'POST /api/push/test': () =>
            jsonResponse({ devices: 1, delivered: 0, removed: 1, notification: {} }),
        },
      });

      await user.click(await screen.findByRole('button', { name: REMINDER_COPY.test.button }));

      expect(await screen.findByText(REMINDER_COPY.test.notDelivered)).toBeInTheDocument();
    });
  });

  describe('when reminders are not possible here', () => {
    it('guides iPhone Safari to the home screen first', async () => {
      renderReminders({ push: { userAgent: USER_AGENTS.iphone, noPush: true } });

      const guide = await screen.findByRole('region', {
        name: REMINDER_COPY.states.install.title,
      });
      expect(
        within(guide).getByText(
          'Tippe auf Teilen → Zum Home-Bildschirm, dann öffne Lingora von dort.',
        ),
      ).toBeInTheDocument();
      expect(
        within(guide).getByRole('img', { name: REMINDER_COPY.states.install.illustration }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: REMINDER_COPY.toggle.label })).toBeNull();
    });

    it('offers the switch in the home-screen app on iPhone', async () => {
      renderReminders({ push: { userAgent: USER_AGENTS.iphone, installed: true } });

      expect(await reminderSwitch()).toBeInTheDocument();
      expect(screen.getByText(REMINDER_COPY.installed)).toBeInTheDocument();
    });

    it.each([
      ['in a browser tab', false, REMINDER_COPY.states.denied.steps.androidBrowser],
      ['in the installed app', true, REMINDER_COPY.states.denied.steps.android],
    ])('explains blocked notifications on Android %s', async (_, installed, steps) => {
      renderReminders({
        push: { permission: 'denied', userAgent: USER_AGENTS.android, installed },
      });

      const notice = await screen.findByRole('region', {
        name: REMINDER_COPY.states.denied.title,
      });
      expect(
        within(notice)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(steps);
    });

    it('says when the server has no web push', async () => {
      renderReminders({ config: { available: false } });

      expect(
        await screen.findByRole('region', { name: REMINDER_COPY.states.serverUnavailable.title }),
      ).toBeInTheDocument();
    });

    it('says when the browser cannot receive push', async () => {
      renderReminders({ push: { worker: false } });

      expect(
        await screen.findByRole('region', { name: REMINDER_COPY.states.unsupported.title }),
      ).toBeInTheDocument();
    });
  });

  it('suggests installing the app in a browser tab', async () => {
    renderReminders();

    expect(await screen.findByText(REMINDER_COPY.installTip)).toBeInTheDocument();
  });
});
