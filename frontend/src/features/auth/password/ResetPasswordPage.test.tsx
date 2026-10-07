import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));

type Routes = Parameters<typeof stubApi>[0];

function renderReset(search: string, routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(authStatus()),
    'POST /api/auth/password-reset/confirm': () => new Response(null, { status: 204 }),
    ...routes,
  });
  renderRoutes(
    [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/passwort-vergessen', element: screenNamed('Passwort vergessen') },
      { path: '/anmelden', element: screenNamed('Anmeldung') },
    ],
    { pathname: '/reset-password', search },
  );
  return { requests, user: userEvent.setup() };
}

async function choose(user: ReturnType<typeof userEvent.setup>, password: string, again: string) {
  await user.type(screen.getByLabelText('Neues Passwort'), password);
  await user.type(screen.getByLabelText('Passwort wiederholen'), again);
  await user.click(screen.getByRole('button', { name: 'Passwort speichern' }));
}

describe('ResetPasswordPage', () => {
  it('explains a link without token and offers a new one', () => {
    renderReset('');

    expect(screen.getByRole('heading', { name: 'Link ungültig' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Neuen Link anfordern' })).toHaveAttribute(
      'href',
      '/passwort-vergessen',
    );
  });

  it('checks length and confirmation before saving', async () => {
    const { requests, user } = renderReset('?token=abc');

    await choose(user, 'kurz', 'anders');

    expect(screen.getByLabelText('Neues Passwort')).toHaveAccessibleDescription(
      'Mindestens 8 Zeichen, bitte.',
    );
    expect(screen.getByLabelText('Passwort wiederholen')).toHaveAccessibleDescription(
      'Die Passwörter stimmen nicht überein.',
    );
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('saves the new password with the token and leads to the sign-in', async () => {
    const { requests, user } = renderReset('?token=abc');

    await choose(user, 'neuGeheim1', 'neuGeheim1');

    expect(await screen.findByRole('heading', { name: 'Passwort geändert!' })).toBeInTheDocument();
    const confirm = requests.find((request) => request.method === 'POST');
    expect(await confirm?.json()).toEqual({ token: 'abc', newPassword: 'neuGeheim1' });
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      '/anmelden',
    );
  });

  it.each([
    ['token_expired', 'Link abgelaufen'],
    ['token_invalid', 'Link ungültig'],
  ])('turns %s into "%s" with a way to a new link', async (code, title) => {
    const { user } = renderReset('?token=abc', {
      'POST /api/auth/password-reset/confirm': () => problemResponse({ status: 410, code }),
    });

    await choose(user, 'neuGeheim1', 'neuGeheim1');

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Neuen Link anfordern' })).toBeInTheDocument();
  });

  it('reports a connection problem and keeps the form', async () => {
    const { user } = renderReset('?token=abc', {
      'POST /api/auth/password-reset/confirm': () => Promise.reject(new TypeError('offline')),
    });

    await choose(user, 'neuGeheim1', 'neuGeheim1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
    expect(screen.getByLabelText('Neues Passwort')).toHaveValue('neuGeheim1');
  });
});
