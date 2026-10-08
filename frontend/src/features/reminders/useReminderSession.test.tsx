import { act, screen, waitFor } from '@testing-library/react';
import { Outlet } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import {
  installFakePush,
  removeFakePush,
  SERVER_KEY_BYTES,
  type FakePushOptions,
} from '../../test/fakePush';
import { profile, reminderSettings } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { openScreenMessage } from '../../sw/messages';
import { DEVICE_OWNER_KEY, rememberDeviceOwner } from './deviceOwner';
import { isTaskScreen, useReminderSession } from './useReminderSession';

function Session() {
  useReminderSession();
  return null;
}

function renderSession(entry: string, push?: FakePushOptions) {
  const browser = installFakePush(push);
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(profile({ email: 'blerta@example.ch' })),
    'GET /api/reminders': () => jsonResponse(reminderSettings({ enabled: true })),
    'GET /api/push/subscriptions': () => jsonResponse([]),
  });
  const view = renderRoutes(
    [
      {
        element: (
          <>
            <Session />
            <Outlet />
          </>
        ),
        children: [
          { path: '/', element: screenNamed('Lernpfad') },
          { path: '/statistik', element: screenNamed('Statistik') },
          { path: '/lesson/:unitId', element: screenNamed('Lektion') },
        ],
      },
    ],
    entry,
  );
  return { ...view, browser, requests };
}

afterEach(() => {
  removeFakePush();
  localStorage.clear();
});

describe('useReminderSession', () => {
  it('clears the badge and the delivered reminders when the app opens', async () => {
    const { browser } = renderSession('/');

    await waitFor(() => expect(browser.clearAppBadge).toHaveBeenCalled());
    expect(browser.notifications[0]?.close).toHaveBeenCalled();
  });

  it('clears them again when the app comes back to the front', async () => {
    const { browser } = renderSession('/');
    await waitFor(() => expect(browser.clearAppBadge).toHaveBeenCalledOnce());

    act(() => void document.dispatchEvent(new Event('visibilitychange')));

    await waitFor(() => expect(browser.clearAppBadge).toHaveBeenCalledTimes(2));
  });

  it("shows a tapped reminder's screen in the running app", async () => {
    const { browser, router } = renderSession('/statistik');
    await screen.findByText('Statistik');

    act(() => void browser.postFromWorker(openScreenMessage('/')));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('leaves a running lesson alone', async () => {
    const { browser, router } = renderSession('/lesson/a1_u01_greetings');
    await screen.findByText('Lektion');

    act(() => void browser.postFromWorker(openScreenMessage('/')));

    expect(router.state.location.pathname).toBe('/lesson/a1_u01_greetings');
  });

  it('ends the subscription another learner left behind when the session starts', async () => {
    await rememberDeviceOwner('ardit@example.ch');
    const { browser, requests } = renderSession('/', {
      permission: 'granted',
      subscribedWith: SERVER_KEY_BYTES,
    });

    await waitFor(() => expect(browser.state.subscription).toBeNull());
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(0);
    expect(localStorage.getItem(DEVICE_OWNER_KEY)).toBeNull();
  });

  it('ignores other messages of the worker', async () => {
    const { browser, router } = renderSession('/statistik');
    await screen.findByText('Statistik');

    act(() => void browser.postFromWorker({ type: 'SKIP_WAITING' }));

    expect(router.state.location.pathname).toBe('/statistik');
  });
});

describe('isTaskScreen', () => {
  it.each([
    ['/lesson/a1_u01_greetings', true],
    ['/wiederholen/lektion', true],
    ['/statistik/ueben/grammar.article', true],
    ['/checkpoint/A1.2', true],
    ['/einstufung/test', true],
    ['/einstufung/ergebnis/42', true],
    ['/plan', true],
    ['/weiter', true],
    ['/profil/name', true],
    ['/profil/e-mail', true],
    ['/profil/passwort', true],
    ['/profil/konto-loeschen', true],
    ['/e-mail-hinzufuegen', true],
    ['/', false],
    ['/einstufung', false],
    ['/profil', false],
    ['/wiederholen', false],
    ['/profil/erinnerungen', false],
  ])('%s is a task screen: %s', (pathname, task) => {
    expect(isTaskScreen(pathname)).toBe(task);
  });
});
