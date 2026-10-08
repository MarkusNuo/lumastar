import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { notifyUnauthorized } from '../../api/unauthorized';
import type { Profile } from '../../api/types';
import { useDevicePreferences } from '../../lib/effects/devicePreferences';
import { installFakePush, removeFakePush, SERVER_KEY_BYTES } from '../../test/fakePush';
import { authStatus, profile } from '../../test/fixtures';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { useVerificationBannerDismissed } from '../account/verification/bannerDismissed';
import { useResendCooldown } from '../account/verification/resendCooldown';
import { useReminderNudge } from '../reminders/nudgeStore';
import { AuthGuard } from './AuthGuard';
import { authStatusQuery, meQuery, useLogin, useLogout, useMe } from './authHooks';

const ARDIT = profile({ displayName: 'Ardit', xpTotal: 840 });

/** The per-account state Ardit leaves on this page, and a device setting that is not his. */
function leaveArditsState() {
  useVerificationBannerDismissed.getState().dismiss();
  useResendCooldown.getState().start(60);
  useReminderNudge.getState().close();
  useDevicePreferences.getState().setSound(false);
}

function expectNothingOfArditLeft(queryClient: QueryClient) {
  expect(queryClient.getQueryData(meQuery.queryKey)).toBeUndefined();
  expect(queryClient.getQueryData(['stats'])).toBeUndefined();
  expect(useVerificationBannerDismissed.getState().dismissed).toBe(false);
  expect(useResendCooldown.getState().secondsLeft).toBe(0);
  expect(useReminderNudge.getState().state).toBe('waiting');
  expect(useDevicePreferences.getState().sound).toBe(false);
}

function signedInClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(authStatusQuery.queryKey, authStatus({ authenticated: true }));
  queryClient.setQueryData(meQuery.queryKey, ARDIT);
  queryClient.setQueryData(['stats'], { xpTotal: 840 });
  return queryClient;
}

function renderWith<Result>(hook: () => Result, queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}

function LearnerName() {
  return <h1>{useMe().data?.displayName}</h1>;
}

beforeEach(() => {
  useVerificationBannerDismissed.getState().reset();
  useResendCooldown.getState().reset();
  useReminderNudge.getState().reset();
  useDevicePreferences.setState({ sound: true, haptics: true });
});

describe('the learner of a session', () => {
  it('is forgotten when a 401 shows that the session ended elsewhere', async () => {
    let session: Profile | undefined = ARDIT;
    stubApi({
      'GET /api/auth/status': () => jsonResponse(authStatus({ authenticated: !!session })),
      'GET /api/me': () => jsonResponse(session),
    });
    const { queryClient, router } = renderRoutes(
      [
        {
          element: <AuthGuard area="signedOut" />,
          children: [{ path: '/willkommen', element: screenNamed('Willkommen') }],
        },
        {
          element: <AuthGuard area="signedIn" />,
          children: [{ path: '/', element: <LearnerName /> }],
        },
      ],
      '/',
    );
    expect(await screen.findByRole('heading', { name: 'Ardit' })).toBeInTheDocument();
    leaveArditsState();

    session = undefined;
    act(() => notifyUnauthorized());

    expect(await screen.findByRole('heading', { name: 'Willkommen' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/willkommen');
    expectNothingOfArditLeft(queryClient);
  });

  it('is forgotten when someone signs in, should anything of an earlier session be left', async () => {
    stubApi({
      'POST /api/auth/login': () => new Response(null, { status: 204 }),
      'GET /api/auth/status': () => jsonResponse(authStatus({ authenticated: true })),
    });
    const queryClient = signedInClient();
    leaveArditsState();
    const { result } = renderWith(() => useLogin(), queryClient);

    act(() => result.current.mutate({ email: 'blerta@example.ch', password: 'geheim123' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectNothingOfArditLeft(queryClient);
  });

  it('is forgotten when signing out, while the status turns to signed out', async () => {
    stubApi({
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
      'GET /api/auth/status': () => jsonResponse(authStatus()),
    });
    const queryClient = signedInClient();
    leaveArditsState();
    const { result } = renderWith(() => useLogout(), queryClient);

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectNothingOfArditLeft(queryClient);
    expect(queryClient.getQueryData(authStatusQuery.queryKey)?.authenticated).toBe(false);
  });
});

describe('signing out', () => {
  afterEach(() => {
    removeFakePush();
  });

  const optedIn = { permission: 'granted', subscribedWith: SERVER_KEY_BYTES } as const;

  it("ends this device's reminder subscription once signed out", async () => {
    const browser = installFakePush(optedIn);
    const requests = stubApi({
      'DELETE /api/push/subscriptions': () => new Response(null, { status: 204 }),
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
      'GET /api/auth/status': () => jsonResponse(authStatus()),
    });
    const { result } = renderWith(() => useLogout(), signedInClient());

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(browser.state.subscription).toBeNull();
    expect(requests.slice(0, 2).map((request) => request.method)).toEqual(['DELETE', 'POST']);
  });

  it('keeps the reminders of a learner who is still signed in', async () => {
    const browser = installFakePush(optedIn);
    const requests = stubApi({
      'DELETE /api/push/subscriptions': () => new Response(null, { status: 204 }),
      'POST /api/push/subscriptions': () => jsonResponse({}),
      'POST /api/auth/logout': () => problemResponse({ status: 503, code: 'unavailable' }),
    });
    const { result } = renderWith(() => useLogout(), signedInClient());

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(browser.state.subscription).not.toBeNull();
    expect(new URL(requests.at(-1)?.url ?? '').pathname, 'registered again').toBe(
      '/api/push/subscriptions',
    );
  });
});
