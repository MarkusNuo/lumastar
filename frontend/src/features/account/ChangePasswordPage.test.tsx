import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '../../components/ui/toastStore';
import { profile } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { ChangePasswordPage } from './ChangePasswordPage';

type Routes = Parameters<typeof stubApi>[0];

function renderPasswordPage(routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse({ ...profile(), email: 'erza@example.ch' }),
    'GET /api/account': () => jsonResponse({}),
    'GET /api/auth/status': () => jsonResponse({}),
    'PUT /api/account/password': () => new Response(null, { status: 204 }),
    ...routes,
  });
  const { router } = renderRoutes(
    [
      { path: '/profil/passwort', element: <ChangePasswordPage /> },
      { path: '/profil', element: screenNamed('Profil') },
    ],
    '/profil/passwort',
  );
  const changes = () => requests.filter((request) => request.method === 'PUT');
  return { changes, router, user: userEvent.setup() };
}

async function changePassword(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
) {
  if (current) await user.type(screen.getByLabelText('Aktuelles Passwort'), current);
  if (next) await user.type(screen.getByLabelText('Neues Passwort'), next);
  await user.click(screen.getByRole('button', { name: 'Passwort ändern' }));
}

beforeEach(() => {
  useToastStore.setState({ current: null });
});

describe('ChangePasswordPage', () => {
  it('changes the password with the current one and returns to the profile', async () => {
    const { changes, router, user } = renderPasswordPage();

    await changePassword(user, 'geheim123', 'neuGeheim1');

    await expect.poll(() => router.state.location.pathname).toBe('/profil');
    expect(await changes()[0]?.json()).toEqual({
      currentPassword: 'geheim123',
      newPassword: 'neuGeheim1',
    });
    expect(useToastStore.getState().current?.message).toBe('Passwort geändert');
  });

  it('checks both fields first', async () => {
    const { changes, user } = renderPasswordPage();

    await changePassword(user, '', 'kurz');

    expect(screen.getByLabelText('Aktuelles Passwort')).toHaveAccessibleDescription(
      'Bitte gib dein Passwort ein.',
    );
    expect(screen.getByLabelText('Neues Passwort')).toHaveAccessibleDescription(
      'Mindestens 8 Zeichen, bitte.',
    );
    expect(changes()).toHaveLength(0);
  });

  it('says so when the current password is wrong', async () => {
    const { user } = renderPasswordPage({
      'PUT /api/account/password': () => problemResponse({ status: 403, code: 'invalid_password' }),
    });

    await changePassword(user, 'falsch123', 'neuGeheim1');

    const current = screen.getByLabelText('Aktuelles Passwort');
    await expect.poll(() => current.getAttribute('aria-invalid')).toBe('true');
    expect(current).toHaveAccessibleDescription('Dein aktuelles Passwort stimmt nicht.');
  });

  it('waits out the throttle after too many wrong passwords', async () => {
    const { user } = renderPasswordPage({
      'PUT /api/account/password': () =>
        problemResponse({ status: 429, code: 'login_throttled', retryAfterSeconds: 60 }),
    });

    await changePassword(user, 'falsch123', 'neuGeheim1');

    expect(await screen.findByRole('button', { name: 'Warten (1:00)' })).toBeDisabled();
  });
});
