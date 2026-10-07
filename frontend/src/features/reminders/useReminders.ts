import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PushDevice, ReminderSettings } from '../../api/types';
import { showToast } from '../../components/ui/toastStore';
import { REMINDER_COPY } from './copy';
import {
  pushDeviceQuery,
  requestNotificationPermission,
  subscribeDevice,
  unsubscribeDevice,
} from './pushDevice';
import { reminderStatus } from './reminderStatus';
import {
  pushConfigQuery,
  pushDevicesQuery,
  registerDevice,
  REMINDERS_QUERY_KEY,
  reminderSettingsQuery,
  saveReminderSettings,
  unregisterDevice,
} from './remindersApi';

/** The learner did not allow notifications: `default` dismissed the prompt, `denied` blocked them. */
export class PermissionRefusedError extends Error {
  override readonly name = 'PermissionRefusedError';
  readonly permission: NotificationPermission;

  constructor(permission: NotificationPermission) {
    super(`Notification permission is ${permission}`);
    this.permission = permission;
  }
}

/** What reminders can do on this device (see {@link reminderStatus}) and the data behind it. */
export function useReminderStatus() {
  const queryClient = useQueryClient();
  const device = useQuery(pushDeviceQuery);
  const config = useQuery(pushConfigQuery);
  const settings = useQuery(reminderSettingsQuery);
  const queries = [device, config, settings];

  return {
    status: reminderStatus({ device: device.data, config: config.data, settings: settings.data }),
    device: device.data,
    settings: settings.data,
    publicKey: config.data?.publicKey,
    failed: queries.some((query) => query.isError),
    retrying: queries.some((query) => query.isFetching),
    retry: () => {
      void queryClient.refetchQueries({ queryKey: REMINDERS_QUERY_KEY, type: 'active' });
    },
  };
}

/** Devices of the learner other than this browser. */
export function otherDevices(
  devices: readonly PushDevice[],
  ownEndpoint: string | undefined,
): PushDevice[] {
  return devices.filter((device) => device.endpoint !== ownEndpoint);
}

interface EnableVariables {
  permission: Promise<NotificationPermission>;
  publicKey: string;
  settings: ReminderSettings;
}

interface DisableVariables {
  settings: ReminderSettings;
  /** Devices that keep their reminders; with none left, the account's reminders go off. */
  otherDevices: number;
}

/**
 * Switches the reminders of this device. On: permission, subscription, registration, then the
 * account's reminders on. Off: unsubscribe and unregister this device; the account's reminders go
 * off only when no other device keeps them.
 */
export function useReminderSwitch() {
  const queryClient = useQueryClient();
  const refreshDevices = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pushDeviceQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: pushDevicesQuery.queryKey }),
    ]);

  const enable = useMutation({
    mutationFn: async ({ permission, publicKey, settings }: EnableVariables) => {
      const answer = await permission;
      if (answer !== 'granted') throw new PermissionRefusedError(answer);
      await registerDevice(await subscribeDevice(publicKey));
      return saveReminderSettings(queryClient, { ...settings, enabled: true });
    },
    onSuccess: (saved) => showToast(REMINDER_COPY.enabled(saved.time)),
    onSettled: refreshDevices,
  });

  const disable = useMutation({
    mutationFn: async ({ settings, otherDevices: others }: DisableVariables) => {
      const endpoint = await unsubscribeDevice();
      if (endpoint) await unregisterDevice(endpoint);
      if (others === 0) await saveReminderSettings(queryClient, { ...settings, enabled: false });
    },
    onSuccess: () => showToast(REMINDER_COPY.disabled, { tone: 'primary' }),
    onSettled: refreshDevices,
  });

  return {
    /** Must run in the click itself: it shows the browser's permission prompt. */
    turnOn: (settings: ReminderSettings, publicKey: string) => {
      disable.reset();
      enable.mutate({ permission: requestNotificationPermission(), publicKey, settings });
    },
    turnOff: (settings: ReminderSettings, others: number) => {
      enable.reset();
      disable.mutate({ settings, otherDevices: others });
    },
    switching: enable.isPending || disable.isPending,
    enableError: enable.error,
    disableFailed: disable.isError,
  };
}
