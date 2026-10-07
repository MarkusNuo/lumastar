import { afterEach, describe, expect, it } from 'vitest';
import { installFakePush, removeFakePush, USER_AGENTS } from '../../test/fakePush';
import { clearReminderNotifications, devicePlatform, readPushDevice } from './pushDevice';

afterEach(() => {
  removeFakePush();
  Reflect.deleteProperty(navigator, 'maxTouchPoints');
});

describe('devicePlatform', () => {
  it.each([
    [USER_AGENTS.iphone, 'ios'],
    [USER_AGENTS.android, 'android'],
    [USER_AGENTS.desktop, 'desktop'],
  ])('recognises %s', (userAgent, platform) => {
    expect(devicePlatform(userAgent)).toBe(platform);
  });

  it('recognises an iPad, whose Safari presents itself as a Mac with a touch screen', () => {
    const ipad =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });

    expect(devicePlatform(ipad)).toBe('ios');
  });
});

describe('readPushDevice', () => {
  it('asks iPhone Safari for the home screen first', async () => {
    installFakePush({ userAgent: USER_AGENTS.iphone });

    expect(await readPushDevice()).toMatchObject({ support: 'installRequired', installed: false });
  });

  it('reads the permission and the subscription of an installed app', async () => {
    const browser = installFakePush({
      userAgent: USER_AGENTS.iphone,
      installed: true,
      permission: 'granted',
      subscribedWith: [4, 1, 2],
    });

    expect(await readPushDevice()).toEqual({
      support: 'supported',
      installed: true,
      platform: 'ios',
      permission: 'granted',
      subscription: browser.state.subscription,
    });
  });

  it('finds no push without a service worker, e.g. on the dev server', async () => {
    installFakePush({ worker: false });

    expect(await readPushDevice()).toMatchObject({ support: 'unsupported' });
  });

  it('finds no push in a browser without the Push API', async () => {
    installFakePush({ noPush: true });

    expect(await readPushDevice()).toMatchObject({ support: 'unsupported' });
  });
});

describe('clearReminderNotifications', () => {
  it('clears the app badge and closes the delivered reminders', async () => {
    const browser = installFakePush();

    await clearReminderNotifications();

    expect(browser.clearAppBadge).toHaveBeenCalledOnce();
    for (const notification of browser.notifications) {
      expect(notification.close).toHaveBeenCalledOnce();
    }
  });

  it('does nothing and never fails where the APIs are missing', async () => {
    await expect(clearReminderNotifications()).resolves.toBeUndefined();
  });
});
