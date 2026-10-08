import { describe, expect, it } from 'vitest';
import type { PushConfig } from '../../api/types';
import { fakePushSubscription } from '../../test/fakeServiceWorker';
import { reminderSettings } from '../../test/fixtures';
import type { PushDeviceState } from './pushDevice';
import { reminderOffer, reminderStatus, type ReminderStatus } from './reminderStatus';

const CONFIG: PushConfig = { available: true, publicKey: 'BAEC' };

function device(fields: Partial<PushDeviceState> = {}): PushDeviceState {
  return {
    support: 'supported',
    installed: false,
    platform: 'android',
    permission: 'default',
    subscription: null,
    ...fields,
  };
}

const subscribed = device({
  permission: 'granted',
  subscription: fakePushSubscription('https://push.example/1'),
});

describe('reminderStatus', () => {
  it('waits for the device and the server configuration', () => {
    expect(reminderStatus({ device: undefined, config: CONFIG, settings: undefined })).toBe(
      'loading',
    );
    expect(reminderStatus({ device: device(), config: undefined, settings: undefined })).toBe(
      'loading',
    );
  });

  it('reports a server without web push first, since nothing on the device helps then', () => {
    const status = reminderStatus({
      device: device({ support: 'installRequired' }),
      config: { available: false },
      settings: reminderSettings(),
    });

    expect(status).toBe('serverUnavailable');
  });

  it.each(['unsupported', 'installRequired'] as const)(
    'reports a device that is %s before its permission',
    (support) => {
      const status = reminderStatus({
        device: device({ support, permission: 'denied' }),
        config: CONFIG,
        settings: reminderSettings(),
      });

      expect(status).toBe(support);
    },
  );

  it('reports blocked notifications even while the account wants reminders', () => {
    const status = reminderStatus({
      device: device({ permission: 'denied' }),
      config: CONFIG,
      settings: reminderSettings({ enabled: true }),
    });

    expect(status).toBe('denied');
  });

  it.each<[string, PushDeviceState, boolean, ReminderStatus]>([
    ['on with a subscription and the account setting on', subscribed, true, 'on'],
    ['off while the account setting is off', subscribed, false, 'off'],
    ['off on a device without subscription', device({ permission: 'granted' }), true, 'off'],
    ['off before the permission', device(), true, 'off'],
  ])('is %s', (_, state, enabled, expected) => {
    expect(
      reminderStatus({ device: state, config: CONFIG, settings: reminderSettings({ enabled }) }),
    ).toBe(expected);
  });

  it('waits for the reminder settings before it says on or off', () => {
    expect(reminderStatus({ device: subscribed, config: CONFIG, settings: undefined })).toBe(
      'loading',
    );
  });
});

describe('reminderOffer', () => {
  const off = reminderSettings();
  const on = reminderSettings({ enabled: true });

  it.each<[ReminderStatus, ReturnType<typeof reminderOffer>]>([
    ['off', 'offer'],
    ['installRequired', 'offer'],
    ['on', 'handled'],
    ['denied', 'handled'],
    ['unsupported', 'handled'],
    ['serverUnavailable', 'handled'],
    ['loading', 'undecided'],
  ])('with reminders off on the account, %s means %s', (status, offer) => {
    expect(reminderOffer(status, off)).toBe(offer);
  });

  it('is handled where the account has reminders on already', () => {
    expect(reminderOffer('off', on)).toBe('handled');
    expect(reminderOffer('installRequired', on)).toBe('handled');
  });

  it('waits for the settings where a tap could lead to reminders', () => {
    expect(reminderOffer('installRequired', undefined)).toBe('undecided');
    expect(reminderOffer('denied', undefined)).toBe('handled');
  });
});
