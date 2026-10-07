import type { QueryClient } from '@tanstack/react-query';
import { decodeBase64Url, hasServerKey } from '../../sw/subscription';
import {
  clearReminderNotifications,
  pushDeviceQuery,
  subscribeDevice,
  unsubscribeDevice,
} from './pushDevice';
import { useReminderNudge } from './nudgeStore';
import {
  pushConfigQuery,
  registerDevice,
  reminderSettingsQuery,
  unregisterDevice,
} from './remindersApi';

/*
 * What happens to the reminders around the learner's activity: practising makes them stale, an app
 * start renews this device's registration, signing out releases the device.
 */

/** A lesson was saved: today's reminders are stale, and the reminder suggestion may come. */
export function onLessonCompleted(): void {
  void clearReminderNotifications();
  useReminderNudge.getState().lessonCompleted();
}

/**
 * Registers this device's subscription again, as the backend asks for on every app start: the
 * push service may have renewed it (the worker reports that, but without a session it fails), or
 * the server may have a new key. Only a device that opted in has a subscription. Silent: the next
 * start tries again.
 */
export async function renewDeviceRegistration(queryClient: QueryClient): Promise<void> {
  try {
    const device = await queryClient.query(pushDeviceQuery);
    if (!device.subscription || device.permission !== 'granted') return;
    const [settings, config] = await Promise.all([
      queryClient.query(reminderSettingsQuery),
      queryClient.query(pushConfigQuery),
    ]);
    if (!settings.enabled || !config.available || !config.publicKey) return;
    const subscription = hasServerKey(device.subscription, decodeBase64Url(config.publicKey))
      ? device.subscription
      : await subscribeDevice(config.publicKey);
    await registerDevice(subscription);
  } catch {
    // Reminders keep working with the registration the backend already has.
  }
}

/** How long signing out waits for the device to be released before it goes on anyway. */
const RELEASE_TIMEOUT_MS = 3000;

/**
 * Before signing out: a shared device must not show the reminders of the account that left. The
 * session is still valid here, so the backend forgets the device too. Never blocks the sign-out.
 */
export async function releaseDevice(): Promise<void> {
  const release = async () => {
    const endpoint = await unsubscribeDevice();
    if (endpoint) await unregisterDevice(endpoint);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      release(),
      new Promise((resolve) => {
        timer = setTimeout(resolve, RELEASE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // Signing out matters more; the push service drops the subscription in time.
  } finally {
    clearTimeout(timer);
  }
}
