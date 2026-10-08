import type { QueryClient } from '@tanstack/react-query';
import { decodeBase64Url, hasServerKey } from '../../sw/subscription';
import { forgetDeviceOwner, isDeviceOwner, rememberDeviceOwner } from './deviceOwner';
import {
  clearReminderNotifications,
  currentSubscription,
  pushDeviceQuery,
  subscribeDevice,
  unsubscribeDevice,
} from './pushDevice';
import { useReminderNudge } from './nudgeStore';
import {
  pushConfigQuery,
  pushDevicesQuery,
  registerDevice,
  reminderSettingsQuery,
  unregisterDevice,
} from './remindersApi';

/*
 * What happens to the reminders around the learner's activity: practising makes them stale, a
 * session start renews this device's registration for its learner, signing out and deleting the
 * account release the device.
 */

/** A lesson was saved: today's reminders are stale, and the reminder suggestion may come. */
export function onLessonCompleted(): void {
  void clearReminderNotifications();
  useReminderNudge.getState().lessonCompleted();
}

/**
 * At the start of every session. A subscription of another learner, left behind by a session
 * that ended without signing out, is ended: registering it would send this learner reminders on a
 * device where they never switched them on. The learner's own one is registered again, as the
 * backend asks for on every app start: the push service may have renewed it (the worker reports
 * that, but without a session it fails), or the server may have a new key. Silent: the next start
 * tries again, and nothing is registered while ownership is unclear.
 */
export async function renewDeviceRegistration(
  queryClient: QueryClient,
  email: string | undefined,
): Promise<void> {
  try {
    const device = await queryClient.query(pushDeviceQuery);
    if (!device.subscription) return;
    if (!(await ownsSubscription(queryClient, email, device.subscription))) {
      await releaseBrowserSubscription();
      await queryClient.invalidateQueries({ queryKey: pushDeviceQuery.queryKey });
      return;
    }
    if (device.permission !== 'granted') return;
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

/**
 * The learner owns the subscription they switched the reminders on with here. Without that note
 * (made before it existed, or the address changed since), the backend's list of the learner's
 * devices tells; an endpoint belongs to one account only.
 */
async function ownsSubscription(
  queryClient: QueryClient,
  email: string | undefined,
  subscription: PushSubscription,
): Promise<boolean> {
  if (await isDeviceOwner(email)) return true;
  const devices = await queryClient.query({ ...pushDevicesQuery, staleTime: 0 });
  const registered = devices.some((device) => device.endpoint === subscription.endpoint);
  if (registered) await rememberDeviceOwner(email);
  return registered;
}

/**
 * Ends this browser's subscription and forgets whose it was; returns its endpoint, if there was
 * one, for the backend to forget as well while a session still allows it.
 */
export async function releaseBrowserSubscription(): Promise<string | undefined> {
  const endpoint = await unsubscribeDevice();
  forgetDeviceOwner();
  return endpoint;
}

/** How long signing out waits for each step with the device before it goes on anyway. */
const RELEASE_TIMEOUT_MS = 3000;

/** Waits for a step that may fail, but not for long; `undefined` when it failed or took too long. */
async function bestEffort<T>(step: Promise<T>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      step,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(resolve, RELEASE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Signs out without leaving this device to whoever signs in next. The backend forgets the device
 * while the session still allows it; the browser ends its subscription once the sign-out went
 * through. Should the sign-out fail, the backend gets the device back, as the learner is still
 * signed in. The device never stands in the way of signing out.
 */
export async function signOutReleasingDevice(signOut: () => Promise<void>): Promise<void> {
  const subscription = await bestEffort(currentSubscription());
  const unregistered =
    subscription && (await bestEffort(unregisterDevice(subscription.endpoint).then(() => true)));
  try {
    await signOut();
  } catch (error) {
    if (subscription && unregistered) await bestEffort(registerDevice(subscription));
    throw error;
  }
  await bestEffort(releaseBrowserSubscription());
}

/** The account is gone, and with it the backend's record of its devices; the browser follows. */
export function releaseDeletedAccountDevice(): void {
  void bestEffort(releaseBrowserSubscription());
}
