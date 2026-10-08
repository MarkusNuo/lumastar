import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { RemindersPage } from '../../pages/RemindersPage.ts';
import { confirmAddressViaApi, newLearnerViaApi } from '../../support/auth.ts';
import { playLessonInUi } from '../../support/lessonFlow.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * The suggestion to switch reminders on (M9): once per device, after the first lesson, where a tap
 * can lead to reminders. The other tests block service workers, so their browsers cannot receive web
 * push and never see it; this one allows the worker and leaves the permission open.
 */
test.use({
  channel: 'chromium',
  launchOptions: { args: ['--lang=de-CH'] },
  serviceWorkers: 'allow',
  storageState: { cookies: [], origins: [] },
});

test('after the first lesson the app suggests reminders once, and the suggestion leads to their settings', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { inbox } = await newLearnerViaApi(page.request, 'reminder-nudge');
  // One notice at a time: the banner of an unconfirmed address would come first.
  await confirmAddressViaApi(page.request, inbox);
  const shell = new AppShell(page);
  const nudge = page.getByRole('region', { name: 'Soll ich dich an deinen Streak erinnern?', exact: true });
  await page.goto('/');
  await shell.expectHome();
  await expect(nudge, 'not before the first lesson').toHaveCount(0);

  await playLessonInUi(page);

  await expect(nudge).toBeVisible();
  await expect(nudge).toContainText('Eine kurze Mitteilung am Abend, wenn dein Tagesziel noch offen ist.');
  await expect(nudge.getByRole('button', { name: 'Hinweis ausblenden', exact: true })).toBeVisible();
  await snap(page, 'reminder-nudge', { fullPage: false });

  await nudge.getByRole('button', { name: 'Ja, erinnere mich', exact: true }).click();
  const reminders = new RemindersPage(page);
  await expect(page).toHaveURL('/profil/erinnerungen');
  await expect(reminders.heading).toBeVisible();
  await expect(reminders.reminderSwitch, 'the learner decides here').toHaveAttribute('aria-checked', 'false');

  await page.goto('/');
  await shell.expectHome();
  await expect(shell.goalRing).toBeVisible();
  await expect(nudge, 'only once on this device').toHaveCount(0);
});
