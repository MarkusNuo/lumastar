import { expect, test } from '@playwright/test';
import { AccountSettings } from '../../pages/AccountSettings.ts';
import { VerifyEmailPage } from '../../pages/VerifyEmailPage.ts';
import {
  confirmAddressViaApi,
  fetchAccount,
  loginViaApi,
  newApiContext,
  newCredentials,
  newLearnerViaApi,
  verifyViaApi,
} from '../../support/auth.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { WRONG_PASSWORD } from '../../support/learner.ts';
import { fetchMe } from '../../support/lessonApi.ts';
import { expectAccountMail, Inbox, linkIn, SUBJECTS } from '../../support/mailpit.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The section "Konto" of the profile tab (M8): display name, sign-in address and password, each on
 * a screen of its own. Every test changes an account of its own.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('the display name: checked, saved and shown on the profile', async ({ page }) => {
  const { credentials } = await newLearnerViaApi(page.request, 'rename');
  const settings = new AccountSettings(page);
  await page.goto('/');
  await settings.shell.openProfile();
  await expect(settings.row('E-Mail-Adresse')).toContainText(credentials.email);
  await expect(settings.row('E-Mail-Adresse')).toContainText('Nicht bestätigt');
  await snap(page, 'profile-account', { element: settings.section });

  await settings.row('Anzeigename').click();
  await expect(settings.screenHeading('Anzeigename')).toBeVisible();
  await expect(settings.nameInput).toHaveValue(credentials.displayName);
  await settings.nameInput.fill(' ');
  await settings.saveButton.click();
  await expect(settings.nameInput).toHaveAccessibleDescription('Bitte gib einen Namen ein.');

  await settings.nameInput.fill('  Arta Krasniqi ');
  await snap(page, 'account-name');
  await settings.saveButton.click();
  await expect(settings.toast('Name gespeichert')).toBeVisible();
  await expect(page).toHaveURL(/\/profil$/);
  await expect(settings.row('Anzeigename')).toContainText('Arta Krasniqi');
  expect(await fetchAccount(page.request)).toMatchObject({ displayName: 'Arta Krasniqi' });
  expect((await fetchMe(page.request)).displayName).toBe('Arta Krasniqi');
});

test('a new address: the password guards it, the link to the new address switches it, until then the old one signs in', async ({
  page,
  playwright,
}) => {
  const { credentials, inbox } = await newLearnerViaApi(page.request, 'change-email');
  await confirmAddressViaApi(page.request, inbox);
  const newEmail = newCredentials('changed-email').email;
  const settings = new AccountSettings(page);

  await settings.open('E-Mail-Adresse', 'E-Mail-Adresse');
  await expect(settings.currentAddress).toContainText(credentials.email);
  await expect(settings.currentAddress).toContainText('Bestätigt');
  await snap(page, 'account-email');

  await settings.newEmailInput.fill(newEmail);
  await settings.passwordInput.fill(WRONG_PASSWORD);
  await settings.sendLinkButton.click();
  await expect(settings.passwordInput).toHaveAccessibleDescription('Das Passwort stimmt nicht. Versuch es nochmals.');
  await settings.passwordInput.fill(credentials.password);
  await settings.sendLinkButton.click();
  await expect(settings.outcome('Fast geschafft!')).toContainText(
    `Wir haben einen Link an ${newEmail} geschickt. Deine Adresse wechselt, sobald du ihn öffnest.`,
  );
  await snap(page, 'account-email-pending');
  await settings.backToProfileLink.click();
  await expect(settings.row('E-Mail-Adresse')).toContainText('Wechsel offen');
  expect(await fetchAccount(page.request)).toMatchObject({
    email: credentials.email,
    emailVerified: true,
    pendingEmail: newEmail,
  });

  const mail = await new Inbox(newEmail).next(SUBJECTS.confirmChange);
  expectAccountMail(mail, credentials.displayName);
  const signIn = await newApiContext(playwright);
  try {
    expect(await loginViaApi(signIn, { email: newEmail, password: credentials.password }), 'not yet').toBe(401);
    expect(await loginViaApi(signIn, credentials), 'the old address until the link is opened').toBe(204);

    const verify = new VerifyEmailPage(page);
    await verify.open(linkIn(mail, '/verify-email'));
    await expect(verify.doneHeading).toBeVisible();
    const account = await fetchAccount(page.request);
    expect(account).toMatchObject({ email: newEmail, emailVerified: true });
    expect(account.pendingEmail).toBeUndefined();

    expect(await loginViaApi(signIn, credentials), 'the old address is gone').toBe(401);
    expect(await loginViaApi(signIn, { email: newEmail, password: credentials.password })).toBe(204);
  } finally {
    await signIn.dispose();
  }
});

test('a new password: the current one guards it, the other sessions end, this one stays', async ({
  page,
  playwright,
}) => {
  const { credentials } = await newLearnerViaApi(page.request, 'change-password');
  const newPassword = `${credentials.password}-neu`;
  const otherDevice = await newApiContext(playwright);
  const signIn = await newApiContext(playwright);
  try {
    expect(await loginViaApi(otherDevice, credentials)).toBe(204);
    const settings = new AccountSettings(page);
    await settings.open('Passwort ändern', 'Passwort ändern');

    await settings.currentPasswordInput.fill(WRONG_PASSWORD);
    await settings.newPasswordInput.fill(newPassword);
    await settings.changePasswordButton.click();
    await expect(settings.currentPasswordInput).toHaveAccessibleDescription('Dein aktuelles Passwort stimmt nicht.');
    await snap(page, 'account-password-wrong');

    await settings.currentPasswordInput.fill(credentials.password);
    await settings.changePasswordButton.click();
    await expect(settings.toast('Passwort geändert')).toBeVisible();
    await expect(page).toHaveURL(/\/profil$/);

    expect((await otherDevice.get('/api/account')).status(), 'the other device is signed out').toBe(401);
    expect((await fetchAccount(page.request)).email, 'this device stays signed in').toBe(credentials.email);
    expect(await loginViaApi(signIn, credentials)).toBe(401);
    expect(await loginViaApi(signIn, { ...credentials, password: newPassword })).toBe(204);
  } finally {
    await otherDevice.dispose();
    await signIn.dispose();
  }
});

test('a new password also cancels a pending change of the address', async ({ page, playwright }) => {
  test.fail(
    true,
    'Known bug: a password change or reset keeps pending_email and its CHANGE_EMAIL ' +
      'link, so whoever started the change with a stolen password can still take over the sign-in address.',
  );
  const { credentials, inbox } = await newLearnerViaApi(page.request, 'pending-change');
  await confirmAddressViaApi(page.request, inbox);
  const intruder = newCredentials('intruder').email;
  const headers = await csrfHeaders(page.request);
  const change = await page.request.put('/api/account/email', {
    headers,
    data: { newEmail: intruder, password: credentials.password },
  });
  expect(change.status()).toBe(200);
  const link = linkIn(await new Inbox(intruder).next(SUBJECTS.confirmChange), '/verify-email');

  const changed = await page.request.put('/api/account/password', {
    headers,
    data: { currentPassword: credentials.password, newPassword: `${credentials.password}-neu` },
  });
  expect(changed.status()).toBe(204);
  expect((await fetchAccount(page.request)).pendingEmail, 'the change is cancelled').toBeUndefined();

  const anonymous = await newApiContext(playwright);
  try {
    expect(await verifyViaApi(anonymous, link), 'the link of the cancelled change is void').toBe(410);
  } finally {
    await anonymous.dispose();
  }
  expect((await fetchAccount(page.request)).email).toBe(credentials.email);
});
