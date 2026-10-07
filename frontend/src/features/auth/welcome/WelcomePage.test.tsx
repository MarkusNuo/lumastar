import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, stubApi } from '../../../test/http';
import { renderRoutes } from '../../../test/router';
import type { RegistrationMode } from '../../../api/types';
import { WelcomePage } from './WelcomePage';

function renderWelcome(registrationMode: RegistrationMode) {
  stubApi({ 'GET /api/auth/status': () => jsonResponse(authStatus({ registrationMode })) });
  renderRoutes([{ path: '/willkommen', element: <WelcomePage /> }], '/willkommen');
}

describe('WelcomePage', () => {
  it('offers a new account and the sign-in', async () => {
    renderWelcome('open');

    expect(await screen.findByRole('link', { name: 'Konto erstellen' })).toHaveAttribute(
      'href',
      '/registrieren',
    );
    expect(screen.getByRole('link', { name: 'Ich habe schon ein Konto' })).toHaveAttribute(
      'href',
      '/anmelden',
    );
  });

  it('only offers the sign-in while registration is closed', async () => {
    renderWelcome('closed');

    expect(
      await screen.findByText('Neue Konten sind im Moment nicht möglich.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Konto erstellen' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ich habe schon ein Konto' })).toBeInTheDocument();
  });
});
