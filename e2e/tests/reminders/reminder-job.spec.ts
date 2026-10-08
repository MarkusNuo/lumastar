import { expect, test, type APIRequestContext } from '@playwright/test';
import { newApiContext, newLearnerViaApi } from '../../support/auth.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import { ONBOARDING } from '../../support/learner.ts';
import { decryptPushMessage, readVapidToken, StubPushService, type StubSubscription } from '../../support/pushService.ts';
import {
  DEFAULT_REMINDERS,
  expectProblem,
  fetchPushDevices,
  fetchReminders,
  saveReminders,
  snoozeViaApi,
  subscribeViaApi,
  type PushNotification,
} from '../../support/reminderApi.ts';
import { hhmm, localTime, moveLearnerTo, secondsLeftInDay, zoneAroundMidday } from '../../support/timeZones.ts';

/*
 * The reminder job (M9): the e2e backend looks for due reminders every 5 seconds
 * (LINGORA_REMINDER_CRON in playwright.config.ts) instead of every 5 minutes. A test moves its
 * learner into a time zone where it is around midday and sets the daily reminder to the current
 * minute; the job then sends it to the learner's device at the stub push service.
 */

/** Two runs of the job and a little more. */
const JOB_INTERVAL_MS = 5_000;
const SNOOZE_MINUTES = 60;
/** How late a reminder may still go out (ReminderPolicy.MAX_DELAY), and so the longest time to live. */
const MAX_DELAY_SECONDS = 3600;

let pushService: StubPushService;
let api: APIRequestContext;
let serviceWorker: APIRequestContext;

test.beforeEach(async ({ playwright }) => {
  pushService = await StubPushService.start();
  api = await newApiContext(playwright);
  // The service worker's requests carry neither the session nor the CSRF header.
  serviceWorker = await newApiContext(playwright);
});

test.afterEach(async () => {
  await Promise.all([api.dispose(), serviceWorker.dispose()]);
  await pushService.close();
});

interface SentReminder {
  phone: StubSubscription;
  notification: PushNotification;
  zone: string;
}

/** A new learner whose daily reminder is due now; returns the reminder as the device decrypts it. */
async function dailyReminderNow(purpose: string): Promise<SentReminder> {
  await newLearnerViaApi(api, purpose);
  const { zone } = zoneAroundMidday();
  await moveLearnerTo(api, zone);
  const phone = pushService.subscribe();
  const subscribed = await subscribeViaApi(api, phone.json);
  expect(subscribed.status(), await subscribed.text()).toBe(200);
  const time = hhmm(localTime(zone));
  const saved = await saveReminders(api, { enabled: true, time, rescueEnabled: true, rescueTime: '23:30' });
  expect(saved.status(), await saved.text()).toBe(200);

  const message = await pushService.waitForMessage(phone.json.endpoint, 4 * JOB_INTERVAL_MS);
  const notification = JSON.parse(decryptPushMessage(message.body, phone.keys)) as PushNotification;
  return { phone, notification, zone };
}

