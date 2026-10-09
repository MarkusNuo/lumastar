import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter, Link, RouterProvider, useSearchParams } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { screenNamed } from '../test/router';
import { useGoBack } from './useGoBack';

function ScreenWithBack() {
  const goBack = useGoBack('/');
  const [, setParams] = useSearchParams();
  return (
    <>
      <button type="button" onClick={() => setParams({ month: '2026-10' }, { replace: true })}>
        Korrigieren
      </button>
      <button type="button" onClick={goBack}>
        Zurück
      </button>
    </>
  );
}

let router: ReturnType<typeof createBrowserRouter> | undefined;

/** Opens the app at `url` in a fresh browser tab, i.e. without any earlier entry of the app. */
function openDirectly(url: string) {
  window.history.replaceState(null, '', url);
  router = createBrowserRouter([
    { path: '/', element: screenNamed('Lernpfad') },
    { path: '/liste', element: <Link to="/screen">Öffnen</Link> },
    { path: '/screen', element: <ScreenWithBack /> },
  ]);
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), location: () => router?.state.location };
}

afterEach(() => {
  router?.dispose();
  router = undefined;
});

describe('useGoBack', () => {
  it('leads to the fallback on a screen opened directly', async () => {
    const { user, location } = openDirectly('/screen');

    await user.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
    expect(location()?.pathname).toBe('/');
  });

  it('still leads to the fallback after a replace navigation on a screen opened directly', async () => {
    const { user, location } = openDirectly('/screen');
    await user.click(screen.getByRole('button', { name: 'Korrigieren' }));
    await waitFor(() => expect(location()?.search).toBe('?month=2026-10'));

    await user.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
    expect(location()?.pathname).toBe('/');
  });

  it('goes back one entry when the screen was opened in the app', async () => {
    const { user, location } = openDirectly('/liste');
    await user.click(screen.getByRole('link', { name: 'Öffnen' }));
    await user.click(await screen.findByRole('button', { name: 'Korrigieren' }));
    await waitFor(() => expect(location()?.search).toBe('?month=2026-10'));

    await user.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByRole('link', { name: 'Öffnen' })).toBeInTheDocument();
    expect(location()?.pathname).toBe('/liste');
  });
});
