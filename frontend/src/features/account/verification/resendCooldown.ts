import { create } from 'zustand';

const TICK_MS = 250;

interface ResendCooldownState {
  /** Whole seconds until another verification mail may be requested; 0 when it may. */
  secondsLeft: number;
  start: (seconds: number) => void;
  /** The cooldown belongs to the account that sent the mail. */
  reset: () => void;
}

/**
 * One cooldown for every "Link erneut senden" button (banner, profile, verification page), so a
 * second button cannot send what the first one just sent.
 */
export const useResendCooldown = create<ResendCooldownState>()((set) => {
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };

  return {
    secondsLeft: 0,
    start: (seconds) => {
      const deadline = Date.now() + seconds * 1000;
      const tick = () => {
        const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        set({ secondsLeft });
        if (secondsLeft === 0) stop();
      };
      stop();
      tick();
      if (seconds > 0) timer = setInterval(tick, TICK_MS);
    },
    reset: () => {
      stop();
      set({ secondsLeft: 0 });
    },
  };
});
