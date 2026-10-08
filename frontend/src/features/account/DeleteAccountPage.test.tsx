import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '../../components/ui/toastStore';
import { saveBlob } from '../../lib/saveFile';
import { installFakePush, removeFakePush, SERVER_KEY_BYTES } from '../../test/fakePush';
import { authStatus, profile } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { AuthGuard } from '../auth/AuthGuard';
import { DeleteAccountPage } from './DeleteAccountPage';

vi.mock('../../lib/saveFile', () => ({ saveBlob: vi.fn() }));

type Routes = Parameters<typeof stubApi>[0];

function renderDeletion(routes: Routes = {}) {
  let deleted = false;
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(authStatus({ authenticated: !deleted })),
    'GET /api/me': () => jsonResponse({ ...profile(), email: 'erza@example.ch' }),
    'DELETE /api/account': () => {
      deleted = true;
      return new Response(null, { status: 204 });
    },
    ...routes,
  });
  const { router } = renderRoutes(
    [
      {
        element: <AuthGuard area="signedIn" />,
        children: [{ path: '/profil/konto-loeschen', element: <DeleteAccountPage /> }],
      },
      {
        element: <AuthGuard area="signedOut" />,
        children: [{ path: '/willkommen', element: screenNamed('Willkommen') }],
      },
    ],
    '/profil/konto-loeschen',
  );
  const deletions = () => requests.filter((request) => request.method === 'DELETE');
  return { deletions, requests, router, user: userEvent.setup() };
}

const passwordField = () => screen.getByLabelText('Passwort');
const deleteButton = () => screen.getByRole('button', { name: 'Konto löschen' });

beforeEach(() => {
  useToastStore.setState({ current: null });
});

afterEach(() => {
  removeFakePush();
});

async function confirmDeletion(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(await screen.findByLabelText('Passwort'), password);
  await user.click(deleteButton());
  await user.click(await screen.findByRole('button', { name: 'Endgültig löschen' }));
}

describe('DeleteAccountPage', () => {
  it('explains what gets lost and that it cannot be undone', async () => {
    renderDeletion();

    expect(
      await screen.findByRole('heading', { name: 'Schade, dass du gehst!' }),
    ).toBeInTheDocument();
    expect(screen.getByText('dein Streak, deine XP und Abzeichen')).toBeInTheDocument();
    expect(screen.getByText('Das lässt sich nicht rückgängig machen.')).toBeInTheDocument();
  });

  it('offers the backup download first', async () => {
    const { requests, user } = renderDeletion({
      'GET /api/profile/export': () =>
        new Response('PK', {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="lingora-export-2026-10-07.zip"',
          },
        }),
    });

    await user.click(await screen.findByRole('button', { name: 'Backup herunterladen' }));

    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'lingora-export-2026-10-07.zip'),
    );
    expect(requests.some((request) => request.url.endsWith('/api/profile/export'))).toBe(true);
  });

  it('needs the password before it asks the last question', async () => {
    const { deletions, user } = renderDeletion();

    await user.click(await screen.findByRole('button', { name: 'Konto löschen' }));

    expect(passwordField()).toHaveAccessibleDescription('Bitte gib dein Passwort ein.');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deletions()).toHaveLength(0);
  });

  it('keeps the account when the last question is answered with no', async () => {
    const { deletions, user } = renderDeletion();

    await user.type(await screen.findByLabelText('Passwort'), 'geheim123');
    await user.click(deleteButton());
    await user.click(await screen.findByRole('button', { name: 'Konto behalten' }));

    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();
    expect(deletions()).toHaveLength(0);
  });

  it('deletes the account with the password and ends on the welcome screen', async () => {
    const { deletions, router, user } = renderDeletion();

    await user.type(await screen.findByLabelText('Passwort'), 'geheim123');
    await user.click(deleteButton());
    expect(
      await screen.findByRole('alertdialog', { name: 'Wirklich löschen?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));

    expect(await screen.findByRole('heading', { name: 'Willkommen' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/willkommen');
    expect(await deletions()[0]?.json()).toEqual({ password: 'geheim123' });
    expect(useToastStore.getState().current?.message).toBe('Dein Konto ist gelöscht. Mach’s gut!');
  });

  it("ends this browser's reminder subscription with the account", async () => {
    const browser = installFakePush({ permission: 'granted', subscribedWith: SERVER_KEY_BYTES });
    const { user } = renderDeletion();

    await confirmDeletion(user, 'geheim123');

    expect(await screen.findByRole('heading', { name: 'Willkommen' })).toBeInTheDocument();
    await waitFor(() => expect(browser.state.subscription).toBeNull());
  });

  it('keeps the reminders while the account stays', async () => {
    const browser = installFakePush({ permission: 'granted', subscribedWith: SERVER_KEY_BYTES });
    const { user } = renderDeletion({
      'DELETE /api/account': () => problemResponse({ status: 403, code: 'invalid_password' }),
    });

    await confirmDeletion(user, 'falsch123');

    await expect.poll(() => passwordField().getAttribute('aria-invalid')).toBe('true');
    expect(browser.state.subscription).not.toBeNull();
  });

  it('says so when the password is wrong and keeps everything', async () => {
    const { user } = renderDeletion({
      'DELETE /api/account': () => problemResponse({ status: 403, code: 'invalid_password' }),
    });

    await user.type(await screen.findByLabelText('Passwort'), 'falsch123');
    await user.click(deleteButton());
    await user.click(await screen.findByRole('button', { name: 'Endgültig löschen' }));

    await expect.poll(() => passwordField().getAttribute('aria-invalid')).toBe('true');
    expect(passwordField()).toHaveAccessibleDescription(
      'Das Passwort stimmt nicht. Versuch es nochmals.',
    );
  });

  it('asks to check the input when the server refuses it, not the connection', async () => {
    const { user } = renderDeletion({
      'DELETE /api/account': () =>
        problemResponse({
          status: 400,
          code: 'validation_failed',
          errors: [{ field: 'body', message: 'must not be null' }],
        }),
    });

    await user.type(await screen.findByLabelText('Passwort'), 'geheim123');
    await user.click(deleteButton());
    await user.click(await screen.findByRole('button', { name: 'Endgültig löschen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deine Angaben wurden nicht angenommen. Prüfe sie bitte.',
    );
  });
});
