import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import { LEARNER, WRONG_PASSWORD } from '../../support/learner.ts';
import { snap } from '../../support/screenshots.ts';

// Starts signed out with its own session, so logging out never ends the shared storage-state session.
test.use({ storageState: { cookies: [], origins: [] } });

/** Named after the app since the rename; the script of the page never sees it. */
const SESSION_COOKIE = 'LUMASTAR_SESSION';

test('a signed-out visitor is sent to the welcome screen', async ({ page }) => {
  await page.goto('/profil');
  await new WelcomePage(page).expectVisible();
});

test('the learner signs in with the e-mail address in any case; logout, a wrong password and the right one again', async ({
  page,
}) => {
  const welcome = new WelcomePage(page);
  const login = new LoginPage(page);
  const shell = new AppShell(page);

  await page.goto('/');
  await welcome.expectVisible();
  await welcome.loginLink.click();
  await login.expectVisible();
  await login.login(LEARNER.email.toUpperCase(), LEARNER.password);
  await shell.expectHome();

  await shell.logout();
  await welcome.expectVisible();
  expect((await fetchAuthStatus(page.request)).authenticated).toBe(false);

  await login.goto();
  await snap(page, 'login');
  await login.login(LEARNER.email, WRONG_PASSWORD);
  await login.expectWrongCredentialsError();
  await expect(page).toHaveURL(/\/anmelden$/);
  await snap(page, 'login-wrong-password');

  await login.passwordInput.fill(LEARNER.password);
  await login.submitButton.click();
  await shell.expectHome();
  expect(await fetchAuthStatus(page.request)).toMatchObject({ authenticated: true, displayName: LEARNER.displayName });
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === SESSION_COOKIE), 'the session cookie').toMatchObject({
    httpOnly: true,
    sameSite: 'Lax',
  });
});
