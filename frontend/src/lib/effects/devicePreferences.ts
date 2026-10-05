import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/*
 * Sound and vibration depend on the device (a laptop in the office, a phone on the train), so they
 * are stored per device in localStorage instead of on the server.
 */

export const DEVICE_PREFERENCES_KEY = 'lingora:device-preferences';

export interface DevicePreferences {
  sound: boolean;
  haptics: boolean;
  setSound: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
}

function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

/**
 * localStorage that never throws: private modes, blocked site data and full quotas make it throw,
 * and the settings then simply last for the session.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => attempt(() => localStorage.getItem(name), null),
  setItem: (name, value) => attempt(() => localStorage.setItem(name, value), undefined),
  removeItem: (name) => attempt(() => localStorage.removeItem(name), undefined),
};

export const useDevicePreferences = create<DevicePreferences>()(
  persist(
    (set) => ({
      sound: true,
      haptics: true,
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    {
      name: DEVICE_PREFERENCES_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ sound, haptics }) => ({ sound, haptics }),
    },
  ),
);
