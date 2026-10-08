import { afterEach, describe, expect, it } from 'vitest';
import {
  DEVICE_OWNER_KEY,
  forgetDeviceOwner,
  isDeviceOwner,
  rememberDeviceOwner,
} from './deviceOwner';

afterEach(() => {
  localStorage.clear();
});

describe('device owner', () => {
  it('recognises the learner it was noted for, whatever the spelling of the address', async () => {
    await rememberDeviceOwner('Ardit@Example.ch');

    expect(await isDeviceOwner(' ardit@example.ch ')).toBe(true);
    expect(await isDeviceOwner('blerta@example.ch')).toBe(false);
  });

  it('stores a hash, never the address', async () => {
    await rememberDeviceOwner('ardit@example.ch');

    expect(localStorage.getItem(DEVICE_OWNER_KEY)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('knows nobody before anything was noted, after forgetting and without an address', async () => {
    expect(await isDeviceOwner('ardit@example.ch')).toBe(false);

    await rememberDeviceOwner('ardit@example.ch');
    forgetDeviceOwner();
    expect(await isDeviceOwner('ardit@example.ch')).toBe(false);

    await rememberDeviceOwner('ardit@example.ch');
    await rememberDeviceOwner(undefined);
    expect(await isDeviceOwner('ardit@example.ch')).toBe(false);
    expect(await isDeviceOwner(undefined)).toBe(false);
  });
});
