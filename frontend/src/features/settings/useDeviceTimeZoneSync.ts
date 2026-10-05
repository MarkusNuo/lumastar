import { useQuery } from '@tanstack/react-query';
import { useOnceWhen } from '../../lib/useOnceWhen';
import { settingsQuery, useSaveSettings } from './settingsApi';

/** The IANA time zone of this device, if the browser tells it. */
function deviceTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}

/**
 * Days of the daily goal, the streak and the heatmap end at midnight in the stored time zone, so a
 * session stores the device's zone once when it differs. A failed save changes nothing and stays
 * silent: the stored zone remains and the next session tries again.
 */
export function useDeviceTimeZoneSync(): void {
  const settings = useQuery(settingsQuery);
  const { mutate } = useSaveSettings();

  useOnceWhen(settings.data !== undefined, () => {
    const timeZone = deviceTimeZone();
    if (settings.data && timeZone && timeZone !== settings.data.timeZone) {
      mutate({ ...settings.data, timeZone });
    }
  });
}
