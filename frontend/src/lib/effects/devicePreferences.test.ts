import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_PREFERENCES_KEY, useDevicePreferences } from './devicePreferences';

const stored = () => JSON.parse(localStorage.getItem(DEVICE_PREFERENCES_KEY) ?? 'null') as unknown;

beforeEach(() => {
  localStorage.clear();
  useDevicePreferences.setState({ sound: true, haptics: true });
});

afterEach(() => {
  localStorage.clear();
});

describe('useDevicePreferences', () => {
  it('turns sound and vibration on by default', () => {
    localStorage.clear();
    void useDevicePreferences.persist.rehydrate();

    expect(useDevicePreferences.getState()).toMatchObject({ sound: true, haptics: true });
  });

  it('stores the choices of this device in localStorage', () => {
    useDevicePreferences.getState().setSound(false);
    useDevicePreferences.getState().setHaptics(false);

    expect(stored()).toMatchObject({ state: { sound: false, haptics: false }, version: 1 });
  });

  it('restores stored choices', async () => {
    localStorage.setItem(
      DEVICE_PREFERENCES_KEY,
      JSON.stringify({ state: { sound: false, haptics: true }, version: 1 }),
    );

    await useDevicePreferences.persist.rehydrate();

    expect(useDevicePreferences.getState()).toMatchObject({ sound: false, haptics: true });
  });

  it('keeps working for the session when the browser blocks localStorage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(() => useDevicePreferences.getState().setSound(false)).not.toThrow();
    expect(useDevicePreferences.getState().sound).toBe(false);
  });

  it('falls back to the defaults when reading localStorage fails', async () => {
    useDevicePreferences.setState({ sound: true, haptics: true });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError');
    });

    await useDevicePreferences.persist.rehydrate();

    expect(useDevicePreferences.getState()).toMatchObject({ sound: true, haptics: true });
  });
});
