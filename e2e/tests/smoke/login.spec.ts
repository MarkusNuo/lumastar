import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import { LEARNER, WRONG_PASSWORD } from '../../support/learner.ts';
import { snap } from '../../support/screenshots.ts';

// Starts signed out with its own session, so logging out never ends the shared storage-state session.
test.use({ storageState: { cookies: [], origins: [] } });

test('a signed-out visitor is sent to the login', async ({ page }) => {
  await page.goto('/profil');
  await new LoginPage(page).expectVisible();
});

test('logout, a wrong password and the right password again', async ({ page }) => {
  const login = new LoginPage(page);
  const shell = new AppShell(page);

  await page.goto('/');
  await login.expectVisible();
  await login.login(LEARNER.password);
  await shell.expectHome();

  await shell.logout();
  await login.expectVisible();
  expect((await fetchAuthStatus(page.request)).authenticated).toBe(false);
  await snap(page, 'login');

  await login.login(WRONG_PASSWORD);
  await login.expectWrongPasswordError();
  await expect(page).toHaveURL(/\/login$/);
  await snap(page, 'login-wrong-password');

  await login.login(LEARNER.password);
  await shell.expectHome();
  expect((await fetchAuthStatus(page.request)).authenticated).toBe(true);
});
