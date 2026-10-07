import { create } from 'zustand';

interface BannerDismissedState {
  dismissed: boolean;
  dismiss: () => void;
  /** Another learner may sign in next; the banner is theirs to dismiss. */
  reset: () => void;
}

/** Hidden until the app starts again: the reminder may rest, but it returns until confirmed. */
export const useVerificationBannerDismissed = create<BannerDismissedState>()((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
  reset: () => set({ dismissed: false }),
}));
