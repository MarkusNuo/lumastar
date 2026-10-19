import { devices, expect, test, type Page, type Response } from '@playwright/test';
import { AccountSettings } from '../../pages/AccountSettings.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { REMINDER_BLOCKERS, RemindersPage } from '../../pages/RemindersPage.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { loginViaApi, newApiContext, newLearnerViaApi } from '../../support/auth.ts';
import {
  blockNotifications,
  fakePushSubscriptions,
  hasPushSubscription,
  openedFromHomeScreen,
  ServiceWorkerPush,
} from '../../support/browserPush.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { test as withProfile } from '../../support/persistentBrowser.ts';
import { decryptPushMessage, StubPushService } from '../../support/pushService.ts';
import {
  DEFAULT_REMINDERS,
  fetchPushDevices,
  fetchReminders,
  saveReminders,
  subscribeViaApi,
  type ReminderSettings,
} from '../../support/reminderApi.ts';
import { snap } from '../../support/screenshots.ts';
import { moveLearnerTo, zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * "Erinnerungen" under Profil: the switch subscribes this browser and registers it with the
 * backend, the times save themselves, a test reminder travels backend → push service → service
 * worker → notification, and the states where reminders cannot be switched on. The browser's push
 * service is the stub of the test at both ends (support/browserPush.ts); everything in between is real.
 * Where the service worker matters, the tests run in a browser profile on disk (`withProfile`,
 * support/persistentBrowser.ts), as an installed browser keeps it.
 *
 * The full Chromium: its headless mode has notifications, the headless shell reports them as denied.
 * Its time fields follow the browser's language, not the emulated locale: Swiss German shows 18:15.
 */
test.use({
  channel: 'chromium',
  launchOptions: { args: ['--lang=de-CH'] },
  storageState: { cookies: [], origins: [] },
});

const RESCUE_TOO_EARLY = 'Der Streak-Retter kommt nach der täglichen Erinnerung. Wähle eine spätere Uhrzeit.';
const IPHONE_SAFARI = devices['iPhone 13'].userAgent;

let pushService: StubPushService;

test.beforeEach(async () => {
  pushService = await StubPushService.start();
});

test.afterEach(async () => {
  await pushService.close();
});

const isReminderSave = (response: Response) =>
  response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/reminders';

/** A change the server refused for its CSRF token: the app sends it once more. */
const isCsrfRefusal = (response: Response) => response.status() === 403;

/** Changes a time field and waits for the save it triggers; returns the settings as stored. */
async function saveTime(page: Page, reminders: RemindersPage, field: 'time' | 'rescueTime', time: string) {
  const saved = page.waitForResponse((response) => isReminderSave(response) && !isCsrfRefusal(response));
  await reminders.setTime(field === 'time' ? reminders.timeInput : reminders.rescueTimeInput, time);
  const response = await saved;
  expect(response.status()).toBe(200);
  return (await response.json()) as ReminderSettings;
}

withProfile.describe('on a phone that can receive web push', () => {
  withProfile('switching reminders on registers this device, the times save themselves, a test reminder arrives as a notification, switching off removes the device', async ({
    page,
    context,
  }) => {
    const phone = pushService.subscribe();
    await fakePushSubscriptions(context, phone.json);
    await newLearnerViaApi(page.request, 'reminders-ui');
    // Where it is about midday, the times of this test (18:15 to 21:30) lie hours ahead: no daily
    // reminder is due, so none can arrive before the test reminder (the job runs every 5 seconds).
    await moveLearnerTo(page.request, zoneAroundMidday().zone);
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.shell.expectHome();
    const worker = await ServiceWorkerPush.attach(page);

    await test.step('off until the learner switches them on', async () => {
      await reminders.shell.openProfile();
      await expect(reminders.profileRow).toHaveAccessibleDescription('Aus');
      await reminders.profileRow.click();
      await expect(reminders.heading).toBeVisible();
      await expect(reminders.preview).toBeVisible();
      await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'false');
      await expect(reminders.timeInput).toHaveCount(0);
      await expect(reminders.testButton).toHaveCount(0);
      await expect(reminders.installTip).toBeVisible();
      await snap(page, 'reminders-off');
    });

    await test.step('the switch subscribes this browser and registers it as this device', async () => {
      await reminders.reminderSwitch.click();
      await expect(reminders.toast('Erinnerungen an: täglich um 19:00')).toBeVisible();
      await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'true');
      await expect(reminders.timeInput).toHaveValue('19:00');
      await expect(reminders.rescueSwitch).toHaveAttribute('aria-checked', 'true');
      await expect(reminders.rescueTimeInput).toHaveValue('21:30');
      expect(await hasPushSubscription(page)).toBe(true);
      expect(await fetchPushDevices(page.request)).toEqual([
        expect.objectContaining({ endpoint: phone.json.endpoint, label: 'Chrome · Android', failureCount: 0 }),
      ]);
      expect(await fetchReminders(page.request)).toEqual({
        enabled: true,
        time: '19:00',
        rescueEnabled: true,
        rescueTime: '21:30',
      });
      await reminders.closeToasts();
      await snap(page, 'reminders-on');
    });

    await test.step('a changed time saves itself', async () => {
      expect(await saveTime(page, reminders, 'time', '18:45')).toMatchObject({ time: '18:45', rescueTime: '21:30' });
      await expect(reminders.toast('Erinnerungen gespeichert')).toBeVisible();
      expect((await fetchReminders(page.request)).time).toBe('18:45');
    });

    await test.step('a save refused for an outdated CSRF token goes out again, unchanged, with a fresh one', async () => {
      const sent: { token: string | undefined; body: string | null }[] = [];
      await page.route('**/api/reminders', async (route) => {
        const request = route.request();
        if (request.method() !== 'PUT') return route.fallback();
        sent.push({ token: request.headers()['x-xsrf-token'], body: request.postData() });
        // The first attempt carries a token the server no longer accepts, as after a rotation.
        if (sent.length === 1) return route.continue({ headers: { ...request.headers(), 'x-xsrf-token': 'outdated' } });
        return route.continue();
      });
      const refused = page.waitForResponse((response) => isReminderSave(response) && isCsrfRefusal(response));
      expect(await saveTime(page, reminders, 'time', '18:15')).toMatchObject({ time: '18:15', rescueTime: '21:30' });
      expect(await (await refused).json()).toMatchObject({ code: 'csrf_invalid' });
      await page.unroute('**/api/reminders');

      expect(sent).toHaveLength(2);
      const [first, retry] = sent;
      expect(retry?.body, 'the same changes').toBe(first?.body);
      expect(JSON.parse(retry?.body ?? '{}')).toMatchObject({ time: '18:15' });
      expect(retry?.token, 'the token of the CSRF cookie').toBeTruthy();
      expect(retry?.token).not.toBe('outdated');
      expect((await fetchReminders(page.request)).time).toBe('18:15');
    });

    await test.step('a rescue before the daily reminder is not saved and says why', async () => {
      await reminders.setTime(reminders.rescueTimeInput, '18:00');
      await expect(reminders.problem(RESCUE_TOO_EARLY)).toBeVisible();
      await expect(reminders.rescueTimeInput).toHaveAttribute('aria-invalid', 'true');
      await expect(reminders.rescueTimeInput).toHaveAccessibleDescription(RESCUE_TOO_EARLY);
      await reminders.closeToasts();
      await snap(page, 'reminders-rescue-too-early');
      expect((await fetchReminders(page.request)).rescueTime, 'nothing saved').toBe('21:30');

      expect(await saveTime(page, reminders, 'rescueTime', '22:00')).toMatchObject({ rescueTime: '22:00' });
      await expect(reminders.problem(RESCUE_TOO_EARLY)).toHaveCount(0);
      await expect(reminders.rescueSwitch).toHaveAccessibleDescription('Um 22:00, wenn dein Streak sonst reisst');
    });

    await test.step('the rescue switches off at once', async () => {
      const saved = page.waitForResponse(isReminderSave);
      await reminders.rescueSwitch.click();
      expect(await (await saved).json()).toMatchObject({ rescueEnabled: false, time: '18:15' });
      await expect(reminders.rescueTimeInput).toHaveCount(0);
    });

    await test.step('“Test-Erinnerung senden”: backend → push service → service worker → notification', async () => {
      await reminders.testButton.click();
      await expect(reminders.toast('Test-Erinnerung gesendet. Sie erscheint gleich.')).toBeVisible();
      const message = await pushService.waitForMessage(phone.json.endpoint);
      await worker.deliver(decryptPushMessage(message.body, phone.keys));
      await expect.poll(() => worker.notifications()).toEqual([
        expect.objectContaining({
          title: 'Erinnerungen sind bereit 🔔',
          body: 'So erinnert dich Lumastar an dein Tagesziel.',
          tag: 'lumastar-test',
          lang: 'de-CH',
          actions: [],
          data: expect.objectContaining({ url: '/', tag: 'lumastar-test' }),
        }),
      ]);
    });

    await test.step('the profile shows the time; switching off removes the device', async () => {
      await reminders.backToProfile();
      await expect(reminders.profileRow).toHaveAccessibleDescription('Täglich um 18:15');
      await reminders.profileRow.click();
      await reminders.reminderSwitch.click();
      await expect(reminders.toast('Erinnerungen auf diesem Gerät aus')).toBeVisible();
      await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'false');
      expect(await hasPushSubscription(page)).toBe(false);
      expect(await fetchPushDevices(page.request)).toEqual([]);
      expect((await fetchReminders(page.request)).enabled, 'no other device keeps them').toBe(false);
    });
    await worker.detach();
  });

  withProfile('signing out releases this device: the account keeps no subscription of it', async ({ page, context, playwright }) => {
    const phone = pushService.subscribe();
    await fakePushSubscriptions(context, phone.json);
    const { credentials } = await newLearnerViaApi(page.request, 'reminders-logout');
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.openFromProfile();
    await reminders.reminderSwitch.click();
    await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'true');
    expect(await fetchPushDevices(page.request)).toHaveLength(1);

    await reminders.backToProfile();

    await test.step('a sign-out that fails keeps the device: still subscribed and registered', async () => {
      await page.route(
        '**/api/auth/logout',
        (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/problem+json',
            body: JSON.stringify({ type: 'about:blank', title: 'Service Unavailable', status: 503, code: 'unavailable' }),
          }),
        { times: 1 },
      );
      await reminders.shell.logoutButton.click();
      await expect(page.getByText(/^Abmelden hat nicht geklappt\./)).toBeVisible();
      await expect(reminders.shell.profileHeading).toBeVisible();
      expect(await hasPushSubscription(page)).toBe(true);
      expect(await fetchPushDevices(page.request)).toEqual([expect.objectContaining({ endpoint: phone.json.endpoint })]);
    });

    await reminders.shell.logoutButton.click();
    await new WelcomePage(page).expectVisible();
    expect(await hasPushSubscription(page), 'the browser unsubscribed').toBe(false);

    const sameLearner = await newApiContext(playwright);
    try {
      expect(await loginViaApi(sameLearner, credentials)).toBe(204);
      expect(await fetchPushDevices(sameLearner)).toEqual([]);
    } finally {
      await sameLearner.dispose();
    }
  });

  withProfile('a learner who signs in where another session ended without signing out does not take over its device', async ({
    page,
    context,
    playwright,
  }) => {
    const phone = pushService.subscribe();
    await fakePushSubscriptions(context, phone.json);
    const { credentials } = await newLearnerViaApi(page.request, 'reminders-shared-a');
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.openFromProfile();
    await reminders.reminderSwitch.click();
    await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'true');

    // B already gets reminders on a phone of their own.
    const b = await newApiContext(playwright);
    const elsewhere = await newApiContext(playwright);
    try {
      const learnerB = await newLearnerViaApi(b, 'reminders-shared-b', 'Blerta');
      const bPhone = pushService.subscribe();
      expect((await subscribeViaApi(b, bPhone.json)).status()).toBe(200);
      expect((await saveReminders(b, { ...DEFAULT_REMINDERS, enabled: true })).status()).toBe(200);

      // A's password changes on another device, which ends this session without signing out here.
      expect(await loginViaApi(elsewhere, credentials)).toBe(204);
      const changed = await elsewhere.put('/api/account/password', {
        headers: await csrfHeaders(elsewhere),
        data: { currentPassword: credentials.password, newPassword: `${credentials.password}-neu` },
      });
      expect(changed.status()).toBe(204);
      await page.goto('/');
      const welcome = new WelcomePage(page);
      await welcome.expectVisible();

      // B signs in on this browser, as on a shared phone.
      await welcome.loginLink.click();
      const login = new LoginPage(page);
      await login.expectVisible();
      await login.login(learnerB.credentials.email, learnerB.credentials.password);
      await reminders.shell.expectHome();
      // The session start ends A's subscription in this browser instead of registering it for B.
      await expect.poll(() => hasPushSubscription(page), 'A’s subscription is ended').toBe(false);
      await reminders.openFromProfile();
      await expect(reminders.reminderSwitch, 'B never switched reminders on here').toHaveAttribute('aria-checked', 'false');
      expect((await fetchPushDevices(b)).map((device) => device.endpoint)).toEqual([bPhone.json.endpoint]);
      expect((await fetchReminders(b)).enabled, 'B’s reminders on the own phone stay on').toBe(true);
    } finally {
      await Promise.all([b.dispose(), elsewhere.dispose()]);
    }
  });

  withProfile('deleting the account ends this browser’s subscription', async ({ page, context }) => {
    const phone = pushService.subscribe();
    await fakePushSubscriptions(context, phone.json);
    const { credentials } = await newLearnerViaApi(page.request, 'reminders-delete');
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.openFromProfile();
    await reminders.reminderSwitch.click();
    await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'true');
    expect(await hasPushSubscription(page)).toBe(true);

    const settings = new AccountSettings(page);
    await settings.open('Konto löschen', 'Konto löschen');
    await settings.passwordInput.fill(credentials.password);
    await settings.deleteButton.click();
    await settings.confirmDialog.getByRole('button', { name: 'Endgültig löschen' }).click();
    await new WelcomePage(page).expectVisible();
    await expect.poll(() => hasPushSubscription(page), 'the browser unsubscribed').toBe(false);
  });

  withProfile.describe('an iPhone app opened from the home screen', () => {
    withProfile.use({ userAgent: IPHONE_SAFARI });

    withProfile('gets reminders like any installed app', async ({ page, context }) => {
      const phone = pushService.subscribe();
      await fakePushSubscriptions(context, phone.json);
      await openedFromHomeScreen(context);
      await newLearnerViaApi(page.request, 'reminders-ios-app');
      const reminders = new RemindersPage(page);
      await page.goto('/');
      await reminders.openFromProfile();
      await expect(reminders.installedChip).toBeVisible();
      await expect(reminders.installTip).toHaveCount(0);
      await reminders.reminderSwitch.click();
      await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'true');
      expect(await fetchPushDevices(page.request)).toEqual([
        expect.objectContaining({ endpoint: phone.json.endpoint, label: 'Safari · iPhone' }),
      ]);
      await reminders.closeToasts();
      await snap(page, 'reminders-installed');
    });
  });
});

