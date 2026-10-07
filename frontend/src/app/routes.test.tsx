import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Profile } from '../api/types';
import { authStatus, ONBOARDING_OPTIONS, profile } from '../test/fixtures';
import { jsonResponse, stubApi } from '../test/http';
import { renderRoutes } from '../test/router';
import { createRoutes } from './routes';

const SIGNED_IN = authStatus({ authenticated: true, displayName: 'Erza' });

function stubSignedIn(me: Profile) {
  stubApi({
    'GET /api/auth/status': () => jsonResponse(SIGNED_IN),
    'GET /api/me': () => jsonResponse(me),
    'GET /api/settings': () =>
      jsonResponse({ dailyGoalMinutes: 10, requestRetention: 0.9, timeZone: 'Europe/Zurich' }),
    'GET /api/onboarding/options': () => jsonResponse(ONBOARDING_OPTIONS),
  });
}

describe('routes', () => {
  it('starts a visitor without a session on the welcome screen', async () => {
    stubApi({ 'GET /api/auth/status': () => jsonResponse(authStatus()) });
    const { router } = renderRoutes(createRoutes(), '/');

    expect(
      await screen.findByRole('heading', { name: 'Willkommen bei Lingora!' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/willkommen');
  });

  it('lets a signed-in learner ask for a new reset link', async () => {
    stubSignedIn(profile());
    const { router } = renderRoutes(createRoutes(), '/passwort-vergessen');

    expect(await screen.findByRole('heading', { name: 'Passwort vergessen?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/passwort-vergessen');
  });

  it('keeps the former single-user account on the e-mail step', async () => {
    stubSignedIn(profile({ email: undefined, emailVerified: false, emailRequired: true }));
    const { router } = renderRoutes(createRoutes(), '/anmelden');

    expect(
      await screen.findByRole('heading', { name: 'Eine Sache noch: deine E-Mail-Adresse' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/e-mail-hinzufuegen');
  });

  it('closes the e-mail step once the account has an address', async () => {
    stubSignedIn(profile());
    const { router } = renderRoutes(createRoutes(), '/e-mail-hinzufuegen');

    expect(
      await screen.findByRole('heading', { name: 'Warum lernst du Gheg?' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });
});
