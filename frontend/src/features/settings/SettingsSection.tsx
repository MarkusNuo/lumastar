import { SpeakerHighIcon, VibrateIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { ActionList, ToggleRow } from '../../components/ui/ActionList';
import { LoadFailed } from '../../components/ui/LoadState';
import { useDevicePreferences } from '../../lib/effects/devicePreferences';
import { canVibrate, vibrate } from '../../lib/effects/haptics';
import { soundPlayer } from '../../lib/effects/soundPlayer';
import { ReminderRow } from '../reminders/ReminderRow';
import { PROFILE_COPY } from './copy';
import { DailyGoalSetting } from './DailyGoalSetting';
import { RetentionSetting } from './RetentionSetting';
import { settingsQuery } from './settingsApi';

const copy = PROFILE_COPY.settings;

/**
 * "Einstellungen": the daily goal, the reminders (their own screen) and, as an advanced setting,
 * the target retention of the reviews, stored on the server; sounds and vibration belong to this
 * device (PRD 12.4).
 */
export function SettingsSection() {
  const settings = useQuery(settingsQuery);

  return (
    <div className="flex flex-col gap-3">
      <ActionList title={copy.title}>
        <DailyGoalSetting />
        <ReminderRow />
        <DeviceToggleRows />
        <RetentionSetting />
      </ActionList>
      {settings.isError && (
        <LoadFailed
          message={copy.loadFailed}
          retrying={settings.isFetching}
          onRetry={() => void settings.refetch()}
        />
      )}
    </div>
  );
}

/** Switching one on gives a sample right away. */
function DeviceToggleRows() {
  const sound = useDevicePreferences((state) => state.sound);
  const haptics = useDevicePreferences((state) => state.haptics);
  const setSound = useDevicePreferences((state) => state.setSound);
  const setHaptics = useDevicePreferences((state) => state.setHaptics);

  return (
    <>
      <ToggleRow
        icon={SpeakerHighIcon}
        tone="primary"
        label={copy.sound.label}
        description={copy.sound.description}
        checked={sound}
        onChange={(on) => {
          setSound(on);
          if (on) soundPlayer.play('correct');
        }}
      />
      {canVibrate() && (
        <ToggleRow
          icon={VibrateIcon}
          tone="unit-rose"
          label={copy.haptics.label}
          description={copy.haptics.description}
          checked={haptics}
          onChange={(on) => {
            setHaptics(on);
            if (on) vibrate('correct');
          }}
        />
      )}
    </>
  );
}
