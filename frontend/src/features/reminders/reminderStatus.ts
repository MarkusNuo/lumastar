import type { PushConfig, ReminderSettings } from '../../api/types';
import type { PushDeviceState } from './pushDevice';

/**
 * What the reminder settings can offer on this device:
 * - `serverUnavailable`: this server has no web push configured;
 * - `unsupported`: the browser cannot receive web push;
 * - `installRequired`: iPhone/iPad Safari, which only notifies apps on the home screen;
 * - `denied`: the learner blocked notifications, only the system settings can undo it;
 * - `off` / `on`: reminders on this device, which needs the account's reminders on and this
 *   browser subscribed (and registered, which the app repeats on every start).
 */
export type ReminderStatus =
  'loading' | 'serverUnavailable' | 'unsupported' | 'installRequired' | 'denied' | 'off' | 'on';

export interface ReminderStatusInputs {
  device: PushDeviceState | undefined;
  config: PushConfig | undefined;
  settings: ReminderSettings | undefined;
}

export function reminderStatus({ device, config, settings }: ReminderStatusInputs): ReminderStatus {
  if (!device || !config) return 'loading';
  if (!config.available || !config.publicKey) return 'serverUnavailable';
  if (device.support !== 'supported') return device.support;
  if (device.permission === 'denied') return 'denied';
  if (!settings) return 'loading';
  const subscribed = device.permission === 'granted' && device.subscription !== null;
  return settings.enabled && subscribed ? 'on' : 'off';
}

/**
 * Whether the suggestion to switch reminders on fits: `offer` where a tap can lead to reminders
 * that are off, `handled` where it never can or they are on already (the suggestion is done
 * then), `undecided` while the answers it depends on are missing.
 */
export type ReminderOffer = 'undecided' | 'offer' | 'handled';

export function reminderOffer(
  status: ReminderStatus,
  settings: ReminderSettings | undefined,
): ReminderOffer {
  if (status === 'loading') return 'undecided';
  if (status !== 'off' && status !== 'installRequired') return 'handled';
  if (!settings) return 'undecided';
  return settings.enabled ? 'handled' : 'offer';
}
