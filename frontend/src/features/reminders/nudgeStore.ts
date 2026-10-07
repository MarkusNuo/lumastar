import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '../../lib/safeLocalStorage';

/*
 * The suggestion to switch reminders on comes once per device: after the first lesson completed
 * here, until the learner accepts or dismisses it. Push subscriptions belong to a device, so the
 * suggestion does too.
 */

export const REMINDER_NUDGE_KEY = 'lingora:reminder-nudge';

/** `waiting` for the first lesson, `due` after it, `done` once accepted or dismissed. */
export type ReminderNudgeState = 'waiting' | 'due' | 'done';

interface ReminderNudgeStore {
  state: ReminderNudgeState;
  /** A lesson was completed: the suggestion becomes due unless it was already shown. */
  lessonCompleted: () => void;
  close: () => void;
}

export const useReminderNudge = create<ReminderNudgeStore>()(
  persist(
    (set) => ({
      state: 'waiting',
      lessonCompleted: () => set(({ state }) => (state === 'waiting' ? { state: 'due' } : {})),
      close: () => set({ state: 'done' }),
    }),
    {
      name: REMINDER_NUDGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ state }) => ({ state }),
    },
  ),
);
