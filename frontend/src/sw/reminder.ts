import type { NotificationAction, NotificationActionType, PushNotification } from '../api/types';
import { NEXT_LESSON_ROUTE } from '../features/path/lessonRoute';
import { WORKER_COPY } from './copy';

/*
 * A reminder as the backend pushes it and as the worker shows it: a system notification with the
 * app icon, a monochrome status-bar badge, buttons where the platform has them (Android, desktop
 * Chrome and Edge; iOS shows none) and one notification per kind, replaced instead of stacked.
 */

export const PRACTISE_ACTION = 'practise' satisfies NotificationActionType;
export const SNOOZE_ACTION = 'snooze' satisfies NotificationActionType;
const KNOWN_ACTIONS: readonly string[] = [PRACTISE_ACTION, SNOOZE_ACTION];
/** "In 1 Stunde", as the snooze button says. */
export const SNOOZE_MINUTES = 60;

export const REMINDER_ICON = '/icons/icon-192.png';
export const REMINDER_BADGE = '/icons/badge-96.png';
const DEFAULT_TAG = 'lingora-reminder';

/** The push payload as the worker shows it, every field checked; `url` is a path within the app. */
export type Reminder = Omit<PushNotification, 'kind'>;

/** What a notification remembers for its tap and its buttons. */
export interface ReminderData {
  url: string;
  tag: string;
  snoozeToken?: string;
}

/** `NotificationOptions` of TypeScript's DOM types lacks what only some platforms render. */
export interface ReminderNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
  renotify?: boolean;
  data?: ReminderData;
}

/** The push message's JSON; a message that is not JSON still becomes a reminder. */
export function readPushData(data: { json(): unknown } | null): unknown {
  try {
    return data?.json();
  } catch {
    return undefined;
  }
}

type Fields = Record<string, unknown>;

const text = (fields: Fields, key: string): string | undefined => {
  const value = fields[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/** Every field is checked: a malformed message must still show a working reminder. */
export function parseReminder(raw: unknown, origin: string): Reminder {
  const fields: Fields = typeof raw === 'object' && raw !== null ? (raw as Fields) : {};
  const badgeCount = fields.badgeCount;
  return {
    title: text(fields, 'title') ?? WORKER_COPY.fallback.title,
    body: text(fields, 'body') ?? WORKER_COPY.fallback.body,
    url: appPath(text(fields, 'url'), origin),
    tag: text(fields, 'tag') ?? DEFAULT_TAG,
    renotify: fields.renotify !== false,
    icon: appPath(text(fields, 'icon'), origin, REMINDER_ICON),
    badge: appPath(text(fields, 'badge'), origin, REMINDER_BADGE),
    actions: readActions(fields.actions),
    badgeCount:
      typeof badgeCount === 'number' && Number.isInteger(badgeCount) && badgeCount >= 0
        ? badgeCount
        : undefined,
    snoozeToken: text(fields, 'snoozeToken'),
  };
}

/** Only buttons the worker can handle; a newer backend's other actions are left out. */
function readActions(raw: unknown): NotificationAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const fields = entry as Fields;
    const action = text(fields, 'action');
    const title = text(fields, 'title');
    return action && title && isKnownAction(action) ? [{ action, title }] : [];
  });
}

function isKnownAction(action: string): action is NotificationActionType {
  return KNOWN_ACTIONS.includes(action);
}

/**
 * A path within the app. Only same-origin targets are followed, so a reminder can never send the
 * learner to another site.
 */
export function appPath(value: string | undefined, origin: string, fallback = '/'): string {
  if (value === undefined) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function toNotification(reminder: Reminder): {
  title: string;
  options: ReminderNotificationOptions;
} {
  return {
    title: reminder.title,
    options: {
      body: reminder.body,
      icon: reminder.icon,
      badge: reminder.badge,
      tag: reminder.tag,
      renotify: reminder.renotify,
      actions: reminder.actions,
      lang: 'de-CH',
      data: { url: reminder.url, tag: reminder.tag, snoozeToken: reminder.snoozeToken },
    },
  };
}

/** The data of a clicked notification; anything unreadable opens the home screen. */
export function readReminderData(raw: unknown, origin: string): ReminderData {
  const fields: Fields = typeof raw === 'object' && raw !== null ? (raw as Fields) : {};
  return {
    url: appPath(text(fields, 'url'), origin),
    tag: text(fields, 'tag') ?? DEFAULT_TAG,
    snoozeToken: text(fields, 'snoozeToken'),
  };
}

/** Where a tap leads: "Jetzt üben" starts the next lesson, the notification itself its own path. */
export function targetPath(action: string, data: ReminderData): string {
  return action === PRACTISE_ACTION ? NEXT_LESSON_ROUTE : data.url;
}
