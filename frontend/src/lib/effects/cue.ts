/**
 * Moments that get a sound and a vibration. Every cue has
 * its own synthesized sound in sounds.ts and its own pattern in haptics.ts.
 */
export const FEEDBACK_CUES = [
  'tap',
  'locked',
  'correct',
  'wrong',
  'combo',
  'complete',
  'goal',
  'streak',
  'streakGoal',
  'levelUp',
] as const;

export type FeedbackCue = (typeof FEEDBACK_CUES)[number];
