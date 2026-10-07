import { describe, expect, it } from 'vitest';
import { NEXT_LESSON_ROUTE } from '../features/path/lessonRoute';
import { fakePushSubscription, fakeWindow, fakeWorker, ORIGIN } from '../test/fakeServiceWorker';
import { WORKER_COPY } from './copy';
import { handleNotificationClick, renewSubscription, showReminder } from './handlers';
import { openScreenMessage } from './messages';

/** A daily reminder as the backend pushes it. */
const DAILY = {
  kind: 'daily_reminder',
  title: 'Zeit für Gheg!',
  body: 'Dein 12-Tage-Streak wartet auf dich.',
  url: '/',
  tag: 'lingora-daily-reminder',
  renotify: true,
  icon: '/icons/icon-192.png',
  badge: '/icons/badge-96.png',
  actions: [
    { action: 'practise', title: 'Jetzt üben' },
    { action: 'snooze', title: 'In 1 Stunde' },
  ],
  badgeCount: 3,
  snoozeToken: 'snooze-123',
};

describe('push', () => {
  it('shows the reminder as a notification with icon, badge, tag, buttons and its data', async () => {
    const worker = fakeWorker();

    await showReminder(worker, DAILY);

    expect(worker.showNotification).toHaveBeenCalledWith('Zeit für Gheg!', {
      body: 'Dein 12-Tage-Streak wartet auf dich.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: 'lingora-daily-reminder',
      renotify: true,
      actions: DAILY.actions,
      lang: 'de-CH',
      data: { url: '/', tag: 'lingora-daily-reminder', snoozeToken: 'snooze-123' },
    });
  });

  it('puts the count on the app icon', async () => {
    const worker = fakeWorker();

    await showReminder(worker, DAILY);

    expect(worker.setAppBadge).toHaveBeenCalledWith(3);
    expect(worker.clearAppBadge).not.toHaveBeenCalled();
  });

  it('clears the app icon for a count of 0 and leaves it alone without a count', async () => {
    const cleared = fakeWorker();
    const untouched = fakeWorker();

    await showReminder(cleared, { ...DAILY, badgeCount: 0 });
    await showReminder(untouched, { ...DAILY, badgeCount: undefined });

    expect(cleared.clearAppBadge).toHaveBeenCalledOnce();
    expect(cleared.setAppBadge).not.toHaveBeenCalled();
    expect(untouched.setAppBadge).not.toHaveBeenCalled();
    expect(untouched.clearAppBadge).not.toHaveBeenCalled();
  });

  it('still shows a reminder for a message that is not JSON', async () => {
    const worker = fakeWorker();

    await showReminder(worker, undefined);

    expect(worker.showNotification).toHaveBeenCalledWith(
      WORKER_COPY.fallback.title,
      expect.objectContaining({
        body: WORKER_COPY.fallback.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        data: expect.objectContaining({ url: '/' }) as unknown,
      }),
    );
  });

  it('never leads to another site', async () => {
    const worker = fakeWorker();

    await showReminder(worker, { ...DAILY, url: 'https://evil.example/phish' });

    expect(worker.showNotification.mock.calls[0]?.[1].data?.url).toBe('/');
  });
});

