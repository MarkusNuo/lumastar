import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { ForgotPasswordPage, ResetPasswordPage } from '../../pages/PasswordResetPages.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import {
  confirmAddressViaApi,
  fetchAuthStatus,
  newApiContext,
  newCredentials,
  newLearnerViaApi,
  registerViaApi,
} from '../../support/auth.ts';
import { newPhonePage } from '../../support/browserContext.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { expectAccountMail, Inbox, linkIn, SUBJECTS } from '../../support/mailpit.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * "Passwort vergessen?" (M8): the link goes only to a confirmed address, works once, and the new
 * password ends every other session of the account.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('a forgotten password: the mailed link sets a new one once, the old one stops working and the other device is signed out', async ({
  page,
  browser,
}) => {
  // The first device stays signed in; reset links only go to a confirmed address.
  const { credentials, inbox } = await newLearnerViaApi(page.request, 'reset');
  await confirmAddressViaApi(page.request, inbox);
  await page.goto('/');
  await new AppShell(page).expectHome();

  const device = await newPhonePage(browser, page);
  try {
    const login = new LoginPage(device);
    const forgot = new ForgotPasswordPage(device);
    const reset = new ResetPasswordPage(device);
    const newPassword = `${credentials.password}-neu`;

    await test.step('the request', async () => {
      await login.goto();
      await login.emailInput.fill(credentials.email);
      await login.forgotLink.click();
      await forgot.expectVisible();
      await expect(forgot.emailInput, 'the address typed at the sign-in').toHaveValue(credentials.email);
      await snap(device, 'forgot-password');
      await forgot.submitButton.click();
      await expect(forgot.sentHeading).toBeVisible();
      await expect(forgot.sentText(credentials.email)).toBeVisible();
      await snap(device, 'forgot-password-sent');
    });

    const mail = await inbox.next(SUBJECTS.reset);
    expectAccountMail(mail, credentials.displayName);
    expect(mail.text).toContain('Der Link ist 1 Stunde gültig und funktioniert nur einmal.');
    const link = linkIn(mail, '/reset-password');

    await test.step('the new password, twice', async () => {
      await device.goto(link);
      await expect(reset.heading).toBeVisible();
      await expect(reset.passwordInput).toBeFocused();
      await reset.submit(newPassword, `${newPassword}x`);
      await expect(reset.confirmationInput).toHaveAccessibleDescription('Die Passwörter stimmen nicht überein.');
      await snap(device, 'reset-password');
      await reset.submit(newPassword);
      await expect(reset.doneHeading).toBeVisible();
      await snap(device, 'reset-password-done');
    });

    await test.step('the link works once and then offers a new one', async () => {
      await device.goto(link);
      await reset.submit(`${newPassword}-2`);
      await expect(reset.invalidHeading).toBeVisible();
      await snap(device, 'reset-password-link-invalid');
      await reset.requestNewLink.click();
      await forgot.expectVisible();
    });

    await test.step('only the new password signs in', async () => {
      await login.goto();
      await login.login(credentials.email, credentials.password);
      await login.expectWrongCredentialsError();
      await login.passwordInput.fill(newPassword);
      await login.submitButton.click();
      await new AppShell(device).expectHome();
    });
  } finally {
    await device.context().close();
  }

  expect((await fetchAuthStatus(page.request)).authenticated, 'the reset ended the first session').toBe(false);
  await page.reload();
  await new WelcomePage(page).expectVisible();
});

test('the reset link works at the first try in a browser that never opened Lingora', async ({ page, request }) => {
  test.fail(
    true,
    'Known bug: /reset-password posts the new password before any request has ' +
      'set the XSRF-TOKEN cookie, so the backend answers 403 and the page says to check the connection.',
  );
  const credentials = newCredentials('reset-fresh-browser');
  const inbox = new Inbox(credentials.email);
  await registerViaApi(request, credentials);
  await confirmAddressViaApi(request, inbox);
  const requested = await request.post('/api/auth/password-reset', {
    headers: await csrfHeaders(request),
    data: { email: credentials.email },
  });
  expect(requested.status()).toBe(202);
  const link = linkIn(await inbox.next(SUBJECTS.reset), '/reset-password');

  const reset = new ResetPasswordPage(page);
  await page.goto(link);
  await expect(reset.heading).toBeVisible();
  const answer = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/password-reset/confirm',
  );
  await reset.submit(`${credentials.password}-neu`);
  expect((await answer).status(), 'POST /api/auth/password-reset/confirm').toBe(204);
  await expect(reset.doneHeading).toBeVisible();
});

test('a reset request answers the same for every address, but only a confirmed one gets a link', async ({
  page,
  playwright,
}) => {
  const unknown = newCredentials('reset-unknown').email;
  const unconfirmed = newCredentials('reset-unconfirmed');
  const confirmed = newCredentials('reset-confirmed');
  const other = await newApiContext(playwright);
  const another = await newApiContext(playwright);
  try {
    await registerViaApi(other, unconfirmed);
    await registerViaApi(another, confirmed);
    await confirmAddressViaApi(another, new Inbox(confirmed.email));

    const forgot = new ForgotPasswordPage(page);
    await page.goto('/passwort-vergessen');
    await forgot.emailInput.fill(unknown);
    await forgot.submitButton.click();
    await expect(forgot.sentText(unknown), 'the same answer as for an account').toBeVisible();

    for (const email of [unconfirmed.email, confirmed.email]) {
      const response = await page.request.post('/api/auth/password-reset', {
        headers: await csrfHeaders(page.request),
        data: { email },
      });
      expect(response.status(), email).toBe(202);
    }
    await new Inbox(confirmed.email).next(SUBJECTS.reset);
    // Requested before the confirmed one, so their mails would have been sent by now.
    expect(await new Inbox(unknown).subjects()).toEqual([]);
    expect(await new Inbox(unconfirmed.email).subjects()).toEqual([SUBJECTS.verify]);
  } finally {
    await other.dispose();
    await another.dispose();
  }
});
