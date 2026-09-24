export const UNIT_COLORS = [
  'violet',
  'teal',
  'sky',
  'rose',
  'amber',
  'lime',
  'indigo',
  'coral',
] as const;

export type UnitColor = (typeof UNIT_COLORS)[number];

/** Colour families understood by `[data-tone]` in tokens.css. */
export type Tone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'xp'
  | 'locked'
  | `unit-${UnitColor}`;

export function unitTone(color: UnitColor): Tone {
  return `unit-${color}`;
}
