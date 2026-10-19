import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authStatus } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { AuthGuard } from './AuthGuard';
import { authRedirect, type AuthArea } from './authRoutes';
import type { AuthStatus } from '../../api/types';

const SIGNED_OUT = authStatus();
const SIGNED_IN = authStatus({ authenticated: true, displayName: 'Erza' });

function renderApp(path: string) {
  return renderRoutes(
    [
      {
        element: <AuthGuard area="signedOut" />,
        children: [
          { path: '/willkommen', element: screenNamed('Willkommen') },
          { path: '/anmelden', element: screenNamed('Anmeldung') },
          { path: '/registrieren', element: screenNamed('Registrierung') },
        ],
      },
      {
        element: <AuthGuard area="signedIn" />,
        children: [
          { path: '/', element: screenNamed('Lernpfad') },
          { path: '/profil', element: screenNamed('Profil') },
        ],
      },
    ],
    path,
  ).router;
}

function answerStatus(status: AuthStatus) {
  stubApi({ 'GET /api/auth/status': () => jsonResponse(status) });
}

describe('AuthGuard', () => {
  it('sends a visitor without a session to the welcome screen', async () => {
    answerStatus(SIGNED_OUT);
    const router = renderApp('/profil');

    expect(await screen.findByRole('heading', { name: 'Willkommen' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/willkommen');
  });

  it.each(['/willkommen', '/anmelden', '/registrieren'])(
    'sends a signed-in user from %s into the app',
    async (path) => {
      answerStatus(SIGNED_IN);
      const router = renderApp(path);

      expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    },
  );

  it('lets a signed-in user open the requested page', async () => {
    answerStatus(SIGNED_IN);
    renderApp('/profil');

    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });

  it('shows the splash while the status loads', () => {
    stubApi({ 'GET /api/auth/status': () => new Promise<Response>(() => undefined) });
    renderApp('/');

    expect(screen.getByRole('status')).toHaveTextContent('Lumastar wird geladen');
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
    [SIGNED_OUT, 'signedOut', undefined],
    [SIGNED_OUT, 'signedIn', '/willkommen'],
    [SIGNED_IN, 'signedOut', '/'],
    [SIGNED_IN, 'signedIn', undefined],
  ])('status %o in area %s redirects to %s', (status, area, expected) => {
    expect(authRedirect(status, area)).toBe(expected);
  });
});
