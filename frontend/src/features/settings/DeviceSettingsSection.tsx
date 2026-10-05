import { SpeakerHighIcon, VibrateIcon } from '@phosphor-icons/react';
import { ActionList, ToggleRow } from '../../components/ui/ActionList';
import { useDevicePreferences } from '../../lib/effects/devicePreferences';
import { canVibrate, vibrate } from '../../lib/effects/haptics';
import { soundPlayer } from '../../lib/effects/soundPlayer';
import { PROFILE_COPY } from './copy';

const copy = PROFILE_COPY.device;

/**
 * "Einstellungen" of this device: sounds and vibration (PRD 12.4). Switching one on gives a sample
 * right away. The daily goal joins this group with backend M5.
 */
export function DeviceSettingsSection() {
  const sound = useDevicePreferences((state) => state.sound);
  const haptics = useDevicePreferences((state) => state.haptics);
  const setSound = useDevicePreferences((state) => state.setSound);
  const setHaptics = useDevicePreferences((state) => state.setHaptics);

  return (
    <ActionList title={copy.title} note={copy.dailyGoalSoon}>
      <ToggleRow
        icon={SpeakerHighIcon}
        tone="secondary"
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
    </ActionList>
  );
}
