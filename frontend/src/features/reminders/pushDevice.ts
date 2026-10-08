import { queryOptions } from '@tanstack/react-query';
import { decodeBase64Url, hasServerKey } from '../../sw/subscription';
import { REMINDERS_QUERY_KEY } from './remindersApi';

/*
 * What this browser can do for reminders. Web push needs the service worker, which only the
 * production build registers (the dev server has none). On iPhone and iPad, Safari offers push only
 * to an app opened from the home screen (iOS 16.4+).
 */

export type PushSupport = 'supported' | 'unsupported' | 'installRequired';

export type DevicePlatform = 'ios' | 'android' | 'desktop';

export interface PushDeviceState {
  support: PushSupport;
  /** Runs as an installed app (standalone window, home-screen app on iOS). */
  installed: boolean;
  platform: DevicePlatform;
  permission: NotificationPermission;
  /** This browser's push subscription, if it has one. */
  subscription: PushSubscription | null;
}

/** How long enabling waits for the worker before it gives up (no worker at all, e.g. dev server). */
const WORKER_TIMEOUT_MS = 10_000;

export function devicePlatform(userAgent = navigator.userAgent): DevicePlatform {
  // iPadOS Safari presents itself as a Mac; only the touch screen gives it away.
  if (/iPhone|iPad|iPod/.test(userAgent) || (userAgent.includes('Macintosh') && hasTouchScreen())) {
    return 'ios';
  }
  return userAgent.includes('Android') ? 'android' : 'desktop';
}

function hasTouchScreen(): boolean {
  return navigator.maxTouchPoints > 1;
}

export function isInstalledApp(): boolean {
  const iosHomeScreen = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosHomeScreen || matchMedia('(display-mode: standalone)').matches;
}

function canPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function readPushDevice(): Promise<PushDeviceState> {
  const platform = devicePlatform();
  const installed = isInstalledApp();
  const without = (support: PushSupport): PushDeviceState => ({
    support,
    installed,
    platform,
    permission: 'default',
    subscription: null,
  });
  if (platform === 'ios' && !installed) return without('installRequired');
  if (!canPush()) return without('unsupported');
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return without('unsupported');
  return {
    support: 'supported',
    installed,
    platform,
    permission: Notification.permission,
    subscription: await registration.pushManager.getSubscription(),
  };
}

/** Read again whenever the app comes back: the learner may have changed the permission meanwhile. */
export const pushDeviceQuery = queryOptions({
  queryKey: [...REMINDERS_QUERY_KEY, 'device'],
  queryFn: readPushDevice,
  staleTime: 0,
  refetchOnWindowFocus: 'always',
});

/**
 * Asks for the permission. Browsers only show the prompt for a user's tap, so this must run
 * synchronously in the click handler, before anything else is awaited.
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

async function readyWorker(): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('No service worker')), WORKER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** This browser's subscription for the server's key; one made with an older key is replaced. */
export async function subscribeDevice(publicKey: string): Promise<PushSubscription> {
  const registration = await readyWorker();
  const key = decodeBase64Url(publicKey);
  const current = await registration.pushManager.getSubscription();
  if (current && hasServerKey(current, key)) return current;
  await current?.unsubscribe();
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

/** This browser's subscription, if it has one. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Ends this browser's subscription; returns its endpoint so the backend can forget it too. */
export async function unsubscribeDevice(): Promise<string | undefined> {
  const subscription = await currentSubscription();
  if (!subscription) return undefined;
  await subscription.unsubscribe();
  return subscription.endpoint;
}

/**
 * Clears the number on the app icon and closes the reminders in the notification centre: once
 * the learner is here or has practised, they are stale. Best effort, it never fails.
 */
export async function clearReminderNotifications(): Promise<void> {
  try {
    if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const notifications = (await registration?.getNotifications()) ?? [];
    for (const notification of notifications) notification.close();
  } catch {
    // A browser without badge or notification access simply keeps them.
  }
}
