import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '../../../components/ui/toastStore';
import { celebrate } from '../../../lib/celebrate';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { authStatusQuery } from '../authHooks';
import type { RegistrationMode } from '../interimApi';
import { RegisterPage } from './RegisterPage';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));

type Routes = Parameters<typeof stubApi>[0];

function renderRegister(mode: RegistrationMode = 'open', routes: Routes = {}) {
  let signedIn = false;
  const requests = stubApi({
    'GET /api/auth/status': () =>
      jsonResponse(authStatus({ authenticated: signedIn, registrationMode: mode })),
    'POST /api/auth/register': () => {
      signedIn = true;
      return jsonResponse({}, 201);
    },
    ...routes,
  });
  const view = renderRoutes(
    [
      { path: '/registrieren', element: <RegisterPage /> },
      { path: '/anmelden', element: screenNamed('Anmeldung') },
    ],
    '/registrieren',
  );
  const registrations = () =>
    requests.filter((request) => request.url.endsWith('/api/auth/register'));
  return { ...view, requests, registrations, user: userEvent.setup() };
}

const field = (label: string) => screen.getByLabelText(label);
const submit = () => screen.getByRole('button', { name: 'Konto erstellen' });

async function fillIn(user: ReturnType<typeof userEvent.setup>, inviteCode?: string) {
  await user.type(await screen.findByLabelText('Dein Name'), '  Erza ');
  await user.type(field('E-Mail-Adresse'), ' erza@example.ch ');
  await user.type(field('Passwort'), 'geheim123');
  if (inviteCode !== undefined) await user.type(field('Einladungscode'), inviteCode);
  await user.click(screen.getByRole('checkbox', { name: /Datenschutzerklärung/ }));
}

beforeEach(() => {
  useToastStore.setState({ current: null });
});

