import { expect, test } from '@playwright/test';
import { fetchAuthStatus } from '../../support/auth.ts';

// The frontend server proxies /api and /actuator, so the browser only ever talks to one origin.
// Without the stored session: these checks look at what an anonymous visitor gets.
test.use({ storageState: { cookies: [], origins: [] } });

test('the health endpoint answers through the frontend proxy', async ({ request }) => {
  const response = await request.get('/actuator/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'UP' });
});

test('the auth status answers through the proxy and issues the CSRF cookie', async ({
  request,
}) => {
  const status = await fetchAuthStatus(request);
  // A fresh instance has no account from the single-user version, so its sign-in is not offered.
  expect(status).toEqual({ authenticated: false, registrationMode: 'open', legacyLoginAvailable: false });

  const cookies = (await request.storageState()).cookies.map((cookie) => cookie.name);
  expect(cookies).toContain('XSRF-TOKEN');
});
