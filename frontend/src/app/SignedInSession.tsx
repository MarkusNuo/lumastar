import { useDeviceTimeZoneSync } from '../features/settings/useDeviceTimeZoneSync';

/**
 * Work for the whole signed-in session; it renders nothing. Mounted beside the onboarding guard,
 * it starts once per session: after the setup, a login or an app start with a running session.
 */
export function SignedInSession() {
  useDeviceTimeZoneSync();
  return null;
}
