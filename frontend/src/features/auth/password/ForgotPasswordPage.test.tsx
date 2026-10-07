import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { ForgotPasswordPage, type ForgotPasswordState } from './ForgotPasswordPage';

type Routes = Parameters<typeof stubApi>[0];

function renderForgot(state?: ForgotPasswordState, routes: Routes = {}) {
  const requests = stubApi({
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
  return { requests, user: userEvent.setup() };
}

const emailField = () => screen.getByLabelText('E-Mail-Adresse');
const submit = () => screen.getByRole('button', { name: 'Link senden' });

describe('ForgotPasswordPage', () => {
  it('takes over the address typed on the sign-in', () => {
    renderForgot({ email: 'erza@example.ch' });

    expect(emailField()).toHaveValue('erza@example.ch');
  });

  it('checks the address before asking for a link', async () => {
    const { requests, user } = renderForgot();

    await user.type(emailField(), 'erza');
    await user.click(submit());

    expect(emailField()).toHaveAccessibleDescription(
      'Diese E-Mail-Adresse sieht nicht vollständig aus.',
    );
    expect(requests).toHaveLength(0);
  });

  it('confirms neutrally, without telling whether the account exists', async () => {
    const { requests, user } = renderForgot();

    await user.type(emailField(), ' erza@example.ch ');
    await user.click(submit());

    expect(
      await screen.findByRole('heading', { name: 'Schau in dein Postfach' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Falls es ein Konto mit erza@example.ch gibt, ist ein Link/),
    ).toBeInTheDocument();
    expect(await requests[0]?.json()).toEqual({ email: 'erza@example.ch' });
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      '/anmelden',
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
});
