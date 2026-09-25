import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { useAuthStatus } from './authHooks';
import { LoginPage } from './LoginPage';

/** Observes the status like the auth guard does, so invalidating it refetches. */
function StatusProbe() {
  const status = useAuthStatus();
  return <output>{status.data?.authenticated ? 'angemeldet' : 'abgemeldet'}</output>;
}

async function signIn(password: string) {
  const user = userEvent.setup();
  renderWithQueryClient(<LoginPage />);
  await user.type(screen.getByLabelText('Passwort'), password);
  await user.click(screen.getByRole('button', { name: 'Anmelden' }));
}

describe('LoginPage', () => {
  it('asks for the password when it is empty', async () => {
    const requests = stubApi({});
    const user = userEvent.setup();
    renderWithQueryClient(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(screen.getByLabelText('Passwort')).toHaveAccessibleDescription(
      'Bitte gib dein Passwort ein.',
    );
    expect(requests).toHaveLength(0);
  });

  it('refreshes the auth status after a successful sign-in', async () => {
    let signedIn = false;
    const requests = stubApi({
      'POST /api/auth/login': () => {
        signedIn = true;
        return new Response(null, { status: 204 });
      },
      'GET /api/auth/status': () => jsonResponse({ authenticated: signedIn, setupRequired: false }),
    });
    const user = userEvent.setup();
    renderWithQueryClient(
      <>
        <StatusProbe />
        <LoginPage />
      </>,
    );

    await user.type(screen.getByLabelText('Passwort'), 'geheim123{Enter}');

    expect(await screen.findByText('angemeldet')).toBeInTheDocument();
    const login = requests.find((request) => request.method === 'POST');
    expect(await login?.json()).toEqual({ password: 'geheim123' });
  });

  it('says so when the password is wrong', async () => {
    stubApi({
      'POST /api/auth/login': () => problemResponse({ status: 401, code: 'invalid_credentials' }),
    });

    await signIn('falsch123');

    const field = screen.getByLabelText('Passwort');
    await expect.poll(() => field.getAttribute('aria-invalid')).toBe('true');
    expect(field).toHaveAccessibleDescription('Das Passwort stimmt nicht. Versuch es nochmals.');
  });

  it('locks the button with a countdown while sign-in is throttled', async () => {
    stubApi({
      'POST /api/auth/login': () =>
        problemResponse({ status: 429, code: 'login_throttled', retryAfterSeconds: 75 }),
    });

    await signIn('falsch123');

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Fehlversuche');
    expect(screen.getByRole('button', { name: 'Warten (1:15)' })).toBeDisabled();
  });

  it('reports a connection problem', async () => {
    stubApi({});

    await signIn('geheim123');

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
  });
});
