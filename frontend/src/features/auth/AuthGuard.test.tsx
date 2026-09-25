import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { AuthStatus } from '../../api/types';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { AuthGuard } from './AuthGuard';
import { authRedirect, type AuthArea } from './authRoutes';

const SETUP_REQUIRED: AuthStatus = { authenticated: false, setupRequired: true };
const SIGNED_OUT: AuthStatus = { authenticated: false, setupRequired: false };
const SIGNED_IN: AuthStatus = { authenticated: true, setupRequired: false, displayName: 'Erza' };

function renderApp(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AuthGuard area="setup" />,
        children: [{ path: '/setup', element: <h1>Einrichtung</h1> }],
      },
      {
        element: <AuthGuard area="signedOut" />,
        children: [{ path: '/login', element: <h1>Anmeldung</h1> }],
      },
      {
        element: <AuthGuard area="signedIn" />,
        children: [
          { path: '/', element: <h1>Lernpfad</h1> },
          { path: '/profil', element: <h1>Profil</h1> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return router;
}

function answerStatus(status: AuthStatus) {
  stubApi({ 'GET /api/auth/status': () => jsonResponse(status) });
}

describe('AuthGuard', () => {
  it('sends a fresh instance to the setup', async () => {
    answerStatus(SETUP_REQUIRED);
    const router = renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Einrichtung' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/setup');
  });

  it('sends a signed-out visitor to the login', async () => {
    answerStatus(SIGNED_OUT);
    const router = renderApp('/profil');

    expect(await screen.findByRole('heading', { name: 'Anmeldung' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('keeps the setup closed once an account exists', async () => {
    answerStatus(SIGNED_OUT);
    const router = renderApp('/setup');

    expect(await screen.findByRole('heading', { name: 'Anmeldung' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('sends a signed-in user from the login into the app', async () => {
    answerStatus(SIGNED_IN);
    const router = renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('lets a signed-in user open the requested page', async () => {
    answerStatus(SIGNED_IN);
    renderApp('/profil');

    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });

  it('shows the splash while the status loads', () => {
    stubApi({ 'GET /api/auth/status': () => new Promise<Response>(() => undefined) });
    renderApp('/');

    expect(screen.getByRole('status')).toHaveTextContent('Lingora wird geladen');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('offers a retry when the status cannot be loaded', async () => {
    stubApi({});
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Keine Verbindung' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeEnabled();
  });
});

describe('authRedirect', () => {
  it.each<[AuthStatus, AuthArea, string | undefined]>([
    [SETUP_REQUIRED, 'setup', undefined],
    [SETUP_REQUIRED, 'signedOut', '/setup'],
    [SETUP_REQUIRED, 'signedIn', '/setup'],
    [SIGNED_OUT, 'setup', '/login'],
    [SIGNED_OUT, 'signedOut', undefined],
    [SIGNED_OUT, 'signedIn', '/login'],
    [SIGNED_IN, 'setup', '/'],
    [SIGNED_IN, 'signedOut', '/'],
    [SIGNED_IN, 'signedIn', undefined],
  ])('status %o in area %s redirects to %s', (status, area, expected) => {
    expect(authRedirect(status, area)).toBe(expected);
  });
});
