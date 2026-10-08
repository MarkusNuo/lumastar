import type { StateStorage } from 'zustand/middleware';

function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

/**
 * localStorage that never throws: private modes, blocked site data and full quotas make it throw,
 * and what is stored then simply lasts for the session.
 */
export const safeLocalStorage = {
  getItem: (name: string) => attempt(() => localStorage.getItem(name), null),
  setItem: (name: string, value: string) =>
    attempt(() => localStorage.setItem(name, value), undefined),
  removeItem: (name: string) => attempt(() => localStorage.removeItem(name), undefined),
} satisfies StateStorage;
