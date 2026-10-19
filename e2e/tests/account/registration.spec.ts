import { expect, test } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage.ts';
import { fetchAuthStatus, newCredentials, registerViaApi } from '../../support/auth.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The registration beyond the first start of the setup project: what the backend refuses. Each
 * test registers accounts of its own; the page starts signed out.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL_TAKEN =
  'Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.';

test('an address that already has an account is refused in any case and with spaces around it', async ({
  page,
  request,
}) => {
  const taken = newCredentials('taken');
  await registerViaApi(request, taken);

  const register = new RegisterPage(page);
  await page.goto('/registrieren');
  await register.expectVisible();
  const response = await register.register({
    ...newCredentials('duplicate', 'Blerta'),
    email: `  ${taken.email.toUpperCase()} `,
  });
  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({ code: 'email_taken' });
  await register.expectFieldError(register.emailInput, EMAIL_TAKEN);
  await expect(register.loginLink, 'the way to the sign-in').toBeVisible();
  await snap(page, 'register-email-taken');
  expect((await fetchAuthStatus(page.request)).authenticated, 'nothing signed in').toBe(false);
});

test('the backend refuses what the form already blocks: a short password, an address without a domain', async ({
  page,
}) => {
  const register = async (changes: Record<string, string>) => {
    const response = await page.request.post('/api/auth/register', {
      headers: await csrfHeaders(page.request),
      data: { ...newCredentials('refused'), ...changes },
    });
    expect(response.status()).toBe(400);
    const problem = (await response.json()) as { code: string; errors: { field: string }[] };
    expect(problem.code).toBe('validation_failed');
    return problem.errors.map((error) => error.field);
  };

  expect(await register({ password: '1234567' })).toEqual(['password']);
  expect(await register({ email: 'arta@lumastar' })).toEqual(['email']);
  expect(await register({ displayName: ' ' })).toEqual(['displayName']);
  expect((await fetchAuthStatus(page.request)).authenticated).toBe(false);
});
