/*
 * Geometry of Lumastar's own mascot, a chubby aurora star (viewBox 0 0 120 120). Mascot.tsx draws it
 * in every expression; scripts/generate-icons.js builds the favicon and the app icons from it.
 * Plain data without imports, so the Node script can load this file directly.
 */

export const MASCOT_VIEWBOX = '0 0 120 120';

/** The star is stroked with its own fill and round joins, which makes it soft and chubby. */
export const STAR_STROKE_WIDTH = 11;

/** How far the darker 3D edge sits below the star, like the bottom edge of the buttons. */
export const STAR_EDGE_OFFSET = 5;

export type StarPose = 'rest' | 'cheer' | 'wave' | 'droop';

/**
 * Outline per body pose; the side points are the arms. Every pose lists the same ten points
 * (top, then clockwise), so poses morph smoothly into each other.
 */
export const STAR_POSES: Record<StarPose, string> = {
  rest: '60,18 76.5,41.3 103.7,49.8 86.6,72.7 87,101.2 60,92 33,101.2 33.4,72.7 16.3,49.8 43.5,41.3',
  cheer: '60,17 77,42 107,33 87.5,70 87,101.2 60,92 33,101.2 32.5,70 13,33 43,42',
  wave: '60,18 77,42 107,34 87.5,70 87,101.2 60,92 33,101.2 33.4,72.7 16.3,49.8 43.5,41.3',
  droop: '60,21 76,43 100.5,61 85.5,75 86,101.2 60,93 34,101.2 34.5,75 19.5,61 44,43',
};

export const EYES = {
  left: { cx: 48, cy: 60 },
  right: { cx: 72, cy: 60 },
  radius: 8.5,
  pupilRadius: 4.8,
  glintRadius: 1.6,
  glintOffset: 1.8,
} as const;

export const CHEEKS = [
  { cx: 39, cy: 73 },
  { cx: 81, cy: 73 },
] as const;
export const CHEEK_RADII = { rx: 6, ry: 3.5 } as const;

/** Glossy highlight near the top point. */
export const HIGHLIGHT = { cx: 55, cy: 31, rx: 5.5, ry: 3.2, rotate: -40 } as const;

export const HAPPY_MOUTH = 'M49 72q11 14 22 0Z';
export const HAPPY_TONGUE = 'M54.5 77.6q5.5 4.6 11 0-5.5-3-11 0Z';

/** Four-point sparkle centred on 0,0 with a radius of 8. */
export const SPARKLE_PATH = 'M0-8Q1.6-1.6 8 0 1.6 1.6 0 8-1.6 1.6-8 0-1.6-1.6 0-8Z';
