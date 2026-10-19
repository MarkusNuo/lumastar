import { vi } from 'vitest';
import type { AppWindow, ReminderWorker, WorkerBackend } from '../sw/handlers';

/* Fakes of the service worker's environment for the handler tests. */

export const ORIGIN = 'https://lumastar.test';

export function fakeWindow(url: string, focused = false) {
  return {
    url,
    focused,
    focus: vi.fn<AppWindow['focus']>(() => Promise.resolve()),
    postMessage: vi.fn<AppWindow['postMessage']>(),
  };
}

export function fakePushSubscription(
  endpoint: string,
  key: number[] | null = [4, 1, 2],
  onUnsubscribe: () => void = () => undefined,
) {
  return {
    endpoint,
    options: { applicationServerKey: key && new Uint8Array(key).buffer, userVisibleOnly: true },
    toJSON: () => ({ endpoint, keys: { p256dh: `p256dh-of-${endpoint}`, auth: 'auth-secret' } }),
    unsubscribe: vi.fn(() => {
      onUnsubscribe();
      return Promise.resolve(true);
    }),
  } as unknown as PushSubscription;
}

export function fakeWorker(windows: AppWindow[] = []) {
  const backend = {
    snooze: vi.fn<WorkerBackend['snooze']>(() => Promise.resolve()),
    saveSubscription: vi.fn<WorkerBackend['saveSubscription']>(() => Promise.resolve()),
    deleteSubscription: vi.fn<WorkerBackend['deleteSubscription']>(() => Promise.resolve()),
    publicKey: vi.fn<WorkerBackend['publicKey']>(() => Promise.resolve('BAEC')),
  };
  return {
    origin: ORIGIN,
    showNotification: vi.fn<ReminderWorker['showNotification']>(() => Promise.resolve()),
    setAppBadge: vi.fn<ReminderWorker['setAppBadge']>(() => Promise.resolve()),
    clearAppBadge: vi.fn<ReminderWorker['clearAppBadge']>(() => Promise.resolve()),
    appWindows: vi.fn<ReminderWorker['appWindows']>(() => Promise.resolve(windows)),
    openWindow: vi.fn<ReminderWorker['openWindow']>(() => Promise.resolve(null)),
    subscribe: vi.fn<ReminderWorker['subscribe']>(() =>
      Promise.resolve(fakePushSubscription('https://push.example/renewed')),
    ),
    backend,
  } satisfies ReminderWorker;
}