test.describe('where reminders cannot be switched on', () => {
  // Playwright's own context: a profile on disk without the permission denies it before any prompt.
  test.describe('in a browser that refuses notifications', () => {
    test.use({ serviceWorkers: 'allow' });

    test('nothing is subscribed, and the screen says how to allow them again', async ({ page, context }) => {
      const phone = pushService.subscribe();
      await fakePushSubscriptions(context, phone.json);
      await newLearnerViaApi(page.request, 'reminders-denied');
      const reminders = new RemindersPage(page);
      await page.goto('/');
      await reminders.openFromProfile();
      await expect(reminders.reminderSwitch).toHaveAttribute('aria-checked', 'false');

      await reminders.reminderSwitch.click();
      // A headless browser answers the permission prompt itself: blocked, or dismissed.
      await expect(
        reminders
          .blocker(REMINDER_BLOCKERS.denied)
          .or(page.getByText(/^Ohne deine Erlaubnis kann Lumastar dich nicht erinnern./)),
      ).toBeVisible();
      expect(await hasPushSubscription(page)).toBe(false);
      expect(await fetchPushDevices(page.request)).toEqual([]);
      expect((await fetchReminders(page.request)).enabled).toBe(false);

      await blockNotifications(page);
      await page.reload();
      const blocked = reminders.blocker(REMINDER_BLOCKERS.denied);
      await expect(blocked).toBeVisible();
      // In a browser tab on Android the site's own setting blocks them, not the app's.
      await expect(blocked.getByRole('listitem')).toHaveText([
        'Tippe in der Adressleiste auf das Symbol links neben der Adresse.',
        'Tippe auf Berechtigungen und stelle Benachrichtigungen auf „Zulassen“.',
      ]);
      await expect(reminders.reminderSwitch).toHaveCount(0);
      await snap(page, 'reminders-denied');
    });
  });

  test('a browser without service worker cannot receive web push', async ({ page }) => {
    await newLearnerViaApi(page.request, 'reminders-unsupported');
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.openFromProfile();
    const blocker = reminders.blocker(REMINDER_BLOCKERS.unsupported);
    await expect(blocker).toContainText('Öffne Lumastar in Chrome, Firefox oder Samsung Internet.');
    await expect(reminders.reminderSwitch).toHaveCount(0);
    await snap(page, 'reminders-unsupported');
  });

  test('a server without VAPID keys says that reminders are not set up', async ({ page }) => {
    await page.route('**/api/push/config', (route) => route.fulfill({ json: { available: false } }));
    await newLearnerViaApi(page.request, 'reminders-no-push');
    const reminders = new RemindersPage(page);
    await page.goto('/');
    await reminders.openFromProfile();
    await expect(reminders.blocker(REMINDER_BLOCKERS.serverUnavailable)).toContainText(
      'Frag die Person, die Lumastar betreibt.',
    );
    await expect(reminders.reminderSwitch).toHaveCount(0);
    await snap(page, 'reminders-server-without-push');
  });

  test.describe('iPhone Safari in the browser', () => {
    test.use({ userAgent: IPHONE_SAFARI });

    test('the guide to the home screen comes first', async ({ page }) => {
      await newLearnerViaApi(page.request, 'reminders-ios');
      const reminders = new RemindersPage(page);
      await page.goto('/');
      await reminders.openFromProfile();
      const guide = reminders.blocker(REMINDER_BLOCKERS.install);
      await expect(guide).toContainText('Auf iPhone und iPad schickt Safari Mitteilungen nur an Apps auf dem Home-Bildschirm.');
      await expect(guide.getByRole('listitem')).toHaveText([
        '1. Tippe in Safari auf Teilen.',
        '2. Wähle „Zum Home-Bildschirm“ und tippe auf Hinzufügen.',
        '3. Öffne Lumastar vom Home-Bildschirm und schalte hier die Erinnerungen ein.',
      ]);
      await expect(reminders.reminderSwitch).toHaveCount(0);
      await snap(page, 'reminders-ios-install');
    });
  });
});
