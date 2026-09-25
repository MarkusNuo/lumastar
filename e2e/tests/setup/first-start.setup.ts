import { expect, test, type Page } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { SetupPage } from '../../pages/SetupPage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import { PATHS } from '../../support/env.ts';
import { LEARNER } from '../../support/learner.ts';
import { PHONES } from '../../support/phones.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * Runs once per test run, before every other project: the backend starts on an empty database, so
 * this is the only place where the setup screens can be seen. The second test creates the single
 * account and stores its session for all dependent projects.
 */

/** Setup screens exist only before the account does, so they are captured at every phone size here. */
async function snapOnAllPhones(page: Page, name: string): Promise<void> {
  const original = page.viewportSize();
  for (const phone of Object.values(PHONES)) {
    await page.setViewportSize(phone.viewport);
    await snap(page, name);
  }
  if (original) await page.setViewportSize(original);
}

test('a fresh instance leads to the setup and validates name and password', async ({
  page,
  request,
}) => {
  const status = await fetchAuthStatus(request);
  test.skip(!status.setupRequired, 'Reused backend already has an account; restart it for a fresh database.');

  const setup = new SetupPage(page);
  await page.goto('/');
  await setup.expectWelcome();
  await snapOnAllPhones(page, 'setup-welcome');

  await setup.start();
  await expect(setup.progress).toHaveAttribute('aria-valuetext', 'Schritt 1 von 2');
  await expect(setup.nextButton).toBeDisabled();
  await setup.nameInput.fill('   ');
  await expect(setup.nextButton, 'a name of only spaces is no name').toBeDisabled();
  await setup.nameInput.fill(LEARNER.displayName);
  await snapOnAllPhones(page, 'setup-name');

  await setup.nextButton.click();
  await expect(setup.passwordHeading(LEARNER.displayName)).toBeVisible();
  await expect(setup.progress).toHaveAttribute('aria-valuetext', 'Schritt 2 von 2');

  const mismatch = 'Die Passwörter stimmen nicht überein.';
  await setup.submitPasswords('kurz', 'kurx');
  await expect(setup.passwordInput).toHaveAttribute('aria-invalid', 'true');
  await expect(setup.passwordInput).toHaveAccessibleDescription('Mindestens 8 Zeichen, bitte.');
  await expect(setup.confirmationInput).toHaveAccessibleDescription(mismatch);
  await snapOnAllPhones(page, 'setup-password-errors');

  await setup.submitPasswords(LEARNER.password, `${LEARNER.password}-typo`);
  await expect(setup.passwordInput).not.toHaveAttribute('aria-invalid');
  await expect(setup.confirmationInput).toHaveAttribute('aria-invalid', 'true');
  await expect(setup.confirmationInput).toHaveAccessibleDescription(mismatch);

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(setup.nameInput, 'going back keeps the name').toHaveValue(LEARNER.displayName);

  expect((await fetchAuthStatus(request)).setupRequired, 'invalid input creates no account').toBe(
    true,
  );
});

test('creating the account signs the learner in to the app shell', async ({ page }) => {
  const shell = new AppShell(page);
  const status = await fetchAuthStatus(page.request);

  await page.goto('/');
  if (status.setupRequired) {
    const setup = new SetupPage(page);
    await setup.expectWelcome();
    await setup.start();
    await setup.enterName(LEARNER.displayName);
    await setup.submitPasswords(LEARNER.password, LEARNER.password);
  } else {
    // Only when a still running backend was reused (local runs): sign in to the existing account.
    const login = new LoginPage(page);
    await login.expectVisible();
    await login.login(LEARNER.password);
  }

  await shell.expectHome();
  const signedIn = await fetchAuthStatus(page.request);
  expect(signedIn).toMatchObject({ authenticated: true, displayName: LEARNER.displayName });

  await page.context().storageState({ path: PATHS.authState });
});
