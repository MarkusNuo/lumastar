import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { authStatusQuery } from '../authHooks';
import type { AuthStatus } from '../../../api/types';
import { LoginPage } from './LoginPage';

type Routes = Parameters<typeof stubApi>[0];

function renderLogin(status: AuthStatus = authStatus(), routes: Routes = {}) {
  let signedIn = false;
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse({ ...status, authenticated: signedIn }),
    'POST /api/auth/login': () => {
      signedIn = true;
      return new Response(null, { status: 204 });
    },
    ...routes,
  });
  const { router, queryClient } = renderRoutes(
    [
      { path: '/anmelden', element: <LoginPage /> },
      { path: '/passwort-vergessen', element: screenNamed('Passwort vergessen') },
      { path: '/anmelden/frueheres-konto', element: screenNamed('Früheres Konto') },
    ],
    '/anmelden',
  );
  const statusLoaded = () =>
    waitFor(() =>
      expect(queryClient.getQueryState(authStatusQuery.queryKey)?.status).toBe('success'),
    );
  return { requests, router, statusLoaded, user: userEvent.setup() };
}

const emailField = () => screen.getByLabelText('E-Mail-Adresse');
const passwordField = () => screen.getByLabelText('Passwort');
const submit = () => screen.getByRole('button', { name: 'Anmelden' });

describe('LoginPage', () => {
  it('asks for e-mail and password before sending anything', async () => {
    const { requests, user } = renderLogin();
    await screen.findByRole('link', { name: 'Konto erstellen' });

    await user.click(submit());

    expect(emailField()).toHaveAccessibleDescription('Bitte gib deine E-Mail-Adresse ein.');
    expect(passwordField()).toHaveAccessibleDescription('Bitte gib dein Passwort ein.');
    expect(emailField()).toHaveFocus();
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('signs in with the trimmed address and moves from the address to the password on Enter', async () => {
    const { requests, user } = renderLogin();

    await user.type(emailField(), '  erza@example.ch {Enter}');
    expect(passwordField()).toHaveFocus();
    await user.type(passwordField(), 'geheim123');
    await user.click(submit());

    const login = requests.find((request) => request.method === 'POST');
    expect(await login?.json()).toEqual({ email: 'erza@example.ch', password: 'geheim123' });
    await expect
      .poll(() => requests.filter((request) => request.url.endsWith('/api/auth/status')).length)
      .toBe(2);
  });

  it('says so when address or password are wrong, without telling which', async () => {
    const { user } = renderLogin(authStatus(), {
      'POST /api/auth/login': () => problemResponse({ status: 401, code: 'invalid_credentials' }),
    });

    await user.type(emailField(), 'erza@example.ch');
    await user.type(passwordField(), 'falsch123');
    await user.click(submit());

    await expect.poll(() => passwordField().getAttribute('aria-invalid')).toBe('true');
    expect(passwordField()).toHaveAccessibleDescription(
      'E-Mail-Adresse oder Passwort stimmt nicht. Versuch es nochmals.',
    );
    await user.type(passwordField(), 'x');
    expect(passwordField()).toBeValid();
  });

  it('locks the button with a countdown while sign-in is throttled', async () => {
    const { user } = renderLogin(authStatus(), {
      'POST /api/auth/login': () =>
        problemResponse({ status: 429, code: 'login_throttled', retryAfterSeconds: 75 }),
    });

    await user.type(emailField(), 'erza@example.ch');
    await user.type(passwordField(), 'falsch123');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Fehlversuche');
    expect(screen.getByRole('button', { name: 'Warten (1:15)' })).toBeDisabled();
  });

  it('reports a connection problem', async () => {
    const { user } = renderLogin(authStatus(), {
      'POST /api/auth/login': () => Promise.reject(new TypeError('offline')),
    });

    await user.type(emailField(), 'erza@example.ch');
    await user.type(passwordField(), 'geheim123');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
  });

  it.each([
    ['email', 'Diese E-Mail-Adresse sieht nicht vollständig aus.'],
    ['password', 'E-Mail-Adresse oder Passwort stimmt nicht. Versuch es nochmals.'],
  ])('shows a refused %s on its field, not as a connection problem', async (field, message) => {
    const { user } = renderLogin(authStatus(), {
      'POST /api/auth/login': () =>
        problemResponse({
          status: 400,
          code: 'validation_failed',
          errors: [{ field, message: 'size must be between 0 and 254' }],
        }),
    });
    const input = field === 'email' ? emailField : passwordField;

    await user.type(emailField(), 'erza@example.ch');
    await user.type(passwordField(), 'geheim123');
    await user.click(submit());

    await expect.poll(() => input().getAttribute('aria-invalid')).toBe('true');
    expect(input()).toHaveAccessibleDescription(message);
    expect(screen.queryByText(/Prüfe deine Verbindung/)).not.toBeInTheDocument();
  });

  it('asks to check the input when the server refuses something else', async () => {
    const { user } = renderLogin(authStatus(), {
      'POST /api/auth/login': () =>
        problemResponse({ status: 400, code: 'validation_failed', errors: [] }),
    });

    await user.type(emailField(), 'erza@example.ch');
    await user.type(passwordField(), 'geheim123');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deine Angaben wurden nicht angenommen. Prüfe sie bitte.',
    );
  });

  it('hands the typed address to "Passwort vergessen?"', async () => {
    const { router, user } = renderLogin();

    await user.type(emailField(), 'erza@example.ch');
    await user.click(screen.getByRole('link', { name: 'Passwort vergessen?' }));

    expect(router.state.location.pathname).toBe('/passwort-vergessen');
    expect(router.state.location.state).toEqual({ email: 'erza@example.ch' });
  });

  it('offers the former single-user account only while it can sign in', async () => {
    renderLogin(authStatus({ legacyLoginAvailable: true }));

    expect(
      await screen.findByRole('link', { name: 'Konto aus der früheren Einzelnutzer-Version?' }),
    ).toHaveAttribute('href', '/anmelden/frueheres-konto');
  });

  it('hides the legacy sign-in and the registration when neither is possible', async () => {
    const { statusLoaded } = renderLogin(authStatus({ registrationMode: 'closed' }));
    await statusLoaded();

    expect(screen.queryByRole('link', { name: /Einzelnutzer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Konto erstellen' })).not.toBeInTheDocument();
  });
});
