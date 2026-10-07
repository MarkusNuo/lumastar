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

export async function saveReminderSettings(
  queryClient: QueryClient,
  settings: ReminderSettingsRequest,
): Promise<ReminderSettings> {
  const saved = await unwrap(api.PUT('/api/reminders', { body: settings }));
  queryClient.setQueryData(reminderSettingsQuery.queryKey, saved);
  return saved;
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
    mutationFn: (settings: ReminderSettingsRequest) => saveReminderSettings(queryClient, settings),
  });
}

/** Sends a test notification to all the learner's devices; the counts tell whether one arrived. */
export function useSendTestReminder() {
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/push/test')),
  });
}
