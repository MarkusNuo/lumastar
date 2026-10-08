import confetti from 'canvas-confetti';

/** Colour sets of the confetti: the brand for finishing things, fire for the streak, gold for goals. */
const PALETTES = {
  brand: [
    '--color-primary',
    '--color-secondary',
    '--color-success',
    '--color-xp',
    '--color-unit-rose',
    '--color-unit-sky',
  ],
  flame: [
    '--color-streak',
    '--color-streak-core',
    '--color-streak-glow',
    '--color-streak-edge',
    '--color-danger',
    '--color-unit-coral',
  ],
  gold: [
    '--color-xp',
    '--color-xp-edge',
    '--color-streak-core',
    '--color-streak-glow',
    '--color-secondary',
  ],
} as const;

export type ConfettiPalette = keyof typeof PALETTES;

export interface CelebrateOptions {
  palette?: ConfettiPalette;
  /** Height the burst starts at, 0 (top) to 1 (bottom). */
  originY?: number;
  /** Two more cannons from the bottom corners, for the biggest moments. */
  fromSides?: boolean;
}

function paletteColors(palette: ConfettiPalette): string[] {
  const styles = getComputedStyle(document.documentElement);
  // canvas-confetti only understands hex colours, which is how the tokens are defined.
  return PALETTES[palette].map((token) => styles.getPropertyValue(token).trim()).filter(Boolean);
}

/** Fires a confetti burst in token colours; skipped for users who prefer reduced motion. */
export function celebrate({
  palette = 'brand',
  originY = 0.7,
  fromSides = false,
}: CelebrateOptions = {}): void {
  const colors = paletteColors(palette);
  const shared = { colors, disableForReducedMotion: true } as const;
  void confetti({
    ...shared,
    particleCount: 140,
    spread: 85,
    startVelocity: 48,
    ticks: 220,
    origin: { y: originY },
  });
  if (!fromSides) return;
  for (const side of [0, 1]) {
    void confetti({
      ...shared,
      particleCount: 60,
      angle: side === 0 ? 60 : 120,
      spread: 55,
      startVelocity: 62,
      ticks: 240,
      origin: { x: side, y: 0.95 },
    });
  }
}
