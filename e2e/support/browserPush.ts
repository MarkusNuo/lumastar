import { expect, type BrowserContext, type CDPSession, type Page, type Worker } from '@playwright/test';
import { FRONTEND_URL } from './env.ts';
import type { SubscriptionJson } from './pushService.ts';

/*
 * Web push in the browser of a test (M9). Chromium has no push service a test can use: an
 * off-the-record context refuses pushManager.subscribe(), a profile on disk waits for Google's push
 * service, and the backend would then send to Google. The tests therefore swap the browser's push
 * service at both ends and keep everything in between real:
 *
 * - subscribing: pushManager returns a subscription at the stub push service of the test, with keys
 *   the test can decrypt with (`fakePushSubscriptions`);
 * - delivering: the test hands the message it received and decrypted to the real service worker
 *   through the DevTools protocol (`ServiceWorker.deliverPushMessage`), which fires its `push` event
 *   as the push service would. The worker shows a real notification (`ServiceWorkerPush`).
 *
 * Reminder tests run on the full Chromium (`channel: 'chromium'`): its headless mode has
 * notifications; the headless shell of the other tests reports them as denied.
 */

/** Where the fake push manager keeps this browser's subscription: it survives reloads. */
const SUBSCRIPTION_KEY = 'e2e:push-subscription';

/**
 * Replaces pushManager.subscribe/getSubscription in every page of the context: subscribing (with
 * the permission granted) yields the given subscription; unsubscribe() ends it.
 */
export async function fakePushSubscriptions(context: BrowserContext, subscription: SubscriptionJson): Promise<void> {
  await context.addInitScript(
    ({ key, endpoint, p256dh, auth }) => {
      const toBytes = (base64Url: string): ArrayBuffer => {
        const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer;
      };
      const toBase64Url = (bytes: Uint8Array): string =>
        btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

      class FakePushSubscription {
        readonly endpoint = endpoint;
        readonly expirationTime = null;
        readonly options: { userVisibleOnly: boolean; applicationServerKey: ArrayBuffer };

        constructor(serverKey: string) {
          this.options = { userVisibleOnly: true, applicationServerKey: toBytes(serverKey) };
        }

        getKey(name: string): ArrayBuffer | null {
          if (name === 'p256dh') return toBytes(p256dh);
          return name === 'auth' ? toBytes(auth) : null;
        }

        toJSON() {
          return { endpoint, expirationTime: null, keys: { p256dh, auth } };
        }

        async unsubscribe(): Promise<boolean> {
          localStorage.removeItem(key);
          return true;
        }
      }

      const stored = () => {
        const serverKey = localStorage.getItem(key);
        return serverKey ? new FakePushSubscription(serverKey) : null;
      };
      PushManager.prototype.getSubscription = async function getSubscription() {
        return stored() as unknown as PushSubscription | null;
      };
      PushManager.prototype.subscribe = async function subscribe(options?: PushSubscriptionOptionsInit) {
        if (Notification.permission !== 'granted') {
          throw new DOMException('Registration failed - permission denied', 'NotAllowedError');
        }
        const serverKey = options?.applicationServerKey;
        if (!serverKey || typeof serverKey === 'string') throw new TypeError('applicationServerKey as bytes');
        const bytes = ArrayBuffer.isView(serverKey)
          ? new Uint8Array(serverKey.buffer, serverKey.byteOffset, serverKey.byteLength)
          : new Uint8Array(serverKey);
        localStorage.setItem(key, toBase64Url(bytes));
        return stored() as unknown as PushSubscription;
      };
    },
    { key: SUBSCRIPTION_KEY, ...subscription.keys, endpoint: subscription.endpoint },
  );
}

/** Whether this browser holds a (fake) push subscription. */
export async function hasPushSubscription(page: Page): Promise<boolean> {
  return page.evaluate((key) => localStorage.getItem(key) !== null, SUBSCRIPTION_KEY);
}

/** iPhone and iPad: Safari of an app opened from the home screen reports `navigator.standalone`. */
export async function openedFromHomeScreen(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => true });
  });
}

/** Blocks notifications for the app, as the learner can in the browser's site settings. */
export async function blockNotifications(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const { targetInfo } = await session.send('Target.getTargetInfo');
  await session.send('Browser.setPermission', {
    permission: { name: 'notifications' },
    setting: 'denied',
    origin: FRONTEND_URL,
    ...(targetInfo.browserContextId ? { browserContextId: targetInfo.browserContextId } : {}),
  });
  await session.detach();
}

