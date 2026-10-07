import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '../../components/ui/toastStore';
import { account, profile } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { ChangeDisplayNamePage } from './ChangeDisplayNamePage';

type Routes = Parameters<typeof stubApi>[0];

function renderNamePage(routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(profile()),
    'GET /api/account': () => jsonResponse(account()),
    'GET /api/auth/status': () => jsonResponse({}),
    'PUT /api/account/display-name': () => jsonResponse(account({ displayName: 'Mira' })),
    ...routes,
  });
  const { router } = renderRoutes(
    [
      { path: '/profil/name', element: <ChangeDisplayNamePage /> },
      { path: '/profil', element: screenNamed('Profil') },
    ],
    '/profil/name',
  );
  const changes = () => requests.filter((request) => request.method === 'PUT');
  return { changes, router, user: userEvent.setup() };
}

const nameField = () => screen.findByLabelText('Dein Name');
const save = () => screen.getByRole('button', { name: 'Speichern' });

beforeEach(() => {
  useToastStore.setState({ current: null });
});

describe('ChangeDisplayNamePage', () => {
  it('saves the trimmed name and returns to the profile', async () => {
    const { changes, router, user } = renderNamePage();

    const field = await nameField();
    expect(field).toHaveValue('Erza');
    await user.clear(field);
    await user.type(field, '  Mira ');
    await user.click(save());

    await expect.poll(() => router.state.location.pathname).toBe('/profil');
    expect(await changes()[0]?.json()).toEqual({ displayName: 'Mira' });
    expect(useToastStore.getState().current?.message).toBe('Name gespeichert');
  });

  it('needs a name', async () => {
    const { changes, user } = renderNamePage();

    await user.clear(await nameField());
    await user.click(save());

    expect(await nameField()).toHaveAccessibleDescription('Bitte gib einen Namen ein.');
    expect(changes()).toHaveLength(0);
  });

  it('goes back without a request when the name stayed the same', async () => {
    const { changes, router, user } = renderNamePage();

    await nameField();
    await user.click(save());

    expect(router.state.location.pathname).toBe('/profil');
    expect(changes()).toHaveLength(0);
  });

  it('reports a failed save', async () => {
    const { user } = renderNamePage({
      'PUT /api/account/display-name': () => Promise.reject(new TypeError('offline')),
    });

    await user.type(await nameField(), 'x');
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
  });
});
