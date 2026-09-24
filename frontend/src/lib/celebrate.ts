import confetti from 'canvas-confetti';

const CONFETTI_COLOR_TOKENS = [
  '--color-primary',
  '--color-secondary',
  '--color-success',
  '--color-xp',
  '--color-unit-rose',
  '--color-unit-sky',
] as const;

/** Fires a confetti burst in the token palette; skipped for users who prefer reduced motion. */
export function celebrate(): void {
  const styles = getComputedStyle(document.documentElement);
  // canvas-confetti only understands hex colours, which is how the tokens are defined.
  const colors = CONFETTI_COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim()).filter(
    Boolean,
  );
  void confetti({
    particleCount: 140,
    spread: 85,
    startVelocity: 48,
    ticks: 220,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  });
}
