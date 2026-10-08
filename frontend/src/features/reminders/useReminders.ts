import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PushDevice } from '../../api/types';
import { showToast } from '../../components/ui/toastStore';
import { useMe } from '../auth/authHooks';
import { REMINDER_COPY } from './copy';
import { rememberDeviceOwner } from './deviceOwner';
import { useReminderNudge } from './nudgeStore';
import { pushDeviceQuery, requestNotificationPermission, subscribeDevice } from './pushDevice';
import { releaseBrowserSubscription } from './reminderLifecycle';
import { reminderStatus } from './reminderStatus';
import {
  pushConfigQuery,
  pushDevicesQuery,
  registerDevice,
  REMINDERS_QUERY_KEY,
  reminderSettingsQuery,
  unregisterDevice,
  updateReminderSettings,
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
    /** Answers are on their way; the ones at hand may be outdated. */
    fetching: queries.some((query) => query.isFetching),
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
  /** The learner's address, to note whose subscription this browser holds. */
  email: string | undefined;
}

/**
 * Switches the reminders of this device. On: permission, subscription, registration, then the
 * account's reminders on. Off: unsubscribe and unregister this device; the account's reminders go
 * off only when no other device keeps them.
 */
export function useReminderSwitch() {
  const queryClient = useQueryClient();
  const email = useMe().data?.email;
  const refreshDevices = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pushDeviceQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: pushDevicesQuery.queryKey }),
    ]);

  const enable = useMutation({
    mutationFn: async ({ permission, publicKey, email: owner }: EnableVariables) => {
      const answer = await permission;
      if (answer !== 'granted') throw new PermissionRefusedError(answer);
      const subscription = await subscribeDevice(publicKey);
      try {
        await registerDevice(subscription);
      } catch (error) {
        // A subscription the backend does not know would pretend that reminders are on.
        await releaseBrowserSubscription().catch(() => undefined);
        throw error;
      }
      await rememberDeviceOwner(owner);
      return updateReminderSettings(queryClient, { enabled: true });
    },
    onSuccess: (saved) => {
      useReminderNudge.getState().close();
      showToast(REMINDER_COPY.enabled(saved.time));
    },
    onSettled: refreshDevices,
  });

  const disable = useMutation({
    mutationFn: async () => {
      // Asked anew: the list on screen may still be loading or outdated.
      const devices = await queryClient.query({ ...pushDevicesQuery, staleTime: 0 });
      const endpoint = await releaseBrowserSubscription();
      if (endpoint) await unregisterDevice(endpoint);
      if (otherDevices(devices, endpoint).length === 0) {
        await updateReminderSettings(queryClient, { enabled: false });
      }
    },
    onSuccess: () => showToast(REMINDER_COPY.disabled, { tone: 'primary' }),
    onSettled: refreshDevices,
  });

  return {
    /** Must run in the click itself: it shows the browser's permission prompt. */
    turnOn: (publicKey: string) => {
      disable.reset();
      enable.mutate({ permission: requestNotificationPermission(), publicKey, email });
    },
    turnOff: () => {
      enable.reset();
      disable.mutate();
    },
    switching: enable.isPending || disable.isPending,
    enableError: enable.error,
    disableFailed: disable.isError,
  };
}
