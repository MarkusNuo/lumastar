import type { Tone } from './tones';

export const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Each level climbs the colour wheel towards gold at C2. */
export const levelTone: Record<CefrLevel, Tone> = {
  A0: 'unit-lime',
  A1: 'unit-teal',
  A2: 'unit-sky',
  B1: 'unit-indigo',
  B2: 'unit-violet',
  C1: 'unit-rose',
  C2: 'xp',
};
