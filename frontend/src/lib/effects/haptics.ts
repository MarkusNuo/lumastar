import type { FeedbackCue } from './cue';

/**
 * Vibration patterns in ms (vibrate, pause, vibrate, ...): a short tick for correct, a double
 * buzz for wrong, a longer rhythm for finishing (PRD 12.4).
 */
export const HAPTIC_PATTERNS: Record<FeedbackCue, number | number[]> = {
  tap: 8,
  locked: [10, 40, 10],
  correct: 18,
  wrong: [28, 60, 28],
  combo: [16, 40, 16, 40, 24],
  complete: [30, 60, 30, 60, 140],
  levelUp: [40, 60, 40, 60, 180],
};

/** Android browsers vibrate; iOS Safari and most desktops have no Vibration API. */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function vibrate(cue: FeedbackCue): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[cue]);
  } catch {
    // Some browsers throw instead of returning false, e.g. inside cross-origin frames.
  }
}
