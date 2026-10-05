/**
 * Moments that get a sound and a vibration (PRD 12.1 "spürbare Rückmeldung", 12.4). Every cue has
 * its own synthesized sound in sounds.ts and its own pattern in haptics.ts.
 */
export const FEEDBACK_CUES = [
  'tap',
  'locked',
  'correct',
  'wrong',
  'combo',
  'complete',
  'levelUp',
] as const;

export type FeedbackCue = (typeof FEEDBACK_CUES)[number];
