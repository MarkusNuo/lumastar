import type { Transition } from 'motion/react';

/** Durations in seconds; mirror the `--duration-*` CSS variables in tokens.css. */
export const durations = {
  press: 0.1,
  fast: 0.15,
  base: 0.22,
  slow: 0.3,
} as const;

/**
 * Spring presets. `visualDuration` keeps every spring inside a 150-300 ms window
 * while `bounce` controls how juicy it feels.
 */
export const springs = {
  /** Toggles, knobs, small state changes. */
  snappy: { type: 'spring', visualDuration: durations.fast, bounce: 0.2 },
  /** Pops and hops: counters, correct answers, the mascot. */
  bouncy: { type: 'spring', visualDuration: durations.base, bounce: 0.45 },
  /** Word tiles flying between bank and answer line: a soft landing without a big overshoot. */
  flight: { type: 'spring', visualDuration: durations.base, bounce: 0.22 },
  /** Progress fills and rings. */
  gentle: { type: 'spring', visualDuration: durations.slow, bounce: 0.15 },
  /** Bottom sheets sliding in. */
  sheet: { type: 'spring', visualDuration: durations.slow, bounce: 0.18 },
} as const satisfies Record<string, Transition>;
