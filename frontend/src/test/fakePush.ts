import { vi } from 'vitest';
import { fakePushSubscription } from './fakeServiceWorker';

/*
 * A browser with web push for the page's tests: Notification, PushManager, a registered service
 * worker with its push manager and notifications, and the Badging API. jsdom has none of them.
 */

/** "BAEC" decodes to these bytes: the server key of {@link pushConfig}. */
export const SERVER_KEY = 'BAEC';
export const SERVER_KEY_BYTES = [4, 1, 2];
export const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/this-device';

export const USER_AGENTS = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
} as const;

export interface FakePushOptions {
  permission?: NotificationPermission;
  /** What the learner answers to the permission prompt. */
  answer?: NotificationPermission;
  /** This browser already has a subscription, made with these key bytes. */
  subscribedWith?: number[];
  /** A service worker is registered (the production build registers one). */
  worker?: boolean;
  /** No Notification and no PushManager at all. */
  noPush?: boolean;
  installed?: boolean;
  userAgent?: string;
}

function defineOnNavigator(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { configurable: true, value });
}

/** Installs the fake browser APIs; `unstubGlobals` and {@link removeFakePush} take them away. */
export function installFakePush({
  permission = 'default',
  answer = 'granted',
  subscribedWith,
  worker = true,
  noPush = false,
  installed = false,
  userAgent = USER_AGENTS.desktop,
}: FakePushOptions = {}) {
  const state = {
    permission,
    subscription: null as PushSubscription | null,
  };
  const drop = () => {
    state.subscription = null;
  };
  if (subscribedWith) state.subscription = fakePushSubscription(ENDPOINT, subscribedWith, drop);

  const notifications = [{ close: vi.fn() }, { close: vi.fn() }];
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(state.subscription)),
    subscribe: vi.fn(({ applicationServerKey }: PushSubscriptionOptionsInit) => {
      const key = [...new Uint8Array(applicationServerKey as Uint8Array)];
      state.subscription = fakePushSubscription(ENDPOINT, key, drop);
      return Promise.resolve(state.subscription);
    }),
  };
  const registration = {
    pushManager,
    getNotifications: vi.fn(() => Promise.resolve(notifications)),
  };
  const messages = new EventTarget();
  const container = {
    getRegistration: vi.fn(() => Promise.resolve(worker ? registration : undefined)),
    ready: Promise.resolve(registration),
    addEventListener: messages.addEventListener.bind(messages),
    removeEventListener: messages.removeEventListener.bind(messages),
    startMessages: vi.fn(),
  };
  const requestPermission = vi.fn(() => {
    state.permission = answer;
    return Promise.resolve(answer);
  });
  const clearAppBadge = vi.fn(() => Promise.resolve());

  if (!noPush) {
    vi.stubGlobal('PushManager', {});
    vi.stubGlobal('Notification', {
      get permission() {
        return state.permission;
      },
      requestPermission,
    });
  }
  defineOnNavigator('serviceWorker', container);
  defineOnNavigator('clearAppBadge', clearAppBadge);
  defineOnNavigator('userAgent', userAgent);
  if (installed) {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (media) => ({ matches: media === '(display-mode: standalone)', media }) as MediaQueryList,
    );
  }

  return {
    state,
    pushManager,
    notifications,
    requestPermission,
    clearAppBadge,
    /** Delivers a message of the service worker to the page. */
    postFromWorker: (data: unknown) =>
      messages.dispatchEvent(new MessageEvent('message', { data })),
  };
}

export function removeFakePush(): void {
  for (const name of ['serviceWorker', 'clearAppBadge', 'userAgent']) {
    Reflect.deleteProperty(navigator, name);
  }
}
