import { useQuery } from '@tanstack/react-query';
import { isApiError } from '../../api/ApiError';
import type { ReminderSettings } from '../../api/types';
import { Callout } from '../../components/ui/Callout';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { AccountScreen } from '../account/AccountScreen';
import { REMINDER_COPY } from './copy';
import { InstallGuide } from './InstallGuide';
import { InstallState } from './InstallState';
import { NotificationPreview } from './NotificationPreview';
import type { PushDeviceState } from './pushDevice';
import { ReminderControls } from './ReminderControls';
import { ReminderNotice } from './ReminderNotice';
import { pushDevicesQuery } from './remindersApi';
import type { ReminderStatus } from './reminderStatus';
import { TestReminderButton } from './TestReminderButton';
import {
  otherDevices,
  PermissionRefusedError,
  useReminderStatus,
  useReminderSwitch,
} from './useReminders';
import { useReminderTimes } from './useReminderTimes';

const copy = REMINDER_COPY;

/** Route `/profil/erinnerungen`: switch the reminders of this device on or off, set their times. */
export function RemindersPage() {
  const reminders = useReminderStatus();

  return (
    <AccountScreen title={copy.title}>
      <NotificationPreview />
      <p className="text-body font-bold text-fg-muted">{copy.intro}</p>
      <ReminderPanel {...reminders} />
    </AccountScreen>
  );
}

type ReminderPanelProps = ReturnType<typeof useReminderStatus>;

function ReminderPanel({ status, device, settings, publicKey, ...load }: ReminderPanelProps) {
  if (status === 'loading' || !device) {
    return load.failed ? (
      <LoadFailed message={copy.loadFailed} retrying={load.fetching} onRetry={load.retry} />
    ) : (
      <LoadingBlock label={copy.loading} className="h-40" />
    );
  }
  switch (status) {
    case 'installRequired':
      return <InstallGuide />;
    case 'serverUnavailable':
    case 'unsupported':
    case 'denied':
      return (
        <ReminderNotice blocker={status} platform={device.platform} installed={device.installed} />
      );
    case 'off':
    case 'on':
      return settings && publicKey ? (
        <ReminderSettingsForm
          status={status}
          device={device}
          settings={settings}
          publicKey={publicKey}
        />
      ) : null;
  }
}

interface ReminderSettingsFormProps {
  status: Extract<ReminderStatus, 'on' | 'off'>;
  device: PushDeviceState;
  settings: ReminderSettings;
  publicKey: string;
}

function ReminderSettingsForm({ status, device, settings, publicKey }: ReminderSettingsFormProps) {
  const on = status === 'on';
  const devices = useQuery(pushDevicesQuery);
  const others = otherDevices(devices.data ?? [], device.subscription?.endpoint).length;
  const reminderSwitch = useReminderSwitch();
  const times = useReminderTimes(settings);

  return (
    <>
      <ReminderControls
        on={on}
        switching={reminderSwitch.switching}
        onSwitch={(next) => {
          if (next) reminderSwitch.turnOn(publicKey);
          else reminderSwitch.turnOff();
        }}
        times={
          on
            ? {
                draft: times.draft,
                problem: times.problem,
                onChange: times.change,
                onCommit: times.commit,
              }
            : undefined
        }
      />
      {reminderSwitch.enableError && (
        <Callout tone="danger">{enableFailure(reminderSwitch.enableError)}</Callout>
      )}
      {reminderSwitch.disableFailed && <Callout tone="danger">{copy.disableFailed}</Callout>}
      {times.saveFailed && <Callout tone="danger">{copy.saveFailed}</Callout>}
      {!on && others > 0 && (
        <p className="px-1 text-label font-bold text-fg-muted">{copy.otherDevices(others)}</p>
      )}
      {on && <TestReminderButton />}
      <InstallState installed={device.installed} />
    </>
  );
}

function enableFailure(error: Error): string {
  if (error instanceof PermissionRefusedError) return copy.enableFailed.dismissed;
  if (isApiError(error, 'push_service_not_supported')) {
    return copy.enableFailed.pushServiceNotSupported;
  }
  return copy.enableFailed.failed;
}