describe('RegisterPage', () => {
  it('starts the first-start progress and links the privacy policy in a new tab', async () => {
    renderRegister();

    expect(await screen.findByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Schritt 1 von 4',
    );
    await waitFor(() => expect(field('Dein Name')).toHaveFocus());
    const link = screen.getByRole('link', { name: /Datenschutzerklärung/ });
    expect(link).toHaveAttribute('href', '/datenschutz');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('checks every field before sending anything', async () => {
    const { user, registrations } = renderRegister();
    await screen.findByLabelText('Dein Name');

    await user.click(submit());

    expect(field('Dein Name')).toHaveAccessibleDescription('Bitte gib einen Namen ein.');
    expect(field('E-Mail-Adresse')).toHaveAccessibleDescription(
      'Bitte gib deine E-Mail-Adresse ein.',
    );
    expect(field('Passwort')).toHaveAccessibleDescription('Bitte wähle ein Passwort.');
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(
      'Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.',
    );
    expect(field('Dein Name')).toHaveFocus();
    expect(registrations()).toHaveLength(0);
  });

  it('mirrors the rules of the contract for address and password', async () => {
    const { user } = renderRegister();

    await user.type(await screen.findByLabelText('E-Mail-Adresse'), 'erza@example');
    await user.type(field('Passwort'), 'kurz');
    await user.click(submit());

    expect(field('E-Mail-Adresse')).toHaveAccessibleDescription(
      'Diese E-Mail-Adresse sieht nicht vollständig aus.',
    );
    expect(field('Passwort')).toHaveAccessibleDescription('Mindestens 8 Zeichen, bitte.');
  });

  it('creates the account with trimmed name and address, then celebrates', async () => {
    const { user, registrations, queryClient } = renderRegister();

    await fillIn(user);
    expect(screen.queryByLabelText('Einladungscode')).not.toBeInTheDocument();
    await user.click(submit());

    await waitFor(() =>
      expect(queryClient.getQueryData(authStatusQuery.queryKey)?.authenticated).toBe(true),
    );
    expect(await registrations()[0]?.json()).toEqual({
      displayName: 'Erza',
      email: 'erza@example.ch',
      password: 'geheim123',
      acceptPrivacy: true,
    });
    expect(celebrate).toHaveBeenCalledOnce();
    expect(useToastStore.getState().current?.message).toBe(
      'Willkommen! Wir haben dir einen Bestätigungslink an erza@example.ch geschickt.',
    );
  });

  it('asks for the invite code when registration needs one', async () => {
    const { user, registrations } = renderRegister('invite');

    await fillIn(user);
    await user.click(submit());
    expect(field('Einladungscode')).toHaveAccessibleDescription(
      'Bitte gib deinen Einladungscode ein.',
    );
    expect(registrations()).toHaveLength(0);

    await user.type(field('Einladungscode'), ' WILLKOMMEN ');
    await user.click(submit());

    await expect.poll(() => registrations().length).toBe(1);
    expect(await registrations()[0]?.json()).toMatchObject({ inviteCode: 'WILLKOMMEN' });
  });

  it('says so when the invite code is wrong', async () => {
    const { user } = renderRegister('invite', {
      'POST /api/auth/register': () =>
        problemResponse({ status: 403, code: 'invite_code_invalid' }),
    });

    await fillIn(user, 'FALSCH');
    await user.click(submit());

    await expect.poll(() => field('Einladungscode').getAttribute('aria-invalid')).toBe('true');
    expect(field('Einladungscode')).toHaveAccessibleDescription(
      'Dieser Einladungscode stimmt nicht. Prüfe ihn bitte.',
    );
  });

  it('points to the sign-in when the address already has an account', async () => {
    const { user } = renderRegister('open', {
      'POST /api/auth/register': () => problemResponse({ status: 409, code: 'email_taken' }),
    });

    await fillIn(user);
    await user.click(submit());

    await expect.poll(() => field('E-Mail-Adresse').getAttribute('aria-invalid')).toBe('true');
    expect(field('E-Mail-Adresse')).toHaveAccessibleDescription(
      'Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.',
    );
    await waitFor(() => expect(field('E-Mail-Adresse')).toHaveFocus());
  });

  it('maps fields the server refused', async () => {
    const { user } = renderRegister('open', {
      'POST /api/auth/register': () =>
        problemResponse({
          status: 400,
          code: 'validation_failed',
          errors: [{ field: 'displayName', message: 'must match' }],
        }),
    });

    await fillIn(user);
    await user.click(submit());

    await expect
      .poll(() => field('Dein Name').getAttribute('aria-describedby') !== null)
      .toBe(true);
    expect(field('Dein Name')).toHaveAccessibleDescription(
      'Dieser Name wurde nicht angenommen. Versuch einen anderen.',
    );
  });

  it('shows a friendly closed state instead of the form', async () => {
    renderRegister('closed');

    expect(
      await screen.findByRole('heading', { name: 'Gerade keine neuen Konten' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Dein Name')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anmelden' })).toHaveAttribute('href', '/anmelden');
  });

  it('switches to the closed state when registration closed in the meantime', async () => {
    const { user } = renderRegister('open', {
      'POST /api/auth/register': () =>
        problemResponse({ status: 403, code: 'registration_closed' }),
    });

    await fillIn(user);
    await user.click(submit());

    expect(
      await screen.findByRole('heading', { name: 'Gerade keine neuen Konten' }),
    ).toBeInTheDocument();
  });

  it('waits out the throttle with a countdown', async () => {
    const { user } = renderRegister('open', {
      'POST /api/auth/register': () =>
        problemResponse({ status: 429, code: 'too_many_requests', retryAfterSeconds: 600 }),
    });

    await fillIn(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Versuche');
    expect(screen.getByRole('button', { name: 'Warten (10:00)' })).toBeDisabled();
  });

  it('reports a connection problem', async () => {
    const { user } = renderRegister('open', {
      'POST /api/auth/register': () => Promise.reject(new TypeError('offline')),
    });

    await fillIn(user);
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Prüfe deine Verbindung');
  });
});
