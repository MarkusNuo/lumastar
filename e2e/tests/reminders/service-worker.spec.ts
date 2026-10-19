import type { Worker } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { newLearnerViaApi } from '../../support/auth.ts';
import { ServiceWorkerPush } from '../../support/browserPush.ts';
import { ONBOARDING } from '../../support/learner.ts';
import { expect, test } from '../../support/persistentBrowser.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { decryptPushMessage, StubPushService } from '../../support/pushService.ts';
import { saveReminders, subscribeViaApi, type PushNotification } from '../../support/reminderApi.ts';
import { hhmm, localTime, moveLearnerTo, zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * The service worker of the production build with reminders (M9), in a browser profile on disk
 * (support/persistentBrowser.ts): a push message becomes a system notification, one per kind, and
 * the open app clears what is stale. The browser cannot tap a notification under automation (a
 * synthetic notificationclick cannot extend its lifetime), so the frontend's unit tests cover the
 * click handler; here the worker sends the open app the message its click handler sends, and the
 * app shows the screen unless a lesson is running.
 */

// Each test signs in a learner of its own; the shared learner's session must stay untouched.
test.use({ storageState: { cookies: [], origins: [] } });

let pushService: StubPushService;

test.beforeEach(async () => {
  pushService = await StubPushService.start();
});

test.afterEach(async () => {
  await pushService.close();
});

test('a reminder of the job becomes a system notification with its buttons, a newer one of its kind replaces it, and opening the app clears it', async ({
  page,
}) => {
  await newLearnerViaApi(page.request, 'sw-reminder');
  await page.goto('/');
  await new AppShell(page).expectHome();
  const worker = await ServiceWorkerPush.attach(page);

  // The app has stored the device's time zone at its start; the learner moves on after that.
  const { zone } = zoneAroundMidday();
  await moveLearnerTo(page.request, zone);
  const phone = pushService.subscribe();
  expect((await subscribeViaApi(page.request, phone.json)).status()).toBe(200);
  const time = hhmm(localTime(zone));
  expect((await saveReminders(page.request, { enabled: true, time, rescueEnabled: false, rescueTime: '21:30' })).status()).toBe(200);
  const message = await pushService.waitForMessage(phone.json.endpoint);
  const payload = decryptPushMessage(message.body, phone.keys);
  const reminder = JSON.parse(payload) as PushNotification;

  await worker.deliver(payload);
  const shown = {
    title: 'Zeit für Gheg!',
    body: `${ONBOARDING.dailyGoal.minutes} Minuten reichen für dein Tagesziel.`,
    tag: 'lumastar-daily-reminder',
    lang: 'de-CH',
    timestamp: expect.any(Number),
    icon: expect.stringMatching(/\/icons\/icon-192\.png$/),
    badge: expect.stringMatching(/\/icons\/badge-96\.png$/),
    actions: [
      { action: 'practise', title: 'Jetzt üben' },
      { action: 'snooze', title: 'In 1 Stunde' },
    ],
    data: { url: '/', tag: 'lumastar-daily-reminder', snoozeToken: reminder.snoozeToken },
  };
  await expect.poll(() => worker.notifications()).toEqual([shown]);

  await test.step('the same kind replaces the notification instead of stacking up', async () => {
    const [first] = await worker.notifications();
    await worker.deliver(payload);
    const [replacement, ...others] = await worker.notifications();
    expect(others).toEqual([]);
    expect(replacement).toEqual(shown);
    expect(replacement?.timestamp, 'the newer one').toBeGreaterThan(first?.timestamp ?? 0);
  });

  await test.step('a message without readable JSON still becomes a reminder', async () => {
    await worker.deliver('not json');
    await expect
      .poll(async () => (await worker.notifications()).find((notification) => notification.tag === 'lumastar-reminder'))
      .toMatchObject({ title: 'Lumastar', body: 'Zeit für eine kurze Lektion.', actions: [], data: { url: '/' } });
  });

  await test.step('opening the app clears the delivered reminders', async () => {
    await page.reload();
    await new AppShell(page).expectHome();
    await expect.poll(() => worker.notifications()).toEqual([]);
  });
  await worker.detach();
});

/** Posts what the worker's notificationclick handler posts to the open app (src/sw/handlers.ts). */
async function openScreenFromWorker(worker: Worker, path: string): Promise<void> {
  await worker.evaluate(async (message) => {
    const scope = self as unknown as {
      clients: { matchAll(options: object): Promise<readonly { postMessage(data: unknown): void }[]> };
    };
    const windows = await scope.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const window of windows) window.postMessage(message);
  }, { type: 'lumastar:open-screen', path });
}

test('a tapped reminder shows its screen in the running app, but never leaves a running lesson', async ({
  page,
  context,
}) => {
  await newLearnerViaApi(page.request, 'sw-open-screen');
  await page.goto('/');
  await new AppShell(page).expectHome();
  await (await ServiceWorkerPush.attach(page)).detach();
  const [worker] = context.serviceWorkers();
  if (!worker) throw new Error('The service worker is not running');
  const { unitId } = currentUnit(await fetchPath(page.request));

  await openScreenFromWorker(worker, '/weiter');
  await expect(page, '“Jetzt üben” starts the next lesson').toHaveURL(`/lesson/${encodeURIComponent(unitId)}`);
  const player = new LessonPlayer(page);
  await expect(player.exercise).toBeVisible();

  await openScreenFromWorker(worker, '/');
  // Nothing happens, so the test gives the app a moment to do the wrong thing.
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(`/lesson/${encodeURIComponent(unitId)}`);
  await expect(player.exercise).toBeVisible();
});
