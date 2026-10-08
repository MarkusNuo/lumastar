import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { ReminderSettings, ReminderSettingsRequest } from '../../api/types';
import { deviceLabel, subscriptionKeys } from '../../sw/subscription';

export const REMINDERS_QUERY_KEY = ['reminders'];

/** Whether this server sends web push, and its VAPID key; it only changes with a deployment. */
export const pushConfigQuery = queryOptions({
  queryKey: [...REMINDERS_QUERY_KEY, 'config'],
  queryFn: () => unwrap(api.GET('/api/push/config')),
  staleTime: Infinity,
});

export const reminderSettingsQuery = queryOptions({
  queryKey: [...REMINDERS_QUERY_KEY, 'settings'],
  queryFn: () => unwrap(api.GET('/api/reminders')),
});

/** The learner's devices that get reminders, this one among them if it is registered. */
export const pushDevicesQuery = queryOptions({
  queryKey: [...REMINDERS_QUERY_KEY, 'devices'],
  queryFn: () => unwrap(api.GET('/api/push/subscriptions')),
});

/** The saves wait for each other, so each one builds on what the one before saved. */
let lastSave: Promise<unknown> = Promise.resolve();

/**
 * Changes some reminder settings and keeps the others as last saved, read when this save's turn
 * comes: switching the reminders off right after a new time keeps that time, and a time saved
 * while switching never turns them back on.
 */
export function updateReminderSettings(
  queryClient: QueryClient,
  change: Partial<ReminderSettingsRequest>,
): Promise<ReminderSettings> {
  const save = lastSave.then(async () => {
    const current = await queryClient.query({ ...reminderSettingsQuery, staleTime: 'static' });
    const { enabled, time, rescueEnabled, rescueTime } = { ...current, ...change };
    const saved = await unwrap(
      api.PUT('/api/reminders', { body: { enabled, time, rescueEnabled, rescueTime } }),
    );
    queryClient.setQueryData(reminderSettingsQuery.queryKey, saved);
    return saved;
  });
  lastSave = save.catch(() => undefined);
  return save;
}

/** Registers this device; the backend updates a known endpoint (and takes it from another account). */
export async function registerDevice(subscription: PushSubscription): Promise<void> {
  await api.POST('/api/push/subscriptions', {
    body: { ...subscriptionKeys(subscription), label: deviceLabel(navigator.userAgent) },
  });
}

export async function unregisterDevice(endpoint: string): Promise<void> {
  await api.DELETE('/api/push/subscriptions', { body: { endpoint } });
}

/** Saves the times and the streak rescue; switching reminders on or off goes through the device. */
export function useSaveReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<ReminderSettingsRequest>) =>
      updateReminderSettings(queryClient, change),
  });
}

/** Sends a test notification to all the learner's devices; the counts tell whether one arrived. */
export function useSendTestReminder() {
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/push/test')),
  });
}
