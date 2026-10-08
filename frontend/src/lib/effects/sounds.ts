import type { FeedbackCue } from './cue';

/*
 * Lingora's own sound effects, synthesized at runtime from a few oscillator notes and filtered
 * noise: no audio files, nothing sampled or copied. Short, soft and friendly; the wrong-answer
 * sound is a gentle "bonk", never a buzzer.
 */

export interface Note {
  /** Pitch in Hz at the start of the note. */
  frequency: number;
  /** Pitch the note glides to by its end. */
  glideTo?: number;
  /** Start in seconds after the sound starts. */
  at: number;
  /** Seconds until the note has faded out. */
  duration: number;
  wave: OscillatorType;
  /** Peak level before the master volume (0-1). */
  gain: number;
}

/** White noise through a band-pass: a rising band is a whoosh, a short narrow one a crackle. */
export interface NoiseBurst {
  /** Centre of the band in Hz at the start of the burst. */
  frequency: number;
  /** Centre the band sweeps to by the end of the burst. */
  glideTo?: number;
  /** Band-pass quality: low is airy and wide, high is a tight tick. */
  q: number;
  at: number;
  duration: number;
  gain: number;
}

export interface SoundRecipe {
  notes: readonly Note[];
  noises?: readonly NoiseBurst[];
  /** Low-pass cutoff in Hz that rounds off bright waves. */
  lowpassHz?: number;
}

/** Equal-tempered pitches in Hz. */
const PITCH = {
  C4: 261.63,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  C7: 2093,
  F7: 2793.83,
} as const;

interface Strike {
  start?: number;
  /** Seconds between two notes. */
  step: number;
  duration: number;
  wave: OscillatorType;
  gain: number;
}

/** Notes struck one after another (step > 0) or together (step 0). */
function strike(pitches: readonly number[], { start = 0, step, ...note }: Strike): Note[] {
  return pitches.map((frequency, index) => ({ frequency, at: start + index * step, ...note }));
}

/** Short narrow noise ticks, like a match being struck or wood crackling in a fire. */
function crackle(times: readonly number[], frequency: number, gain: number): NoiseBurst[] {
  // Every other tick a bit brighter, so they never sound like one repeated click.
  return times.map((at, index) => ({
    frequency: frequency + (index % 2) * 900,
    q: 9,
    at,
    duration: 0.035,
    gain,
  }));
}

const correctChime = [
  ...strike([PITCH.G5, PITCH.C6, PITCH.E6], {
    step: 0.055,
    duration: 0.26,
    wave: 'triangle',
    gain: 0.4,
  }),
  // A faint octave on top makes the chime sparkle without getting louder.
  { frequency: PITCH.E6 * 2, at: 0.11, duration: 0.2, wave: 'sine', gain: 0.07 },
] satisfies Note[];

export const SOUNDS: Record<FeedbackCue, SoundRecipe> = {
  tap: {
    notes: [{ frequency: 620, glideTo: 420, at: 0, duration: 0.06, wave: 'sine', gain: 0.3 }],
  },
  locked: {
    notes: [{ frequency: 210, glideTo: 140, at: 0, duration: 0.12, wave: 'triangle', gain: 0.45 }],
    lowpassHz: 700,
  },
  correct: { notes: correctChime },
  wrong: {
    notes: [
      { frequency: PITCH.E4, glideTo: 300, at: 0, duration: 0.16, wave: 'triangle', gain: 0.5 },
      { frequency: PITCH.C4, glideTo: 240, at: 0.13, duration: 0.26, wave: 'triangle', gain: 0.5 },
    ],
    lowpassHz: 1100,
  },
  combo: {
    notes: [
      ...correctChime,
      ...strike([PITCH.G6, PITCH.C7], {
        start: 0.2,
        step: 0.05,
        duration: 0.2,
        wave: 'sine',
        gain: 0.16,
      }),
    ],
  },
  complete: {
    notes: [
      ...strike([PITCH.C5, PITCH.E5, PITCH.G5], {
        step: 0.09,
        duration: 0.2,
        wave: 'triangle',
        gain: 0.4,
      }),
      ...strike([PITCH.E5, PITCH.G5, PITCH.C6], {
        start: 0.3,
        step: 0,
        duration: 0.7,
        wave: 'triangle',
        gain: 0.22,
      }),
      { frequency: PITCH.C7, at: 0.3, duration: 0.5, wave: 'sine', gain: 0.05 },
    ],
  },
  // Two bright bells as the goal ring closes.
  goal: {
    notes: [
      ...strike([PITCH.E5, PITCH.B5], { step: 0.12, duration: 0.3, wave: 'triangle', gain: 0.36 }),
      { frequency: PITCH.E6, at: 0.24, duration: 0.45, wave: 'sine', gain: 0.12 },
    ],
  },
  // The flame catches: a match strike, a rising whoosh, a warm F major arpeggio, then crackling.
  streak: {
    notes: [
      {
        frequency: PITCH.F4 / 2,
        glideTo: PITCH.F4,
        at: 0.08,
        duration: 0.34,
        wave: 'triangle',
        gain: 0.26,
      },
      ...strike([PITCH.A5, PITCH.C6, PITCH.F6], {
        start: 0.34,
        step: 0.08,
        duration: 0.34,
        wave: 'triangle',
        gain: 0.3,
      }),
      { frequency: PITCH.F6 * 2, at: 0.54, duration: 0.5, wave: 'sine', gain: 0.05 },
    ],
    noises: [
      ...crackle([0, 0.05], 3600, 0.5),
      { frequency: 380, glideTo: 2600, q: 0.8, at: 0.06, duration: 0.5, gain: 0.6 },
      ...crackle([0.62, 0.74, 0.9, 1.02], 2800, 0.22),
    ],
    lowpassHz: 5200,
  },
  // The streak goal is reached: a little fanfare up to a bright chord with a shimmer on top.
  streakGoal: {
    notes: [
      ...strike([PITCH.C5, PITCH.E5, PITCH.G5], {
        step: 0.08,
        duration: 0.16,
        wave: 'triangle',
        gain: 0.34,
      }),
      ...strike([PITCH.C6, PITCH.E6, PITCH.G6], {
        start: 0.26,
        step: 0,
        duration: 0.85,
        wave: 'triangle',
        gain: 0.2,
      }),
      { frequency: PITCH.C7, glideTo: PITCH.F7, at: 0.3, duration: 0.6, wave: 'sine', gain: 0.05 },
    ],
    noises: [{ frequency: 7000, glideTo: 9000, q: 1.5, at: 0.26, duration: 0.7, gain: 0.08 }],
  },
  levelUp: {
    notes: [
      { frequency: PITCH.G4, glideTo: PITCH.G5, at: 0, duration: 0.22, wave: 'sine', gain: 0.3 },
      ...strike([PITCH.B5, PITCH.D6, PITCH.G6], {
        start: 0.2,
        step: 0.07,
        duration: 0.3,
        wave: 'triangle',
        gain: 0.32,
      }),
      ...strike([PITCH.G5, PITCH.B5, PITCH.D6], {
        start: 0.45,
        step: 0,
        duration: 0.8,
        wave: 'triangle',
        gain: 0.18,
      }),
    ],
  },
};
