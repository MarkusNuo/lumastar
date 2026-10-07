import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { account } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import type { Account } from '../../api/types';
import { ChangeEmailPage } from './ChangeEmailPage';
import { useResendCooldown } from './verification/resendCooldown';

type Routes = Parameters<typeof stubApi>[0];

function renderEmailPage(current: Account = account(), routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/account': () => jsonResponse(current),
    'GET /api/me': () => jsonResponse({}),
    'GET /api/auth/status': () => jsonResponse({}),
    'PUT /api/account/email': () =>
      jsonResponse(account({ ...current, pendingEmail: 'neu@example.ch' })),
    ...routes,
  });
  renderRoutes(
    [
      { path: '/profil/e-mail', element: <ChangeEmailPage /> },
      { path: '/profil', element: screenNamed('Profil') },
    ],
    '/profil/e-mail',
  );
  const changes = () => requests.filter((request) => request.method === 'PUT');
  return { changes, user: userEvent.setup() };
}

async function change(user: ReturnType<typeof userEvent.setup>, newEmail: string) {
  await user.type(await screen.findByLabelText('Neue E-Mail-Adresse'), newEmail);
  await user.type(screen.getByLabelText('Passwort'), 'geheim123');
  await user.click(screen.getByRole('button', { name: 'Bestätigungslink senden' }));
}

beforeEach(() => {
  useResendCooldown.getState().start(0);
});

describe('ChangeEmailPage', () => {
  it('shows the current address and whether it is confirmed', async () => {
    renderEmailPage(account({ emailVerified: false }));

    const current = await screen.findByRole('region', { name: 'Aktuelle Adresse' });
    expect(current).toHaveTextContent('erza@example.ch');
    expect(current).toHaveTextContent('Nicht bestätigt');
    expect(screen.getByRole('button', { name: 'Link erneut senden' })).toBeInTheDocument();
  });

  it('shows a pending change and how to cancel it', async () => {
    renderEmailPage(account({ pendingEmail: 'neu@example.ch' }));

    const current = await screen.findByRole('region', { name: 'Aktuelle Adresse' });
    expect(current).toHaveTextContent('Neue Adresse wartet auf Bestätigung: neu@example.ch');
    expect(current).toHaveTextContent('Gib deine aktuelle Adresse ein');
  });

  it('sends the link to the new address and says the switch follows the click', async () => {
    const { changes, user } = renderEmailPage();

    await change(user, ' Neu@Example.ch ');

    expect(await screen.findByText('Fast geschafft!')).toBeInTheDocument();
    expect(
      screen.getByText(/Wir haben einen Link an neu@example.ch geschickt/),
    ).toBeInTheDocument();
    expect(await changes()[0]?.json()).toEqual({
      newEmail: 'Neu@Example.ch',
      password: 'geheim123',
    });
    expect(screen.getByRole('link', { name: 'Zurück zum Profil' })).toHaveAttribute(
      'href',
      '/profil',
    );
  });

  it('says when an unconfirmed address was replaced at once', async () => {
    const { user } = renderEmailPage(account({ emailVerified: false }), {
      'PUT /api/account/email': () =>
        jsonResponse(account({ email: 'neu@example.ch', emailVerified: false })),
    });

    await change(user, 'neu@example.ch');

    expect(await screen.findByText('Adresse gespeichert')).toBeInTheDocument();
  });

  it('refuses the current address unless it cancels a pending change', async () => {
    const { changes, user } = renderEmailPage();

    await change(user, 'ERZA@example.ch');

    expect(screen.getByLabelText('Neue E-Mail-Adresse')).toHaveAccessibleDescription(
      'Das ist schon deine Adresse.',
    );
    expect(changes()).toHaveLength(0);
  });

  it('cancels a pending change with the current address', async () => {
    const { user } = renderEmailPage(account({ pendingEmail: 'neu@example.ch' }), {
      'PUT /api/account/email': () => jsonResponse(account()),
    });

    await change(user, 'erza@example.ch');

    expect(await screen.findByText('Wechsel abgebrochen')).toBeInTheDocument();
    expect(screen.getByText('Deine Adresse bleibt erza@example.ch.')).toBeInTheDocument();
  });

  it.each([
    ['invalid_password', 403, 'Passwort', 'Das Passwort stimmt nicht. Versuch es nochmals.'],
    [
      'email_taken',
      409,
      'Neue E-Mail-Adresse',
      'Mit dieser E-Mail-Adresse gibt es schon ein Konto.',
    ],
  ])('maps %s to its field', async (code, status, label, message) => {
    const { user } = renderEmailPage(account(), {
      'PUT /api/account/email': () => problemResponse({ status, code }),
    });

    await change(user, 'neu@example.ch');

    await expect.poll(() => screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
  });
});
