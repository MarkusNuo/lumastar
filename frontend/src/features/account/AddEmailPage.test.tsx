import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '../../components/ui/toastStore';
import { account, authStatus, profile } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import type { Me } from '../auth/interimApi';
import { emailStepRedirect } from './accountRoutes';
import { AddEmailPage } from './AddEmailPage';
import { EmailRequiredGuard } from './EmailRequiredGuard';
import { useResendCooldown } from './verification/resendCooldown';

type Routes = Parameters<typeof stubApi>[0];

const LEGACY: Me = { ...profile({ onboardingStep: 'done' }), emailRequired: true };

/** The legacy account until an address is saved; `stillRequired` keeps it waiting for the link. */
function renderStep(routes: Routes = {}, stillRequired = false) {
  let saved = false;
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(authStatus({ authenticated: true })),
    'GET /api/me': () =>
      jsonResponse(
        saved
          ? {
              ...LEGACY,
              email: 'erza@example.ch',
              emailVerified: false,
              emailRequired: stillRequired,
            }
          : LEGACY,
      ),
    'GET /api/account': () => jsonResponse(account({ emailVerified: false })),
    'PUT /api/account/email': () => {
      saved = true;
      return jsonResponse(account({ emailVerified: false }));
    },
    ...routes,
  });
  const { router } = renderRoutes(
    [
      {
        element: <EmailRequiredGuard />,
        children: [
          { path: '/e-mail-hinzufuegen', element: <AddEmailPage /> },
          { path: '/', element: screenNamed('Lernpfad') },
        ],
      },
    ],
    '/',
  );
  return { requests, router, user: userEvent.setup() };
}

async function addEmail(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(await screen.findByLabelText('E-Mail-Adresse'), email);
  await user.type(screen.getByLabelText('Passwort'), 'geheim123');
  await user.click(screen.getByRole('button', { name: 'Speichern und weiter' }));
}

beforeEach(() => {
  useResendCooldown.getState().start(0);
  useToastStore.setState({ current: null });
});

describe('AddEmailPage', () => {
  it('asks the former single-user account for its address before anything else', async () => {
    const { router } = renderStep();

    expect(
      await screen.findByRole('heading', { name: 'Eine Sache noch: deine E-Mail-Adresse' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/e-mail-hinzufuegen');
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
  });

  it('saves the address with the password and continues into the app', async () => {
    const { requests, router, user } = renderStep();

    await addEmail(user, ' erza@example.ch ');

    expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    const change = requests.find((request) => request.method === 'PUT');
    expect(await change?.json()).toEqual({ newEmail: 'erza@example.ch', password: 'geheim123' });
    expect(useToastStore.getState().current?.message).toBe(
      'Gespeichert! Bestätige erza@example.ch noch mit dem Link aus der E-Mail.',
    );
  });

  it('waits for the link when the backend still requires it', async () => {
    const { user } = renderStep({}, true);

    await addEmail(user, 'erza@example.ch');

    expect(
      await screen.findByRole('heading', { name: 'Bestätige deine Adresse' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link erneut senden' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ich habe bestätigt' })).toBeInTheDocument();
  });

  it.each([
    ['invalid_password', 403, 'Passwort', 'Das Passwort stimmt nicht. Versuch es nochmals.'],
    ['email_taken', 409, 'E-Mail-Adresse', 'Mit dieser E-Mail-Adresse gibt es schon ein Konto.'],
  ])('maps %s to its field', async (code, status, label, message) => {
    const { user } = renderStep({
      'PUT /api/account/email': () => problemResponse({ status, code }),
    });

    await addEmail(user, 'erza@example.ch');

    await expect.poll(() => screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
  });
});

describe('emailStepRedirect', () => {
  it.each<[boolean, string, string | undefined]>([
    [true, '/', '/e-mail-hinzufuegen'],
    [true, '/profil', '/e-mail-hinzufuegen'],
    [true, '/e-mail-hinzufuegen', undefined],
    [false, '/e-mail-hinzufuegen', '/'],
    [false, '/profil', undefined],
  ])('required %s on %s leads to %s', (required, pathname, expected) => {
    expect(emailStepRedirect(required, pathname)).toBe(expected);
  });
});
