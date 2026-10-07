import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '../../../components/ui/toastStore';
import { profile } from '../../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../../test/http';
import type { Profile } from '../../../api/types';
import { useVerificationBannerDismissed } from './bannerDismissed';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { useResendCooldown } from './resendCooldown';

type Routes = Parameters<typeof stubApi>[0];

const UNVERIFIED: Profile = { ...profile(), email: 'erza@example.ch', emailVerified: false };

function renderBanner(me: Profile = UNVERIFIED, routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(me),
    'POST /api/auth/verify-email/resend': () => new Response(null, { status: 204 }),
    ...routes,
  });
  renderWithQueryClient(<EmailVerificationBanner />);
  return { requests, user: userEvent.setup() };
}

const banner = () => screen.queryByRole('region', { name: 'E-Mail bestätigen' });

beforeEach(() => {
  useResendCooldown.getState().start(0);
  useVerificationBannerDismissed.setState({ dismissed: false });
  useToastStore.setState({ current: null });
});

describe('EmailVerificationBanner', () => {
  it('reminds an unconfirmed learner where the link went', async () => {
    renderBanner();

    expect(await screen.findByRole('region', { name: 'E-Mail bestätigen' })).toHaveTextContent(
      'Wir haben dir einen Link an erza@example.ch geschickt.',
    );
  });

  it.each<[string, Profile]>([
    ['a confirmed address', { ...profile(), email: 'erza@example.ch', emailVerified: true }],
    ['no address yet', profile({ email: undefined, emailVerified: false, emailRequired: true })],
  ])('stays away for %s', async (_, me) => {
    const { requests } = renderBanner(me);

    await expect.poll(() => requests.length).toBe(1);
    expect(banner()).not.toBeInTheDocument();
  });

  it('sends the link again and then counts down before the next one', async () => {
    const { requests, user } = renderBanner();

    await user.click(await screen.findByRole('button', { name: 'Link erneut senden' }));

    expect(await screen.findByRole('button', { name: 'Erneut senden (1:00)' })).toBeDisabled();
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(1);
    expect(useToastStore.getState().current?.message).toBe(
      'Ein neuer Link ist unterwegs. Schau in dein Postfach.',
    );
  });

  it('waits as long as the server asks when it throttles', async () => {
    const { user } = renderBanner(UNVERIFIED, {
      'POST /api/auth/verify-email/resend': () =>
        problemResponse({ status: 429, code: 'too_many_requests', retryAfterSeconds: 300 }),
    });

    await user.click(await screen.findByRole('button', { name: 'Link erneut senden' }));

    expect(await screen.findByRole('button', { name: 'Erneut senden (5:00)' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('goes away when the address was confirmed meanwhile', async () => {
    let verified = false;
    const { user } = renderBanner(UNVERIFIED, {
      'GET /api/me': () => jsonResponse({ ...UNVERIFIED, emailVerified: verified }),
      'POST /api/auth/verify-email/resend': () => {
        verified = true;
        return problemResponse({ status: 409, code: 'email_already_verified' });
      },
      'GET /api/account': () => jsonResponse({}),
      'GET /api/auth/status': () => jsonResponse({}),
    });

    await user.click(await screen.findByRole('button', { name: 'Link erneut senden' }));

    await expect.poll(banner).toBeNull();
    expect(useToastStore.getState().current?.message).toBe(
      'Deine E-Mail-Adresse ist schon bestätigt.',
    );
  });

  it('reports a failed send', async () => {
    const { user } = renderBanner(UNVERIFIED, {
      'POST /api/auth/verify-email/resend': () => Promise.reject(new TypeError('offline')),
    });

    await user.click(await screen.findByRole('button', { name: 'Link erneut senden' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Der Link konnte nicht gesendet werden.',
    );
  });

  it('can be put away until the next start', async () => {
    const { user } = renderBanner();

    await user.click(await screen.findByRole('button', { name: 'Hinweis ausblenden' }));

    expect(banner()).not.toBeInTheDocument();
    expect(useVerificationBannerDismissed.getState().dismissed).toBe(true);
  });
});
