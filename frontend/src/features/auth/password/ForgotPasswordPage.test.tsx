import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { AuthStatus } from '../../../api/types';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { ForgotPasswordPage, type ForgotPasswordState } from './ForgotPasswordPage';

type Routes = Parameters<typeof stubApi>[0];

function renderForgot(
  state?: ForgotPasswordState,
  routes: Routes = {},
  status: AuthStatus = authStatus(),
) {
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(status),
    'POST /api/auth/password-reset': () => new Response(null, { status: 202 }),
    ...routes,
  });
  renderRoutes(
    [
      { path: '/passwort-vergessen', element: <ForgotPasswordPage /> },
      { path: '/anmelden', element: screenNamed('Anmeldung') },
    ],
    { pathname: '/passwort-vergessen', state },
  );
  const posts = () => requests.filter((request) => request.method === 'POST');
  return { posts, user: userEvent.setup() };
}

const emailField = () => screen.getByLabelText('E-Mail-Adresse');
const submit = () => screen.getByRole('button', { name: 'Link senden' });

describe('ForgotPasswordPage', () => {
  it('takes over the address typed on the sign-in', () => {
    renderForgot({ email: 'erza@example.ch' });

    expect(emailField()).toHaveValue('erza@example.ch');
  });

  it('checks the address before asking for a link', async () => {
    const { posts, user } = renderForgot();

    await user.type(emailField(), 'erza');
    await user.click(submit());

    expect(emailField()).toHaveAccessibleDescription(
      'Diese E-Mail-Adresse sieht nicht vollständig aus.',
    );
    expect(posts()).toHaveLength(0);
  });

  it('confirms neutrally, without telling whether the account exists', async () => {
    const { posts, user } = renderForgot();

    await user.type(emailField(), ' erza@example.ch ');
    await user.click(submit());

    expect(
      await screen.findByRole('heading', { name: 'Schau in dein Postfach' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Falls es ein Konto mit erza@example.ch gibt, ist ein Link/),
    ).toBeInTheDocument();
    expect(await posts()[0]?.json()).toEqual({ email: 'erza@example.ch' });
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      '/anmelden',
    );
  });

  it('leads a signed-in learner whose reset link expired back into the app', async () => {
    const { user } = renderForgot(
      { email: 'erza@example.ch' },
      {},
      authStatus({ authenticated: true }),
    );

    await user.click(submit());

    expect(await screen.findByRole('link', { name: 'Weiter zu Lumastar' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('waits out the throttle with a countdown', async () => {
    const { user } = renderForgot(
      { email: 'erza@example.ch' },
      {
        'POST /api/auth/password-reset': () =>
          problemResponse({ status: 429, code: 'too_many_requests', retryAfterSeconds: 30 }),
      },
    );

    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Versuche');
    expect(screen.getByRole('button', { name: 'Warten (0:30)' })).toBeDisabled();
  });

  it('reports a connection problem', async () => {
    const { user } = renderForgot(
      { email: 'erza@example.ch' },
      { 'POST /api/auth/password-reset': () => Promise.reject(new TypeError('offline')) },
    );

    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
  });

  it('shows an address the server refuses on its field', async () => {
    const { user } = renderForgot(
      { email: 'erza@example.ch' },
      {
        'POST /api/auth/password-reset': () =>
          problemResponse({
            status: 400,
            code: 'validation_failed',
            errors: [{ field: 'email', message: 'must be a well-formed email address' }],
          }),
      },
    );

    await user.click(submit());

    await expect.poll(() => emailField().getAttribute('aria-invalid')).toBe('true');
    expect(emailField()).toHaveAccessibleDescription(
      'Diese E-Mail-Adresse sieht nicht vollständig aus.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