test('the job sends the daily reminder at the learner’s time, once, with “Jetzt üben” and a snooze for the service worker', async () => {
  const { phone, notification, zone } = await dailyReminderNow('reminder-job');

  expect(notification).toEqual({
    kind: 'daily_reminder',
    title: 'Zeit für Gheg!',
    body: `${ONBOARDING.dailyGoal.minutes} Minuten reichen für dein Tagesziel.`,
    url: '/',
    tag: 'lingora-daily-reminder',
    renotify: true,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    actions: [
      { action: 'practise', title: 'Jetzt üben' },
      { action: 'snooze', title: 'In 1 Stunde' },
    ],
    badgeCount: 1,
    snoozeToken: expect.stringMatching(/^[\w-]{43}$/),
  });

  await test.step('the push service may hold it as long as a reminder may be late, and replace it by its topic', () => {
    const [message] = pushService.messagesTo(phone.json.endpoint);
    expect(message?.headers).toMatchObject({ topic: 'lingora-daily-reminder', urgency: 'normal' });
    // min(lateness limit, rest of the learner's day): around midday the limit is the shorter one.
    const leftInDay = secondsLeftInDay(localTime(zone, new Date(message?.receivedAt ?? 0)));
    expect(leftInDay).toBeGreaterThan(MAX_DELAY_SECONDS);
    expect(Number(message?.headers.ttl)).toBe(MAX_DELAY_SECONDS);
    expect(readVapidToken(message?.headers.authorization).signatureValid).toBe(true);
  });

  await test.step('the job keeps running and sends it only once', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2 * JOB_INTERVAL_MS + 1_000));
    expect(pushService.messagesTo(phone.json.endpoint)).toHaveLength(1);
    const [device] = await fetchPushDevices(api);
    expect(device?.lastSuccessAt, 'the delivery is recorded').toBeDefined();
  });

  await test.step('“In 1 Stunde”: the token alone snoozes it, without session or CSRF header', async () => {
    const before = Date.now();
    const snoozed = await snoozeViaApi(serviceWorker, notification.snoozeToken ?? '');
    expect(snoozed.status(), await snoozed.text()).toBe(200);
    const { snoozedUntil } = (await snoozed.json()) as { snoozedUntil: string };
    const delay = Date.parse(snoozedUntil) - before;
    expect(delay).toBeGreaterThan((SNOOZE_MINUTES - 1) * 60_000);
    expect(delay).toBeLessThan((SNOOZE_MINUTES + 1) * 60_000);
  });

  await test.step('an unknown token or a snooze out of range is refused', async () => {
    await expectProblem(await snoozeViaApi(serviceWorker, 'unknown-token'), 404, 'snooze_token_invalid');
    for (const minutes of [4, 181]) {
      await expectProblem(await snoozeViaApi(serviceWorker, notification.snoozeToken ?? '', minutes), 400, 'validation_failed');
    }
    await expectProblem(await snoozeViaApi(serviceWorker, ''), 400, 'validation_failed');
  });
});

test('a snooze token works once (DECISIONS #87: single use)', async () => {
  const { notification } = await dailyReminderNow('reminder-snooze-once');
  const token = notification.snoozeToken ?? '';

  const first = await snoozeViaApi(serviceWorker, token);
  expect(first.status(), await first.text()).toBe(200);

  // A replay, with the same or another snooze, would move the reminder on again.
  await expectProblem(await snoozeViaApi(serviceWorker, token), 404, 'snooze_token_invalid');
  await expectProblem(await snoozeViaApi(serviceWorker, token, 30), 404, 'snooze_token_invalid');
});

test('reminder settings: off until switched on, times as HH:mm, the rescue after the daily reminder', async () => {
  await newLearnerViaApi(api, 'reminder-settings');
  expect(await fetchReminders(api)).toEqual(DEFAULT_REMINDERS);

  const invalid = [
    { ...DEFAULT_REMINDERS, enabled: true, time: '21:30' },
    { ...DEFAULT_REMINDERS, rescueTime: '18:59' },
    { ...DEFAULT_REMINDERS, time: '24:00' },
    { ...DEFAULT_REMINDERS, time: '7:30' },
    { ...DEFAULT_REMINDERS, rescueTime: '21:30:00' },
  ];
  for (const settings of invalid) {
    await expectProblem(await saveReminders(api, settings), 400, 'validation_failed');
  }
  const { time, rescueEnabled, rescueTime } = DEFAULT_REMINDERS;
  const withoutSwitch = { time, rescueEnabled, rescueTime };
  await expectProblem(
    await api.put('/api/reminders', { headers: await csrfHeaders(api), data: withoutSwitch }),
    400,
    'validation_failed',
  );
  expect(await fetchReminders(api), 'nothing saved').toEqual(DEFAULT_REMINDERS);

  const withoutRescue = { enabled: true, time: '20:00', rescueEnabled: false, rescueTime: '19:00' };
  const saved = await saveReminders(api, withoutRescue);
  expect(saved.status(), 'without the rescue its time may be earlier').toBe(200);
  expect(await saved.json()).toEqual(withoutRescue);
  expect(await fetchReminders(api)).toEqual(withoutRescue);

  const withoutCsrf = await api.put('/api/reminders', { data: DEFAULT_REMINDERS });
  expect(withoutCsrf.status(), 'a change needs the CSRF header').toBe(403);
});
