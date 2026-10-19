import { expect, test } from '@playwright/test';
import { AccountSettings } from '../../pages/AccountSettings.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import {
  confirmAddressViaApi,
  fetchAuthStatus,
  loginViaApi,
  newApiContext,
  newLearnerViaApi,
  registerViaApi,
} from '../../support/auth.ts';
import { BackupArchive, type ProfileData } from '../../support/backup.ts';
import { WRONG_PASSWORD } from '../../support/learner.ts';
import { fetchMe, playViaApi } from '../../support/lessonApi.ts';
import { expectAccountMail, SUBJECTS } from '../../support/mailpit.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * "Konto löschen": what gets lost, a backup first, the password and a last confirmation. The
 * backend tests check that every learner table is emptied; here the account is gone for good and its
 * address free again.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const BACKUP_FILENAME = /^lumastar-export-\d{4}-\d{2}-\d{2}\.zip$/;

test('deleting the account: the consequences, a backup first, the password and a last confirmation; then the address no longer signs in', async ({
  page,
  playwright,
}, testInfo) => {
  const { credentials, inbox } = await newLearnerViaApi(page.request, 'delete');
  await confirmAddressViaApi(page.request, inbox);
  await playViaApi(page.request, { unitId: currentUnit(await fetchPath(page.request)).unitId });
  const settings = new AccountSettings(page);
  const confirm = settings.confirmDialog;

  await settings.open('Konto löschen', 'Konto löschen');
  await expect(settings.consequences).toContainText('dein Lernstand, deine Antworten und Wiederholungen');
  await expect(settings.consequences).toContainText('Das lässt sich nicht rückgängig machen.');
  await snap(page, 'delete-account');

  await test.step('the backup offered first holds the learning data', async () => {
    const download = page.waitForEvent('download');
    await settings.backupButton.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(BACKUP_FILENAME);
    const saved = testInfo.outputPath(file.suggestedFilename());
    await file.saveAs(saved);
    const backup = await BackupArchive.read(saved);
    expect(backup.json<ProfileData>('data/profile.json').displayName).toBe(credentials.displayName);
    expect(backup.rows('sessions'), 'the lesson played').toHaveLength(1);
  });

  await test.step('the password is required, a wrong one refused after the confirmation', async () => {
    await settings.deleteButton.click();
    await expect(settings.passwordInput).toHaveAccessibleDescription('Bitte gib dein Passwort ein.');
    await expect(confirm).toHaveCount(0);

    await settings.passwordInput.fill(WRONG_PASSWORD);
    await settings.deleteButton.click();
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole('button', { name: 'Konto behalten' })).toBeFocused();
    await snap(page, 'delete-account-confirm', { fullPage: false });
    await confirm.getByRole('button', { name: 'Konto behalten' }).click();
    await expect(confirm).toBeHidden();

    await settings.deleteButton.click();
    await confirm.getByRole('button', { name: 'Endgültig löschen' }).click();
    await expect(settings.passwordInput).toHaveAccessibleDescription('Das Passwort stimmt nicht. Versuch es nochmals.');
    expect((await fetchAuthStatus(page.request)).authenticated, 'nothing deleted').toBe(true);
  });

  await test.step('the right password deletes the account and leads to the welcome screen', async () => {
    await settings.passwordInput.fill(credentials.password);
    await settings.deleteButton.click();
    await confirm.getByRole('button', { name: 'Endgültig löschen' }).click();
    await new WelcomePage(page).expectVisible();
    await expect(page.getByRole('status').getByText('Dein Konto ist gelöscht. Mach’s gut!')).toBeVisible();
    await snap(page, 'delete-account-done');
    expect((await fetchAuthStatus(page.request)).authenticated).toBe(false);
  });

  const mail = await inbox.next(SUBJECTS.deleted);
  expectAccountMail(mail, credentials.displayName);
  expect(mail.text, 'nothing to click any more').not.toMatch(/https?:\/\//);

  const signIn = await newApiContext(playwright);
  try {
    expect(await loginViaApi(signIn, credentials), 'the account is gone').toBe(401);
    await registerViaApi(signIn, { ...credentials, displayName: 'Arta Neu' });
    expect(await fetchMe(signIn), 'the address is free for a new, empty account').toMatchObject({
      displayName: 'Arta Neu',
      xpTotal: 0,
    });
    expect(await loginViaApi(signIn, credentials)).toBe(204);
  } finally {
    await signIn.dispose();
  }
});
