import { WORKER_COPY } from './copy';
import { openScreenMessage } from './messages';
import {
  parseReminder,
  readReminderData,
  REMINDER_BADGE,
  REMINDER_ICON,
  SNOOZE_ACTION,
  targetPath,
  toNotification,
  type ReminderData,
  type ReminderNotificationOptions,
} from './reminder';
import { decodeBase64Url } from './subscription';

/*
 * The service worker's reminder handlers. They depend on this small interface instead of the
 * worker's globals, so they run in unit tests and in the worker alike (src/sw.ts wires them up).
 */

/** An open Lingora window. */
export interface AppWindow {
  readonly url: string;
  readonly focused: boolean;
  focus(): Promise<unknown>;
  postMessage(message: unknown): void;
}

/** The backend calls of the worker; they rely on the session cookie of the installed app. */
export interface WorkerBackend {
  /** Needs neither session nor CSRF token, only the notification's snooze token. */
  snooze(token: string): Promise<void>;
  saveSubscription(subscription: PushSubscription): Promise<void>;
  deleteSubscription(endpoint: string): Promise<void>;
  /** The VAPID public key, base64url-encoded; undefined while push is not set up. */
  publicKey(): Promise<string | undefined>;
}

export interface ReminderWorker {
  readonly origin: string;
  showNotification(title: string, options: ReminderNotificationOptions): Promise<void>;
  /** Both resolve without effect where the Badging API is missing (Android, Firefox). */
  setAppBadge(count: number): Promise<void>;
  clearAppBadge(): Promise<void>;
  appWindows(): Promise<readonly AppWindow[]>;
  openWindow(url: string): Promise<unknown>;
  subscribe(applicationServerKey: BufferSource): Promise<PushSubscription>;
  readonly backend: WorkerBackend;
}

/** `push`: show the reminder as a system notification and put the number on the app icon. */
export async function showReminder(worker: ReminderWorker, raw: unknown): Promise<void> {
  const reminder = parseReminder(raw, worker.origin);
  const { title, options } = toNotification(reminder);
  await Promise.all([
    worker.showNotification(title, options),
    reminder.badgeCount === undefined
      ? undefined
      : reminder.badgeCount > 0
        ? worker.setAppBadge(reminder.badgeCount)
        : worker.clearAppBadge(),
  ]);
}

export interface NotificationClick {
  /** The button's action, or "" for a tap on the notification itself. */
  action: string;
  data: unknown;
}

/**
 * `notificationclick` (the notification is already closed): "In 1 Stunde" postpones the reminder
 * without opening the app; a tap or "Jetzt üben" brings Lingora to the front at the right screen.
 */
export async function handleNotificationClick(
  worker: ReminderWorker,
  click: NotificationClick,
): Promise<void> {
  const data = readReminderData(click.data, worker.origin);
  if (click.action === SNOOZE_ACTION) {
    await snooze(worker, data);
    return;
  }
  await Promise.all([openApp(worker, targetPath(click.action, data)), worker.clearAppBadge()]);
}

/**
 * Focuses a running Lingora window and lets the app change the screen itself (no reload, nothing
 * in progress is lost), or opens a new window, which an installed app opens as the app.
 */
export async function openApp(worker: ReminderWorker, path: string): Promise<void> {
  const windows = await worker.appWindows();
  const open = windows.find((window) => window.focused) ?? windows[0];
  if (!open) {
    await worker.openWindow(new URL(path, worker.origin).href);
    return;
  }
  open.postMessage(openScreenMessage(path));
  await open.focus();
}

/** A failed snooze must not lose the reminder: a replacement says so and still opens the app. */
async function snooze(worker: ReminderWorker, data: ReminderData): Promise<void> {
  try {
    if (!data.snoozeToken) throw new Error('The reminder has no snooze token');
    await worker.backend.snooze(data.snoozeToken);
  } catch {
    await worker.showNotification(WORKER_COPY.snoozeFailed.title, {
      body: WORKER_COPY.snoozeFailed.body,
      icon: REMINDER_ICON,
      badge: REMINDER_BADGE,
      tag: data.tag,
      lang: 'de-CH',
      data: { url: data.url, tag: data.tag },
    });
  }
}

export interface SubscriptionChange {
  oldSubscription: PushSubscription | null;
  newSubscription: PushSubscription | null;
}

/**
 * `pushsubscriptionchange`: the push service replaced or dropped the subscription. Subscribe again
 * with the same key and tell the backend; should that fail (no session), the app re-registers the
 * subscription on its next start.
 */
export async function renewSubscription(
  worker: ReminderWorker,
  change: SubscriptionChange,
): Promise<void> {
  const next = change.newSubscription ?? (await resubscribe(worker, change.oldSubscription));
  if (!next) return;
  await worker.backend.saveSubscription(next);
  const previous = change.oldSubscription?.endpoint;
  if (previous && previous !== next.endpoint) await worker.backend.deleteSubscription(previous);
}

async function resubscribe(
  worker: ReminderWorker,
  old: PushSubscription | null,
): Promise<PushSubscription | null> {
  const ownKey = old?.options.applicationServerKey;
  if (ownKey) return worker.subscribe(ownKey);
  const publicKey = await worker.backend.publicKey();
  return publicKey ? worker.subscribe(decodeBase64Url(publicKey)) : null;
}
