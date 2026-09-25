import { create } from 'zustand';

export type ToastTone = 'success' | 'primary';

export interface ToastOptions {
  tone?: ToastTone;
  /** How long the toast stays before it hides itself. */
  durationMs?: number;
}

export interface ToastMessage extends Required<ToastOptions> {
  id: number;
  message: string;
}

interface ToastState {
  current: ToastMessage | null;
  lastId: number;
  show: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

export const DEFAULT_TOAST_MS = 4000;

/** One toast at a time: a new one replaces the current one. */
export const useToastStore = create<ToastState>()((set) => ({
  current: null,
  lastId: 0,
  show: (message, { tone = 'success', durationMs = DEFAULT_TOAST_MS } = {}) => {
    set(({ lastId }) => ({
      lastId: lastId + 1,
      current: { id: lastId + 1, message, tone, durationMs },
    }));
  },
  // By id, so a timer of a replaced toast cannot hide its successor.
  dismiss: (id) => {
    set(({ current }) => (current?.id === id ? { current: null } : {}));
  },
}));

/** Shows a short confirmation; rendered by the `Toaster` mounted in the app root. */
export function showToast(message: string, options?: ToastOptions): void {
  useToastStore.getState().show(message, options);
}
