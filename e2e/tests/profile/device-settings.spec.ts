import { readFile } from 'node:fs/promises';
import { expect, test, type BrowserContextOptions, type Page } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { FRONTEND_URL, PATHS } from '../../support/env.ts';

/*
 * Earlier versions kept the device settings under lingora:*, the current one under lumastar:*. A
 * phone that switched sound and vibration off before the update keeps its choice: at its first start
 * the app moves the stored value to the new key and removes the old one.
 */

type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

const LEGACY_KEY = 'lingora:device-preferences';
const KEY = 'lumastar:device-preferences';
/** Sound and vibration off, as earlier versions stored them (zustand persist, version 1). */
const SILENT_DEVICE = { state: { sound: false, haptics: false }, version: 1 };

/** The shared learner's session on a device that still holds the settings under the old key. */
async function deviceBeforeTheRename(): Promise<StorageState> {
  const learner = JSON.parse(await readFile(PATHS.authState, 'utf8')) as StorageState;
  const appStorage = learner.origins.find((origin) => origin.origin === FRONTEND_URL)?.localStorage ?? [];
  return {
    cookies: learner.cookies,
    origins: [
      {
        origin: FRONTEND_URL,
        localStorage: [
          ...appStorage.filter((entry) => entry.name !== KEY),
          { name: LEGACY_KEY, value: JSON.stringify(SILENT_DEVICE) },
        ],
      },
    ],
  };
}

test.use({
  storageState: async ({}, use) => {
    await use(await deviceBeforeTheRename());
  },
});

const stored = (page: Page, key: string) => page.evaluate((name) => localStorage.getItem(name), key);

test('a device keeps its sound and vibration settings from before the rename', async ({ page }) => {
  const profile = new ProfilePage(page);

  await test.step('the first start after the update shows both switches off', async () => {
    await profile.goto();
    await expect(profile.deviceSwitch('Töne')).toHaveAttribute('aria-checked', 'false');
    await expect(profile.deviceSwitch('Vibration')).toHaveAttribute('aria-checked', 'false');
  });

  await test.step('the value moved to the new key, the old key is gone', async () => {
    expect(JSON.parse((await stored(page, KEY)) ?? 'null')).toMatchObject(SILENT_DEVICE);
    expect(await stored(page, LEGACY_KEY)).toBeNull();
  });

  await test.step('the next start reads the new key: still off, and a switch still saves', async () => {
    await page.reload();
    await expect(profile.deviceSwitch('Töne')).toHaveAttribute('aria-checked', 'false');
    await profile.deviceSwitch('Töne').click();
    await expect(profile.deviceSwitch('Töne')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => JSON.parse((await stored(page, KEY)) ?? 'null')).toMatchObject({
      state: { sound: true, haptics: false },
    });
    expect(await stored(page, LEGACY_KEY)).toBeNull();
  });
});
