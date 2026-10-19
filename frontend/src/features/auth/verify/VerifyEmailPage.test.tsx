import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '../../../components/ui/toastStore';
import { authStatus } from '../../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../../test/http';
import { renderRoutes, screenNamed } from '../../../test/router';
import { useResendCooldown } from '../../account/verification/resendCooldown';
import { VerifyEmailPage } from './VerifyEmailPage';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));

type Routes = Parameters<typeof stubApi>[0];

function renderVerify(search: string, signedIn: boolean, routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/auth/status': () => jsonResponse(authStatus({ authenticated: signedIn })),
    'POST /api/auth/verify-email': () => new Response(null, { status: 204 }),
    ...routes,
  });
  renderRoutes(
    [
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/anmelden', element: screenNamed('Anmeldung') },
      { path: '/', element: screenNamed('Lernpfad') },
    ],
    { pathname: '/verify-email', search },
  );
  const posts = (path: string) =>
    requests.filter((request) => request.method === 'POST' && request.url.endsWith(path));
  return { posts, user: userEvent.setup() };
}

const expired = () => problemResponse({ status: 410, code: 'token_expired' });

beforeEach(() => {
  useResendCooldown.getState().start(0);
  useToastStore.setState({ current: null });
});

describe('VerifyEmailPage', () => {
  it('confirms the address once and leads into the app', async () => {
    const { posts } = renderVerify('?token=abc', true);

    expect(
      await screen.findByRole('heading', { name: 'E-Mail-Adresse bestätigt!' }),
    ).toBeInTheDocument();
    expect(posts('/api/auth/verify-email')).toHaveLength(1);
    expect(await posts('/api/auth/verify-email')[0]?.json()).toEqual({ token: 'abc' });
    expect(await screen.findByRole('link', { name: 'Weiter zu Lumastar' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('leads to the sign-in without a session', async () => {
    renderVerify('?token=abc', false);

    expect(await screen.findByRole('link', { name: 'Zur Anmeldung' })).toHaveAttribute(
      'href',
      '/anmelden',
    );
  });

  it('sends a new link for an expired one when signed in, then waits', async () => {
    const { posts, user } = renderVerify('?token=abc', true, {
      'POST /api/auth/verify-email': expired,
      'POST /api/auth/verify-email/resend': () => new Response(null, { status: 204 }),
    });

    expect(await screen.findByRole('heading', { name: 'Link abgelaufen' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Link erneut senden' }));

    expect(await screen.findByRole('button', { name: 'Erneut senden (1:00)' })).toBeDisabled();
    expect(posts('/api/auth/verify-email/resend')).toHaveLength(1);
    expect(useToastStore.getState().current?.message).toBe(
      'Ein neuer Link ist unterwegs. Schau in dein Postfach.',
    );
  });

  it('asks to sign in for a new link when an expired one is opened without a session', async () => {
    renderVerify('?token=abc', false, { 'POST /api/auth/verify-email': expired });

    expect(
      await screen.findByText(/Melde dich an, dann kannst du einen neuen Link anfordern/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link erneut senden' })).not.toBeInTheDocument();
  });

  it('explains a used or unknown link', async () => {
    renderVerify('?token=abc', false, {
      'POST /api/auth/verify-email': () => problemResponse({ status: 410, code: 'token_invalid' }),
    });

    expect(await screen.findByRole('heading', { name: 'Link ungültig' })).toBeInTheDocument();
  });

  it('explains a new address that another account took meanwhile', async () => {
    renderVerify('?token=abc', true, {
      'POST /api/auth/verify-email': () => problemResponse({ status: 409, code: 'email_taken' }),
    });

    expect(await screen.findByRole('heading', { name: 'Adresse vergeben' })).toBeInTheDocument();
  });

  it('treats a link without token as invalid without asking the server', async () => {
    const { posts } = renderVerify('', false);

    expect(await screen.findByRole('heading', { name: 'Link ungültig' })).toBeInTheDocument();
    expect(posts('/api/auth/verify-email')).toHaveLength(0);
  });

  it('offers a retry when the server cannot be reached', async () => {
    let attempts = 0;
    const { posts, user } = renderVerify('?token=abc', true, {
      'POST /api/auth/verify-email': () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new TypeError('offline'))
          : new Response(null, { status: 204 });
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Nochmals versuchen' }));

    expect(
      await screen.findByRole('heading', { name: 'E-Mail-Adresse bestätigt!' }),
    ).toBeInTheDocument();
    expect(posts('/api/auth/verify-email')).toHaveLength(2);
  });
});
