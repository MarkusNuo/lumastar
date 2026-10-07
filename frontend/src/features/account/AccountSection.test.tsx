import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { account } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import type { Account } from '../../api/types';
import { AccountSection } from './AccountSection';

function renderSection(data: Account = account()) {
  stubApi({ 'GET /api/account': () => jsonResponse(data) });
  const { router } = renderRoutes(
    [
      { path: '/profil', element: <AccountSection /> },
      { path: '/profil/e-mail', element: screenNamed('E-Mail-Adresse') },
      { path: '/profil/name', element: screenNamed('Anzeigename') },
      { path: '/profil/passwort', element: screenNamed('Passwort ändern') },
      { path: '/profil/konto-loeschen', element: screenNamed('Konto löschen') },
    ],
    '/profil',
  );
  return { router, user: userEvent.setup() };
}

const emailRow = () => screen.getByRole('button', { name: 'E-Mail-Adresse' });

describe('AccountSection', () => {
  it('shows the address with its confirmation and the name', async () => {
    renderSection();

    expect(await screen.findByText('erza@example.ch')).toBeInTheDocument();
    expect(emailRow()).toHaveAccessibleDescription('erza@example.ch Bestätigt');
    expect(screen.getByRole('button', { name: 'Anzeigename' })).toHaveAccessibleDescription('Erza');
  });

  it.each<[string, Partial<Account>, string]>([
    ['an unconfirmed address', { emailVerified: false }, 'erza@example.ch Nicht bestätigt'],
    ['a pending change', { pendingEmail: 'neu@example.ch' }, 'erza@example.ch Wechsel offen'],
    ['no address yet', { email: undefined, emailVerified: false }, 'Noch keine E-Mail-Adresse'],
  ])('names %s', async (_, fields, description) => {
    renderSection(account(fields));

    await screen.findByText(/example\.ch|Noch keine/);
    expect(emailRow()).toHaveAccessibleDescription(description);
  });

  it.each([
    ['E-Mail-Adresse', '/profil/e-mail'],
    ['Anzeigename', '/profil/name'],
    ['Passwort ändern', '/profil/passwort'],
    ['Konto löschen', '/profil/konto-loeschen'],
  ])('opens "%s" on its own screen', async (name, path) => {
    const { router, user } = renderSection();

    await user.click(screen.getByRole('button', { name }));

    expect(router.state.location.pathname).toBe(path);
  });
});
