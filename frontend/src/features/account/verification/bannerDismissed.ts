import { create } from 'zustand';

/** Hidden until the app starts again: the reminder may rest, but it returns until confirmed. */
export const useVerificationBannerDismissed = create<{ dismissed: boolean; dismiss: () => void }>()(
  (set) => ({
    dismissed: false,
    dismiss: () => set({ dismissed: true }),
  }),
);