describe('notificationclick', () => {
  const data = { url: '/wiederholen', tag: 'lingora-daily-reminder', snoozeToken: 'snooze-123' };

  it('opens the app at the reminder path when no Lingora window is open', async () => {
    const worker = fakeWorker();

    await handleNotificationClick(worker, { action: '', data });

    expect(worker.openWindow).toHaveBeenCalledWith(`${ORIGIN}/wiederholen`);
  });

  it('brings an open window to the front and lets the app change the screen', async () => {
    const background = fakeWindow(`${ORIGIN}/statistik`);
    const worker = fakeWorker([background]);

    await handleNotificationClick(worker, { action: '', data });

    expect(background.postMessage).toHaveBeenCalledWith(openScreenMessage('/wiederholen'));
    expect(background.focus).toHaveBeenCalledOnce();
    expect(worker.openWindow).not.toHaveBeenCalled();
  });

  it('prefers the focused window when several are open', async () => {
    const other = fakeWindow(`${ORIGIN}/`);
    const focused = fakeWindow(`${ORIGIN}/profil`, true);
    const worker = fakeWorker([other, focused]);

    await handleNotificationClick(worker, { action: '', data });

    expect(focused.focus).toHaveBeenCalledOnce();
    expect(other.focus).not.toHaveBeenCalled();
  });

  it('starts the next lesson on "Jetzt üben"', async () => {
    const worker = fakeWorker();

    await handleNotificationClick(worker, { action: 'practise', data });

    expect(worker.openWindow).toHaveBeenCalledWith(`${ORIGIN}${NEXT_LESSON_ROUTE}`);
  });

  it('clears the app icon when the reminder opens the app', async () => {
    const worker = fakeWorker();

    await handleNotificationClick(worker, { action: '', data });

    expect(worker.clearAppBadge).toHaveBeenCalledOnce();
  });

  it('postpones the reminder on "In 1 Stunde" without opening the app', async () => {
    const open = fakeWindow(`${ORIGIN}/`);
    const worker = fakeWorker([open]);

    await handleNotificationClick(worker, { action: 'snooze', data });

    expect(worker.backend.snooze).toHaveBeenCalledWith('snooze-123');
    expect(worker.openWindow).not.toHaveBeenCalled();
    expect(open.focus).not.toHaveBeenCalled();
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it('replaces the reminder with a note when postponing fails', async () => {
    const worker = fakeWorker();
    worker.backend.snooze.mockRejectedValue(new Error('offline'));

    await handleNotificationClick(worker, { action: 'snooze', data });

    expect(worker.showNotification).toHaveBeenCalledWith(
      WORKER_COPY.snoozeFailed.title,
      expect.objectContaining({
        body: WORKER_COPY.snoozeFailed.body,
        tag: 'lingora-daily-reminder',
        data: { url: '/wiederholen', tag: 'lingora-daily-reminder' },
      }),
    );
  });

  it('keeps the reminder when it has no snooze token to postpone it with', async () => {
    const worker = fakeWorker();

    await handleNotificationClick(worker, { action: 'snooze', data: { url: '/', tag: 't' } });

    expect(worker.backend.snooze).not.toHaveBeenCalled();
    expect(worker.showNotification).toHaveBeenCalledWith(
      WORKER_COPY.snoozeFailed.title,
      expect.objectContaining({ tag: 't' }),
    );
  });

  it('opens the home screen for a notification without readable data', async () => {
    const worker = fakeWorker();

    await handleNotificationClick(worker, { action: '', data: null });

    expect(worker.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});

describe('pushsubscriptionchange', () => {
  it('registers the new subscription and removes the old one', async () => {
    const worker = fakeWorker();
    const oldSubscription = fakePushSubscription('https://push.example/old');
    const newSubscription = fakePushSubscription('https://push.example/new');

    await renewSubscription(worker, { oldSubscription, newSubscription });

    expect(worker.backend.saveSubscription).toHaveBeenCalledWith(newSubscription);
    expect(worker.backend.deleteSubscription).toHaveBeenCalledWith('https://push.example/old');
    expect(worker.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes again with the old key when the browser gives no new subscription', async () => {
    const worker = fakeWorker();
    const oldSubscription = fakePushSubscription('https://push.example/old', [4, 7, 9]);

    await renewSubscription(worker, { oldSubscription, newSubscription: null });

    expect(new Uint8Array(worker.subscribe.mock.calls[0]?.[0] as ArrayBuffer)).toEqual(
      new Uint8Array([4, 7, 9]),
    );
    expect(worker.backend.saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/renewed' }),
    );
    expect(worker.backend.deleteSubscription).toHaveBeenCalledWith('https://push.example/old');
  });

  it("asks the backend for its key when the old subscription's key is unknown", async () => {
    const worker = fakeWorker();

    await renewSubscription(worker, { oldSubscription: null, newSubscription: null });

    expect(worker.backend.publicKey).toHaveBeenCalledOnce();
    expect(worker.subscribe.mock.calls[0]?.[0]).toEqual(new Uint8Array([4, 1, 2]));
    expect(worker.backend.saveSubscription).toHaveBeenCalledOnce();
    expect(worker.backend.deleteSubscription).not.toHaveBeenCalled();
  });

  it('does nothing while the server has no push set up', async () => {
    const worker = fakeWorker();
    worker.backend.publicKey.mockResolvedValue(undefined);

    await renewSubscription(worker, { oldSubscription: null, newSubscription: null });

    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(worker.backend.saveSubscription).not.toHaveBeenCalled();
  });
});
