import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { LegacyLoginPage } from './LegacyLoginPage';

type Routes = Parameters<typeof stubApi>[0];

function renderLegacyLogin(legacyLoginAvailable: boolean, routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(authStatus({ legacyLoginAvailable })),
    'POST /api/auth/login': () => new Response(null, { status: 204 }),
    ...routes,
  });
  renderRoutes(
    [
      { path: '/anmelden/frueheres-konto', element: <LegacyLoginPage /> },
      { path: '/anmelden', element: screenNamed('Anmeldung') },
    ],
    '/anmelden/frueheres-konto',
  );
  return { requests, user: userEvent.setup() };
}

describe('LegacyLoginPage', () => {
  it('signs the former single-user account in with its password alone', async () => {
    const { requests, user } = renderLegacyLogin(true);

    const password = await screen.findByLabelText('Passwort');
    await waitFor(() => expect(password).toHaveFocus());
    await user.type(password, 'geheim123{Enter}');

    await expect.poll(() => requests.filter((request) => request.method === 'POST').length).toBe(1);
    const login = requests.find((request) => request.method === 'POST');
    expect(await login?.json()).toEqual({ password: 'geheim123' });
  });

  it('says so when the password is wrong', async () => {
    const { user } = renderLegacyLogin(true, {
      'POST /api/auth/login': () => problemResponse({ status: 401, code: 'invalid_credentials' }),
    });

    await user.type(await screen.findByLabelText('Passwort'), 'falsch123{Enter}');

    const field = screen.getByLabelText('Passwort');
    await expect.poll(() => field.getAttribute('aria-invalid')).toBe('true');
    expect(field).toHaveAccessibleDescription('Das Passwort stimmt nicht. Versuch es nochmals.');
  });

  it('leads back to the normal sign-in once the account has an address', async () => {
    renderLegacyLogin(false);

    expect(
      await screen.findByText(/Dein früheres Konto hat schon eine E-Mail-Adresse/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      '/anmelden',
    );
  });
});
