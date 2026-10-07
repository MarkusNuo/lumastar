import { act, screen, waitFor } from '@testing-library/react';
import { Outlet } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { installFakePush, removeFakePush } from '../../test/fakePush';
import { reminderSettings } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { openScreenMessage } from '../../sw/messages';
import { isTaskScreen, useReminderSession } from './useReminderSession';

function Session() {
  useReminderSession();
  return null;
}

function renderSession(entry: string) {
  const browser = installFakePush();
  stubApi({ 'GET /api/reminders': () => jsonResponse(reminderSettings()) });
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
  return { ...view, browser };
}

afterEach(() => {
  removeFakePush();
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
    ['/weiter', true],
    ['/', false],
    ['/wiederholen', false],
    ['/profil/erinnerungen', false],
  ])('%s is a task screen: %s', (pathname, task) => {
    expect(isTaskScreen(pathname)).toBe(task);
  });
});
