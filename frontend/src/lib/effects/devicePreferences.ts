import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '../safeLocalStorage';
import { storageKey } from '../storageKey';

/*
 * Sound and vibration depend on the device (a laptop in the office, a phone on the train), so they
 * are stored per device in localStorage instead of on the server.
 */

export const DEVICE_PREFERENCES_KEY = storageKey('device-preferences');

export interface DevicePreferences {
  sound: boolean;
  haptics: boolean;
  setSound: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
}

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