/** A notification as `registration.getNotifications()` lists it. */
export interface ShownNotification {
  title: string;
  body: string;
  tag: string;
  icon: string;
  badge: string;
  lang: string;
  /** When it was shown (ms since the epoch); a replacement gets a newer one. */
  timestamp: number;
  actions: { action: string; title: string }[];
  data: { url?: string; tag?: string; snoozeToken?: string };
}

/** Where the worker counts its finished `showNotification` calls (installed by the test). */
const SHOWN_COUNTER = '__e2eShownNotifications';

/**
 * The app's service worker as the push service sees it.
 *
 * Chromium drops a notification that `getNotifications()` reads while it is still being shown (the
 * read removes what the platform does not display yet), so `deliver` waits until the worker's
 * `showNotification` has finished before anyone reads the notifications.
 */
export class ServiceWorkerPush {
  private readonly page: Page;
  private readonly session: CDPSession;
  private readonly registrationId: string;
  private readonly worker: Worker;

  private constructor(page: Page, session: CDPSession, registrationId: string, worker: Worker) {
    this.page = page;
    this.session = session;
    this.registrationId = registrationId;
    this.worker = worker;
  }

  /** Waits until the page's service worker is active and controls it. */
  static async attach(page: Page): Promise<ServiceWorkerPush> {
    const scriptUrl = `${FRONTEND_URL}/sw.js`;
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null), {
        message: 'the service worker controls the app',
      })
      .toBe(scriptUrl);
    const context = page.context();
    const worker =
      context.serviceWorkers().find((candidate) => candidate.url() === scriptUrl) ??
      (await context.waitForEvent('serviceworker', (candidate) => candidate.url() === scriptUrl));
    await worker.evaluate((counter) => {
      const scope = self as unknown as { registration: ServiceWorkerRegistration };
      const counts = self as unknown as Record<string, number>;
      if (counter in counts) return;
      counts[counter] = 0;
      const { registration } = scope;
      const show = registration.showNotification.bind(registration);
      registration.showNotification = async (...args: Parameters<typeof show>) => {
        await show(...args);
        counts[counter] = (counts[counter] ?? 0) + 1;
      };
    }, SHOWN_COUNTER);

    const session = await context.newCDPSession(page);
    const registrations: { registrationId: string; scopeURL: string; isDeleted: boolean }[] = [];
    session.on('ServiceWorker.workerRegistrationUpdated', (event) => registrations.push(...event.registrations));
    await session.send('ServiceWorker.enable');
    await expect
      .poll(() => registrations.find((entry) => entry.scopeURL === `${FRONTEND_URL}/` && !entry.isDeleted))
      .toBeDefined();
    const registration = registrations.find((entry) => entry.scopeURL === `${FRONTEND_URL}/` && !entry.isDeleted);
    return new ServiceWorkerPush(page, session, registration?.registrationId ?? '', worker);
  }

  /**
   * Fires the worker's `push` event with the decrypted message, as the browser does on arrival, and
   * waits until the worker has shown its notification.
   */
  async deliver(message: string): Promise<void> {
    const shown = () =>
      this.worker.evaluate((counter) => (self as unknown as Record<string, number>)[counter] ?? 0, SHOWN_COUNTER);
    const before = await shown();
    await this.session.send('ServiceWorker.deliverPushMessage', {
      origin: FRONTEND_URL,
      registrationId: this.registrationId,
      data: message,
    });
    await expect.poll(shown, { message: 'the worker shows a notification for the push message' }).toBeGreaterThan(before);
  }

  /** The app's notifications in the notification centre. */
  notifications(): Promise<ShownNotification[]> {
    return this.page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const shown = await registration.getNotifications();
      return shown.map((notification) => {
        const extended = notification as Notification & {
          actions?: readonly { action: string; title: string }[];
          badge?: string;
        };
        return {
          title: notification.title,
          body: notification.body,
          tag: notification.tag,
          icon: notification.icon,
          badge: extended.badge ?? '',
          lang: notification.lang,
          timestamp: (notification as Notification & { timestamp: number }).timestamp,
          actions: (extended.actions ?? []).map(({ action, title }) => ({ action, title })),
          data: notification.data as ShownNotification['data'],
        };
      });
    });
  }

  async detach(): Promise<void> {
    await this.session.detach();
  }
}
