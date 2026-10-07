import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.ts';
import { isRegistration, RegisterPage } from '../../pages/RegisterPage.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { newCredentials, type AuthStatus } from '../../support/auth.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * LINGORA_REGISTRATION_MODE (open, invite, closed) and the sign-in of the single-user version are
 * fixed when the backend starts, and the e2e backend runs "open" on a fresh database. Another backend
 * per mode would cost a Testcontainer and a minute of start-up for what the backend tests already
 * prove (InviteRegistrationApiTest, RegistrationPropertiesTest, LegacyAccountApiTest). Here
 * the screens get the status and the answers of the other modes through page.route.
 */
test.use({ storageState: { cookies: [], origins: [] } });

async function withStatus(page: Page, changes: Partial<AuthStatus>): Promise<void> {
  await page.route('**/api/auth/status', async (route) => {
    const response = await route.fetch();
    const status = (await response.json()) as AuthStatus;
    await route.fulfill({ response, json: { ...status, ...changes } });
  });
}

test('invite mode asks for the invite code and names a wrong one', async ({ page }) => {
  await withStatus(page, { registrationMode: 'invite' });
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/problem+json',
      json: { type: 'about:blank', title: 'Forbidden', status: 403, code: 'invite_code_invalid' },
    }),
  );
  const register = new RegisterPage(page);
  await page.goto('/registrieren');
  await register.expectVisible();
  await expect(register.inviteCodeInput).toHaveAccessibleDescription('Neue Konten gibt es im Moment nur mit Einladung.');

  await register.fill(newCredentials('invite'));
  await register.submitButton.click();
  await register.expectFieldError(register.inviteCodeInput, 'Bitte gib deinen Einladungscode ein.');

  await register.inviteCodeInput.fill(' falsch ');
  const answer = page.waitForResponse(isRegistration);
  await register.submitButton.click();
  expect((await answer).request().postDataJSON()).toMatchObject({ inviteCode: 'falsch' });
  await register.expectFieldError(register.inviteCodeInput, 'Dieser Einladungscode stimmt nicht. Prüfe ihn bitte.');
  await snap(page, 'register-invite');
});

test('closed mode offers no registration, only the sign-in', async ({ page }) => {
  await withStatus(page, { registrationMode: 'closed' });
  const welcome = new WelcomePage(page);
  await page.goto('/');
  await welcome.expectVisible();
  await expect(welcome.registerLink).toHaveCount(0);
  await expect(page.getByText('Neue Konten sind im Moment nicht möglich.', { exact: true })).toBeVisible();
  await snap(page, 'welcome-closed');

  await page.goto('/registrieren');
  await expect(page.getByRole('heading', { name: 'Gerade keine neuen Konten', level: 1 })).toBeVisible();
  await snap(page, 'register-closed');
  await page.getByRole('link', { name: 'Anmelden', exact: true }).click();
  const login = new LoginPage(page);
  await login.expectVisible();
  await expect(login.registerLink).toHaveCount(0);
});

test('the sign-in of the single-user version is offered only while its account has no address', async ({
  page,
}) => {
  const login = new LoginPage(page);
  const legacyLink = page.getByRole('link', { name: 'Konto aus der früheren Einzelnutzer-Version?' });
  await login.goto();
  await expect(legacyLink, 'a fresh instance has no such account').toHaveCount(0);

  await withStatus(page, { legacyLoginAvailable: true });
  await login.goto();
  await legacyLink.click();
  await expect(page).toHaveURL(/\/anmelden\/frueheres-konto$/);
  await expect(page.getByRole('heading', { name: 'Früheres Konto', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Passwort', { exact: true })).toBeFocused();
  await expect(page.getByLabel('E-Mail-Adresse', { exact: true }), 'the password alone').toHaveCount(0);
  await snap(page, 'login-legacy');
});
