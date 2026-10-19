import { expect, test } from '@playwright/test';
import { AccountSettings } from '../../pages/AccountSettings.ts';
import { AppShell } from '../../pages/AppShell.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { VerificationBanner, VerifyEmailPage } from '../../pages/VerifyEmailPage.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { fetchAccount, newCredentials, newLearnerViaApi, registerViaApi } from '../../support/auth.ts';
import { expectAccountMail, Inbox, linkIn, SUBJECTS } from '../../support/mailpit.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The e-mail verification of M8 with the real mails in Mailpit: a learner can start right after the
 * registration, a banner reminds them to open the link, and the link works once.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('the reminder resends the link; only the newest link confirms the address, once, and the reminder goes', async ({
  page,
}) => {
  const { credentials, inbox } = await newLearnerViaApi(page.request, 'verify');
  const first = await inbox.next(SUBJECTS.verify);
  expectAccountMail(first, credentials.displayName);

  const shell = new AppShell(page);
  const banner = new VerificationBanner(page);
  await page.goto('/');
  await shell.expectHome();
  await banner.expectFor(credentials.email);
  await snap(page, 'verification-banner', { fullPage: false });

  await banner.dismissButton.click();
  await expect(banner.region).toHaveCount(0);
  await page.reload();
  await shell.expectHome();
  await banner.expectFor(credentials.email);

  await banner.resendButton.click();
  await expect(page.getByRole('status').getByText('Ein neuer Link ist unterwegs. Schau in dein Postfach.')).toBeVisible();
  await expect(banner.waitingButton, 'a cooldown against sending twice').toBeDisabled();
  const second = await inbox.next(SUBJECTS.verify);

  const verify = new VerifyEmailPage(page);
  await verify.open(linkIn(first, '/verify-email'));
  await expect(verify.invalidHeading, 'the resent link replaced the first one').toBeVisible();
  await snap(page, 'verify-email-invalid');

  await verify.open(linkIn(second, '/verify-email'));
  await expect(verify.doneHeading).toBeVisible();
  await verify.toAppLink.click();
  await shell.expectHome();
  await expect(banner.region).toHaveCount(0);
  await shell.openProfile();
  await expect(new AccountSettings(page).row('E-Mail-Adresse')).toContainText('Bestätigt');

  await verify.open(linkIn(second, '/verify-email'));
  await expect(verify.invalidHeading, 'a link works once').toBeVisible();
  expect(await fetchAccount(page.request)).toMatchObject({ email: credentials.email, emailVerified: true });
});

test('the link works without a session too and then leads to the sign-in', async ({ page, request }) => {
  const credentials = newCredentials('verify-signed-out');
  await registerViaApi(request, credentials);
  const mail = await new Inbox(credentials.email).next(SUBJECTS.verify);

  // A browser that has shown Lumastar before, signed out (a fresh one: the next test).
  await page.goto('/');
  await new WelcomePage(page).expectVisible();
  const verify = new VerifyEmailPage(page);
  await verify.open(linkIn(mail, '/verify-email'));
  await expect(verify.doneHeading).toBeVisible();
  await snap(page, 'verify-email-done-signed-out');
  await verify.toLoginLink.click();
  await new LoginPage(page).expectVisible();
  expect(await fetchAccount(request)).toMatchObject({ email: credentials.email, emailVerified: true });
});

test('the link works at the first try in a browser that never opened Lumastar', async ({ page, request }) => {
  const credentials = newCredentials('verify-fresh-browser');
  await registerViaApi(request, credentials);
  const mail = await new Inbox(credentials.email).next(SUBJECTS.verify);

  const verify = new VerifyEmailPage(page);
  const answer = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/verify-email',
  );
  await verify.open(linkIn(mail, '/verify-email'));
  expect((await answer).status(), 'POST /api/auth/verify-email').toBe(204);
  await expect(verify.doneHeading).toBeVisible();
});
